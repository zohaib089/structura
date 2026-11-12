/**
 * Plain-English pull request comment for the PR architecture check (roadmap R5).
 *
 * Pure functions only: no file, process, or network access. The CI script in
 * scripts/pr-check/ reads graph.json files and the git diff, calls
 * buildPrReport and renderPrComment, and writes Markdown. Impact uses the same
 * engine walk as `atlasmith impact` (graphImpact), downstream direction only.
 */
import {
  CONFIG_FILE,
  ImpactTargetAmbiguousError,
  ImpactTargetNotFoundError,
  graphImpact,
  type ArchitectureFinding,
  type Graph
} from '@atlasmith/engine'

/** Hidden marker that identifies the one sticky comment the workflow edits. */
export const PR_COMMENT_MARKER = '<!-- atlasmith-pr-check -->'

/** GitHub rejects comment bodies over 65,536 characters; stay well below. */
export const PR_COMMENT_MAX_CHARS = 60_000

export type ChangeStatus = 'added' | 'modified' | 'deleted'

export interface ChangedFile {
  path: string
  status: ChangeStatus
}

export interface AffectedFile {
  path: string
  /** Changed file this one depends on (closest by import depth, then path order). */
  via: string
  /** Import hops between this file and `via` (1 = imports it directly). */
  depth: number
  /** True when every path to a changed file includes an INFERRED edge. */
  inferredOnly: boolean
}

export interface RuleFinding extends ArchitectureFinding {
  /** True when the base branch does not have the same finding (needs a base graph). */
  isNew: boolean
}

export interface PrReport {
  changed: ChangedFile[]
  /** Changed files the scan has no node for (docs, unsupported languages, ignored paths). */
  notInGraph: string[]
  affected: AffectedFile[]
  /** Path of the architecture config the head scan used, or undefined when none is declared. */
  architectureConfig: string | undefined
  findings: RuleFinding[]
  /** True when a base graph was supplied, so `isNew` is meaningful. */
  comparedWithBase: boolean
  depthLimit: number
}

export interface PrReportInput {
  headGraph: Graph
  baseGraph?: Graph
  changed: readonly ChangedFile[]
  depth?: number
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function hasFileNode(graph: Graph | undefined, path: string): boolean {
  return graph?.nodes.some(node => node.kind === 'file' && node.path === path) ?? false
}

function findingKey(finding: ArchitectureFinding): string {
  // Line numbers move with unrelated edits, so they are not part of identity.
  return [finding.file, finding.from, finding.to, finding.edgeKind, finding.rule].join('\u0000')
}

/**
 * Parse `git diff --name-status -z --no-renames <base> <head>` output.
 * Copies and type changes count as modified. Unknown status letters are skipped.
 */
export function parseNameStatusZ(text: string): ChangedFile[] {
  const parts = text.split('\0')
  const out: ChangedFile[] = []
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const code = parts[i]?.trim().charAt(0)
    const path = parts[i + 1]
    if (!code || !path) continue
    if (code === 'A') out.push({ path, status: 'added' })
    else if (code === 'D') out.push({ path, status: 'deleted' })
    else if (code === 'M' || code === 'T' || code === 'C') out.push({ path, status: 'modified' })
  }
  return out.sort((a, b) => compare(a.path, b.path))
}

export function buildPrReport(input: PrReportInput): PrReport {
  const changed = [...input.changed].sort((a, b) => compare(a.path, b.path))
  const changedPaths = new Set(changed.map(file => file.path))
  const notInGraph: string[] = []
  const affected = new Map<string, AffectedFile>()
  let depthLimit = input.depth ?? 3

  for (const file of changed) {
    // A deleted file only exists in the base graph; everything else is looked up on head.
    const graph = file.status === 'deleted' ? input.baseGraph : input.headGraph
    if (!graph || !hasFileNode(graph, file.path)) {
      notInGraph.push(file.path)
      continue
    }
    let result
    try {
      result = graphImpact(graph, `file:${file.path}`, { depth: input.depth })
    } catch (error) {
      if (error instanceof ImpactTargetNotFoundError || error instanceof ImpactTargetAmbiguousError) {
        notInGraph.push(file.path)
        continue
      }
      throw error
    }
    depthLimit = result.depthLimit
    for (const path of result.downstream) {
      const lastId = path.nodes[path.nodes.length - 1]
      if (!lastId?.startsWith('file:')) continue
      const dependent = lastId.slice('file:'.length)
      if (changedPaths.has(dependent)) continue
      const inferred = path.status === 'INFERRED'
      const prior = affected.get(dependent)
      if (!prior) {
        affected.set(dependent, { path: dependent, via: file.path, depth: path.depth, inferredOnly: inferred })
        continue
      }
      const inferredOnly = prior.inferredOnly && inferred
      if (path.depth < prior.depth) {
        affected.set(dependent, { path: dependent, via: file.path, depth: path.depth, inferredOnly })
      } else {
        prior.inferredOnly = inferredOnly
      }
    }
  }

  const baseKeys = new Set((input.baseGraph?.architecture?.findings ?? []).map(findingKey))
  const findings = (input.headGraph.architecture?.findings ?? []).map(finding => ({
    ...finding,
    isNew: input.baseGraph ? !baseKeys.has(findingKey(finding)) : false
  }))

  return {
    changed,
    notInGraph: notInGraph.sort(compare),
    affected: [...affected.values()].sort((a, b) => a.depth - b.depth || compare(a.path, b.path)),
    architectureConfig: input.headGraph.architecture?.config,
    findings,
    comparedWithBase: input.baseGraph !== undefined,
    depthLimit
  }
}

/** Inline code span that cannot break out of itself or the comment (paths come from the PR). */
export function code(text: string): string {
  // eslint-disable-next-line no-control-regex
  const clean = text.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, '?').replace(/`/g, "'")
  const clipped = clean.length > 200 ? `${clean.slice(0, 197)}...` : clean
  return `\`${clipped}\``
}

const STATUS_WORD: Record<ChangeStatus, string> = { added: 'added', modified: 'changed', deleted: 'deleted' }

export interface RuleExplanation {
  summary: string
  why: string
  fix: string
}

export function explainFinding(finding: ArchitectureFinding, configPath: string): RuleExplanation {
  const from = code(finding.from)
  const to = code(finding.to)
  const cfg = code(configPath)
  const verb = finding.edgeKind === 'reexports' ? 're-exports from' : 'imports'
  const summary = `${code(finding.file)} line ${finding.line}: module ${from} ${verb} module ${to}`
  if (finding.rule === 'deny-list') {
    return {
      summary,
      why: `${cfg} says ${from} must never depend on ${to}. Crossing that boundary ties together parts that are meant to change independently.`,
      fix: `Move the code ${from} needs into a module it is allowed to use, or, if this dependency is intended, remove ${to} from the deny list of ${from} in ${cfg}.`
    }
  }
  if (finding.rule === 'allow-list') {
    return {
      summary,
      why: `${from} lists the only modules it may use in ${cfg}, and ${to} is not on that list. Unplanned dependencies make the layers harder to test and replace.`,
      fix: `Reach ${to} through a module ${from} is allowed to use, or add ${to} to the allow list of ${from} in ${cfg} if the dependency is intended.`
    }
  }
  if (finding.rule === 'deny-undeclared') {
    return {
      summary,
      why: `${from} uses the deny-undeclared policy, so it may only depend on itself and the modules it declares. This dependency was never declared.`,
      fix: `Declare it by adding ${to} to the allow list of ${from} in ${cfg}, or remove the import.`
    }
  }
  return {
    summary,
    why: `This dependency breaks the ${code(finding.rule)} rule declared in ${cfg}.`,
    fix: `Remove the dependency, or update ${cfg} if the new structure is intended.`
  }
}

function plural(count: number, one: string, many: string = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

function capped<T>(items: readonly T[], max: number, render: (item: T) => string): string[] {
  const lines = items.slice(0, max).map(render)
  if (items.length > max) lines.push(`- ...and ${items.length - max} more`)
  return lines
}

export interface RenderOptions {
  /** Commit the scan ran on; shown in the footer. */
  headSha?: string
  /** Max rows per list before "...and N more". */
  maxListed?: number
}

export function renderPrComment(report: PrReport, options: RenderOptions = {}): string {
  const max = options.maxListed ?? 50
  const configPath = report.architectureConfig ?? CONFIG_FILE
  const findings = report.findings
  const newCount = findings.filter(finding => finding.isNew).length
  const lines: string[] = [PR_COMMENT_MARKER, '## Atlasmith architecture check', '']

  if (findings.length === 0) {
    if (report.architectureConfig === undefined) {
      lines.push(`**All clear.** No architecture rules are declared yet (no ${code(CONFIG_FILE)}), so there is nothing to break. Add one to have this check enforce module boundaries.`)
    } else {
      lines.push(`**All clear.** This pull request breaks none of the architecture rules in ${code(configPath)}.`)
    }
  } else {
    const newPart = report.comparedWithBase
      ? newCount === findings.length
        ? ' All of them are new in this pull request.'
        : ` ${newCount} new in this pull request; the rest already exist on the base branch.`
      : ''
    lines.push(`**${plural(findings.length, 'architecture rule break')} found** (rules from ${code(configPath)}).${newPart}`)
    lines.push('', '### Rules broken', '')
    const ordered = [...findings].sort((a, b) => Number(b.isNew) - Number(a.isNew))
    ordered.slice(0, max).forEach((finding, index) => {
      const explanation = explainFinding(finding, configPath)
      const tag = report.comparedWithBase ? (finding.isNew ? ' **(new)**' : ' (already on base)') : ''
      lines.push(`${index + 1}. ${explanation.summary}${tag}`)
      lines.push(`   - Why it matters: ${explanation.why}`)
      lines.push(`   - How to fix: ${explanation.fix}`)
    })
    if (ordered.length > max) lines.push(`- ...and ${ordered.length - max} more`)
  }

  lines.push('', '### Files affected by this change', '')
  if (report.changed.length === 0) {
    lines.push('No files changed.')
  } else {
    const dependents = report.affected.length === 0
      ? 'No other files depend on them.'
      : `${plural(report.affected.length, 'other file')} depend${report.affected.length === 1 ? 's' : ''} on them (up to ${report.depthLimit} import hops away).`
    lines.push(`${plural(report.changed.length, 'file')} changed. ${dependents}`)
    lines.push('', '**Changed**', '')
    lines.push(...capped(report.changed, max, file => {
      const note = report.notInGraph.includes(file.path) ? ' (not in the code graph, so no impact traced)' : ''
      return `- ${code(file.path)} ${STATUS_WORD[file.status]}${note}`
    }))
    if (report.affected.length > 0) {
      lines.push('', '**May be affected**', '')
      lines.push(...capped(report.affected, max, file => {
        const how = file.depth === 1 ? 'imports' : `depends on (${file.depth} hops)`
        const likely = file.inferredOnly ? ', inferred link' : ''
        return `- ${code(file.path)} ${how} ${code(file.via)}${likely}`
      }))
    }
  }

  const commit = options.headSha && /^[0-9a-f]{7,64}$/i.test(options.headSha) ? ` for commit ${code(options.headSha.slice(0, 12))}` : ''
  lines.push('', '---', `<sub>Scanned on the CI runner with ${code('atlasmith scan --strict-architecture')}${commit}. No source code was uploaded anywhere. This comment updates on every push.</sub>`)

  let body = `${lines.join('\n')}\n`
  if (body.length > PR_COMMENT_MAX_CHARS) {
    body = `${body.slice(0, PR_COMMENT_MAX_CHARS - 80)}\n\n_(Comment truncated. See the job summary for the full list.)_\n`
  }
  return body
}
