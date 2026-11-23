/**
 * Project and folder quality scores for graph.json v1.3.0.
 *
 * Each score starts at 100 and subtracts capped penalties from signals
 * the engine already has (no git history, no later scan-analysis pass).
 * Full weights and letter-grade bands: docs/quality-scores.md.
 *
 *   architecture (cap 25) — findings, by rule severity
 *   cycles       (cap 20) — file-level import/reexport cycles
 *   hotspots     (cap 20) — concentration of high (#100) hotspot scores
 *   imports      (cap 20) — unresolved and third-party import ratios
 *   size         (cap 15) — very large files and functions
 *
 * score = clamp(0, 100, 100 - sum of category penalties)
 * grade bands: A 90–100, B 80–89, C 70–79, D 60–69, F 0–59
 *
 * `tips` are the top 3 fixes by estimated gain, computed by re-running
 * the same formula after a hypothetical fix.
 */
import { compareStrings, parentPath } from './ids.js'
import { graphEmitsMessageCodes, messageFields, type MessageCodeId, type MessageParams } from './message-codes.js'
import type {
  FileNode,
  FolderQualityScore,
  Graph,
  GraphQuality,
  QualityBreakdownItem,
  QualityCategory,
  QualityGrade,
  QualityScore,
  QualityTip,
  SymbolNode
} from './types.js'

export const QUALITY_CAPS = {
  architecture: 25,
  cycles: 20,
  hotspots: 20,
  imports: 20,
  size: 15
} as const

export const ARCH_HIGH_PENALTY = 6
export const ARCH_MEDIUM_PENALTY = 3
export const CYCLE_FIRST_PENALTY = 8
export const CYCLE_NEXT_PENALTY = 4
export const HOTSPOT_HIGH_THRESHOLD = 80
export const HOTSPOT_HIGH_PENALTY = 3
export const HOTSPOT_MAX_EXTRA_PENALTY = 5
export const UNRESOLVED_RATIO_WEIGHT = 50
export const EXTERNAL_RATIO_WEIGHT = 10
export const LARGE_FILE_LINES = 800
export const LARGE_FILE_PENALTY = 4
export const VERY_LARGE_FILE_LINES = 1600
export const VERY_LARGE_FILE_PENALTY = 8
export const LARGE_FUNCTION_LINES = 120
export const LARGE_FUNCTION_PENALTY = 3
export const VERY_LARGE_FUNCTION_LINES = 240
export const VERY_LARGE_FUNCTION_PENALTY = 6

const IMPORT_TYPES = new Set(['imports', 'reexports'])
const HIGH_ARCH_RULES = new Set(['deny-list'])

export interface QualityFinding {
  file: string
  rule: string
  severity: 'high' | 'medium'
}

export interface QualityCycle {
  paths: string[]
}

export interface QualityHotspot {
  path: string
  score: number
}

export interface QualityLargeFile {
  path: string
  lines: number
}

export interface QualityLargeFunction {
  path: string
  name: string
  lines: number
}

export interface QualityInputs {
  findings: QualityFinding[]
  cycles: QualityCycle[]
  hotspots: QualityHotspot[]
  unresolvedEdges: number
  externalEdges: number
  importEdges: number
  largeFiles: QualityLargeFile[]
  largeFunctions: QualityLargeFunction[]
}

export interface QualityPenalties {
  architecture: number
  cycles: number
  hotspots: number
  imports: number
  size: number
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function inFolder(filePath: string, folder: string | null): boolean {
  if (folder === null || folder === '.') return true
  return filePath === folder || filePath.startsWith(`${folder}/`)
}

function sizePenaltyForLines(lines: number, large: number, veryLarge: number, largePts: number, veryPts: number): number {
  if (lines >= veryLarge) return veryPts
  if (lines >= large) return largePts
  return 0
}

function spanLines(span: SymbolNode['span']): number {
  return Math.max(1, span.end.line - span.start.line + 1)
}

export function gradeOf(score: number): QualityGrade {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export function penaltiesOf(inputs: QualityInputs): QualityPenalties {
  const high = inputs.findings.filter(item => item.severity === 'high').length
  const medium = inputs.findings.length - high
  const architecture = Math.min(
    QUALITY_CAPS.architecture,
    high * ARCH_HIGH_PENALTY + medium * ARCH_MEDIUM_PENALTY
  )

  let cycleRaw = 0
  for (let index = 0; index < inputs.cycles.length; index += 1) {
    cycleRaw += index === 0 ? CYCLE_FIRST_PENALTY : CYCLE_NEXT_PENALTY
  }
  const cycles = Math.min(QUALITY_CAPS.cycles, cycleRaw)

  let hotspotRaw = 0
  for (const item of inputs.hotspots) {
    if (item.score >= HOTSPOT_HIGH_THRESHOLD) hotspotRaw += HOTSPOT_HIGH_PENALTY
    if (item.score >= 100) hotspotRaw += HOTSPOT_MAX_EXTRA_PENALTY
  }
  const hotspots = Math.min(QUALITY_CAPS.hotspots, hotspotRaw)

  const denom = inputs.importEdges
  const unresolvedRatio = denom > 0 ? inputs.unresolvedEdges / denom : 0
  const externalRatio = denom > 0 ? inputs.externalEdges / denom : 0
  const imports = Math.min(
    QUALITY_CAPS.imports,
    Math.round(UNRESOLVED_RATIO_WEIGHT * unresolvedRatio + EXTERNAL_RATIO_WEIGHT * externalRatio)
  )

  let sizeRaw = 0
  for (const file of inputs.largeFiles) {
    sizeRaw += sizePenaltyForLines(
      file.lines,
      LARGE_FILE_LINES,
      VERY_LARGE_FILE_LINES,
      LARGE_FILE_PENALTY,
      VERY_LARGE_FILE_PENALTY
    )
  }
  for (const fn of inputs.largeFunctions) {
    sizeRaw += sizePenaltyForLines(
      fn.lines,
      LARGE_FUNCTION_LINES,
      VERY_LARGE_FUNCTION_LINES,
      LARGE_FUNCTION_PENALTY,
      VERY_LARGE_FUNCTION_PENALTY
    )
  }
  const size = Math.min(QUALITY_CAPS.size, sizeRaw)

  return { architecture, cycles, hotspots, imports, size }
}

export function scoreOf(inputs: QualityInputs): number {
  const penalties = penaltiesOf(inputs)
  return clampScore(
    100 - penalties.architecture - penalties.cycles - penalties.hotspots - penalties.imports - penalties.size
  )
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function andJoin(parts: string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`
}

export function describeBreakdown(inputs: QualityInputs, penalties: QualityPenalties, emitCodes = false): QualityBreakdownItem[] {
  const high = inputs.findings.filter(item => item.severity === 'high').length
  const medium = inputs.findings.length - high
  const archParts: string[] = []
  if (high > 0) archParts.push(plural(high, 'forbidden dependency'))
  if (medium > 0) archParts.push(plural(medium, 'undeclared import'))
  const architecture: QualityBreakdownItem = {
    category: 'architecture',
    label: archParts.length === 0 ? 'No architecture rule breaks' : andJoin(archParts),
    ...(emitCodes ? messageFields('quality.architecture', { high, medium }) : {}),
    penalty: penalties.architecture
  }

  const cycles: QualityBreakdownItem = {
    category: 'cycles',
    label: inputs.cycles.length === 0 ? 'No import cycles' : plural(inputs.cycles.length, 'import cycle'),
    ...(emitCodes ? messageFields('quality.cycles', { count: inputs.cycles.length }) : {}),
    penalty: penalties.cycles
  }

  const hotCount = inputs.hotspots.filter(item => item.score >= HOTSPOT_HIGH_THRESHOLD).length
  const maxCount = inputs.hotspots.filter(item => item.score >= 100).length
  let hotLabel = 'No highly connected hotspots'
  if (hotCount > 0) {
    hotLabel = `${plural(hotCount, 'file')} ${hotCount === 1 ? 'is a' : 'are'} heavy hotspot${hotCount === 1 ? '' : 's'}`
    if (maxCount > 0) hotLabel += `, including ${plural(maxCount, 'file')} at the maximum score`
  }
  const hotspots: QualityBreakdownItem = {
    category: 'hotspots',
    label: hotLabel,
    ...(emitCodes ? messageFields('quality.hotspots', { count: hotCount, maxCount }) : {}),
    penalty: penalties.hotspots
  }

  const denom = inputs.importEdges
  const unresolvedRatio = denom > 0 ? inputs.unresolvedEdges / denom : 0
  const externalRatio = denom > 0 ? inputs.externalEdges / denom : 0
  const importParts: string[] = []
  if (inputs.unresolvedEdges > 0) {
    importParts.push(`${Math.round(unresolvedRatio * 100)}% of imports could not be resolved`)
  }
  if (inputs.externalEdges > 0 && externalRatio >= 0.5) {
    importParts.push(`${Math.round(externalRatio * 100)}% of imports come from third-party packages`)
  }
  const imports: QualityBreakdownItem = {
    category: 'imports',
    label: importParts.length === 0 ? 'Imports resolve cleanly' : andJoin(importParts),
    ...(emitCodes ? messageFields('quality.imports', {
      unresolvedPercent: Math.round(unresolvedRatio * 100),
      externalPercent: Math.round(externalRatio * 100)
    }) : {}),
    penalty: penalties.imports
  }

  const sizeParts: string[] = []
  if (inputs.largeFiles.length > 0) sizeParts.push(plural(inputs.largeFiles.length, 'very large file'))
  if (inputs.largeFunctions.length > 0) sizeParts.push(plural(inputs.largeFunctions.length, 'very large function'))
  const size: QualityBreakdownItem = {
    category: 'size',
    label: sizeParts.length === 0 ? 'No unusually large files or functions' : andJoin(sizeParts),
    ...(emitCodes ? messageFields('quality.size', {
      largeFiles: inputs.largeFiles.length,
      largeFunctions: inputs.largeFunctions.length
    }) : {}),
    penalty: penalties.size
  }

  return [architecture, cycles, hotspots, imports, size]
}

function displayName(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1)
  return base.replace(/\.(tsx?|jsx?|mjs|cjs|py|vue)$/i, '') || path
}

function displayNames(paths: string[]): string[] {
  const parents = paths.map(path => parentPath(path) ?? '.')
  const parentLabels = parents.map(folder => (folder === '.' ? null : folder.slice(folder.lastIndexOf('/') + 1)))
  const uniqueParents = new Set(parentLabels.filter((label): label is string => label !== null))
  if (uniqueParents.size === paths.length && uniqueParents.size > 1) {
    return parentLabels as string[]
  }
  const bases = paths.map(displayName)
  if (new Set(bases).size === bases.length) return bases
  return paths
}

function cycleLabel(paths: string[]): string {
  const names = displayNames(paths).slice(0, 3)
  if (names.length <= 1) return names[0] ?? 'these files'
  if (names.length === 2) return `between ${names[0]} and ${names[1]}`
  return `among ${andJoin(names)}`
}

function aboutGain(gain: number): string {
  return `to gain about ${gain} point${gain === 1 ? '' : 's'}`
}

function withTip(text: string, gain: number, tips: QualityTip[], code?: MessageCodeId, params?: MessageParams): void {
  if (gain <= 0) return
  const clipped = text.length <= 240 ? text : `${text.slice(0, 237)}...`
  tips.push({ text: clipped, ...(code ? messageFields(code, params) : {}), gain })
}

function cloneInputs(inputs: QualityInputs): QualityInputs {
  return {
    findings: [...inputs.findings],
    cycles: [...inputs.cycles],
    hotspots: [...inputs.hotspots],
    unresolvedEdges: inputs.unresolvedEdges,
    externalEdges: inputs.externalEdges,
    importEdges: inputs.importEdges,
    largeFiles: [...inputs.largeFiles],
    largeFunctions: [...inputs.largeFunctions]
  }
}

export function tipsOf(inputs: QualityInputs, emitCodes = false): QualityTip[] {
  const baseline = scoreOf(inputs)
  const tips: QualityTip[] = []
  const gainFor = (next: QualityInputs): number => scoreOf(next) - baseline
  const tip = (text: string, gain: number, code: MessageCodeId, params: MessageParams): void => {
    withTip(text, gain, tips, emitCodes ? code : undefined, emitCodes ? { ...params, gain } : undefined)
  }

  for (const finding of inputs.findings) {
    const next = cloneInputs(inputs)
    next.findings = next.findings.filter(item => item !== finding)
    const kind = finding.severity === 'high' ? 'forbidden import' : 'undeclared import'
    const code: MessageCodeId = finding.severity === 'high' ? 'quality.tip.forbidden-import' : 'quality.tip.undeclared-import'
    tip(`Fix the ${kind} in ${finding.file} ${aboutGain(gainFor(next))}`, gainFor(next), code, { file: finding.file })
  }

  for (const cycle of inputs.cycles) {
    const next = cloneInputs(inputs)
    next.cycles = next.cycles.filter(item => item !== cycle)
    tip(`Break the cycle ${cycleLabel(cycle.paths)} ${aboutGain(gainFor(next))}`, gainFor(next), 'quality.tip.cycle', {
      files: cycle.paths
    })
  }

  for (const file of inputs.largeFiles) {
    const next = cloneInputs(inputs)
    next.largeFiles = next.largeFiles.filter(item => item !== file)
    tip(
      `Split ${file.path} (${file.lines} lines) into smaller files ${aboutGain(gainFor(next))}`,
      gainFor(next),
      'quality.tip.large-file',
      { path: file.path, lines: file.lines }
    )
  }

  for (const fn of inputs.largeFunctions) {
    const next = cloneInputs(inputs)
    next.largeFunctions = next.largeFunctions.filter(item => item !== fn)
    tip(
      `Shorten the ${fn.name} function in ${fn.path} (${fn.lines} lines) ${aboutGain(gainFor(next))}`,
      gainFor(next),
      'quality.tip.large-function',
      { name: fn.name, path: fn.path, lines: fn.lines }
    )
  }

  if (inputs.unresolvedEdges > 0) {
    const next = cloneInputs(inputs)
    next.importEdges = Math.max(0, next.importEdges - next.unresolvedEdges)
    next.unresolvedEdges = 0
    tip(`Resolve the missing imports ${aboutGain(gainFor(next))}`, gainFor(next), 'quality.tip.unresolved-imports', {})
  }

  for (const item of inputs.hotspots.filter(hot => hot.score >= HOTSPOT_HIGH_THRESHOLD)) {
    const next = cloneInputs(inputs)
    next.hotspots = next.hotspots.filter(hot => hot !== item)
    tip(
      `Spread work out of ${item.path} (hotspot score ${item.score}) ${aboutGain(gainFor(next))}`,
      gainFor(next),
      'quality.tip.hotspot',
      { path: item.path, score: item.score }
    )
  }

  // If a cap hid every single-item gain, offer a category-level fix.
  const categories: Array<{
    key: keyof QualityPenalties
    apply: (next: QualityInputs) => void
    text: string
    code: MessageCodeId
  }> = [
    {
      key: 'architecture',
      apply: next => {
        next.findings = []
      },
      text: 'Fix the architecture rule breaks',
      code: 'quality.tip.architecture'
    },
    {
      key: 'cycles',
      apply: next => {
        next.cycles = []
      },
      text: 'Break the remaining import cycles',
      code: 'quality.tip.cycles'
    },
    {
      key: 'hotspots',
      apply: next => {
        next.hotspots = []
      },
      text: 'Spread work out of the heaviest hotspot files',
      code: 'quality.tip.hotspots'
    },
    {
      key: 'imports',
      apply: next => {
        next.importEdges = Math.max(0, next.importEdges - next.unresolvedEdges)
        next.unresolvedEdges = 0
        next.externalEdges = 0
      },
      text: 'Clean up unresolved and heavy third-party imports',
      code: 'quality.tip.imports'
    },
    {
      key: 'size',
      apply: next => {
        next.largeFiles = []
        next.largeFunctions = []
      },
      text: 'Split the unusually large files and functions',
      code: 'quality.tip.size'
    }
  ]
  const penalties = penaltiesOf(inputs)
  const bestIndividual = tips.reduce((max, tip) => Math.max(max, tip.gain), 0)
  for (const category of categories) {
    if (penalties[category.key] <= 0) continue
    const next = cloneInputs(inputs)
    category.apply(next)
    const gain = gainFor(next)
    // Only used when a cap hides every single-item gain (individual tips
    // already cover the case where one fix equals the category gain).
    if (gain > bestIndividual) {
      tip(`${category.text} ${aboutGain(gain)}`, gain, category.code, {})
    }
  }

  tips.sort((left, right) => right.gain - left.gain || compareStrings(left.text, right.text))
  const seen = new Set<string>()
  const unique: QualityTip[] = []
  for (const tip of tips) {
    if (seen.has(tip.text)) continue
    seen.add(tip.text)
    unique.push(tip)
    if (unique.length === 3) break
  }
  return unique
}

function buildScore(inputs: QualityInputs, emitCodes = false): QualityScore {
  const penalties = penaltiesOf(inputs)
  const score = scoreOf(inputs)
  return {
    score,
    grade: gradeOf(score),
    breakdown: describeBreakdown(inputs, penalties, emitCodes),
    tips: tipsOf(inputs, emitCodes)
  }
}

function canonicalCycle(ids: string[]): string[] {
  const core = ids.length > 1 && ids[0] === ids[ids.length - 1] ? ids.slice(0, -1) : [...ids]
  if (core.length <= 1) return core
  const rotations: string[][] = []
  for (let index = 0; index < core.length; index += 1) {
    rotations.push([...core.slice(index), ...core.slice(0, index)])
  }
  const reversed = [...core].reverse()
  for (let index = 0; index < reversed.length; index += 1) {
    rotations.push([...reversed.slice(index), ...reversed.slice(0, index)])
  }
  rotations.sort((left, right) => {
    for (let index = 0; index < left.length; index += 1) {
      const order = compareStrings(left[index]!, right[index]!)
      if (order !== 0) return order
    }
    return left.length - right.length
  })
  return rotations[0] ?? core
}

function cycleKey(paths: string[]): string {
  return paths.join('\0')
}

function stronglyConnected(nodes: string[], outgoing: Map<string, string[]>): string[][] {
  let index = 0
  const indices = new Map<string, number>()
  const lowlink = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const components: string[][] = []

  const strongconnect = (node: string) => {
    indices.set(node, index)
    lowlink.set(node, index)
    index += 1
    stack.push(node)
    onStack.add(node)
    for (const peer of outgoing.get(node) ?? []) {
      if (!indices.has(peer)) {
        strongconnect(peer)
        lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(peer)!))
      } else if (onStack.has(peer)) {
        lowlink.set(node, Math.min(lowlink.get(node)!, indices.get(peer)!))
      }
    }
    if (lowlink.get(node) === indices.get(node)) {
      const component: string[] = []
      let current: string | undefined
      do {
        current = stack.pop()
        if (current === undefined) break
        onStack.delete(current)
        component.push(current)
      } while (current !== node)
      components.push(component.sort(compareStrings))
    }
  }

  for (const node of nodes) {
    if (!indices.has(node)) strongconnect(node)
  }
  return components
}

function collectCycles(graph: Graph, idToPath: Map<string, string>, folder: string | null): QualityCycle[] {
  const outgoing = new Map<string, string[]>()
  const nodesById = new Map(graph.nodes.map(node => [node.id, node]))
  for (const edge of graph.edges) {
    if (!IMPORT_TYPES.has(edge.type)) continue
    const source = nodesById.get(edge.source)
    const target = nodesById.get(edge.target)
    if (source?.kind !== 'file' || target?.kind !== 'file') continue
    const list = outgoing.get(source.id) ?? []
    if (!list.includes(target.id)) list.push(target.id)
    outgoing.set(source.id, list)
  }
  for (const list of outgoing.values()) list.sort(compareStrings)
  const nodes = [...outgoing.keys()].sort(compareStrings)
  const cycles: QualityCycle[] = []
  const seen = new Set<string>()
  for (const component of stronglyConnected(nodes, outgoing)) {
    const hasSelfLoop = component.some(id => (outgoing.get(id) ?? []).includes(id))
    if (component.length < 2 && !hasSelfLoop) continue
    const paths = component
      .map(id => idToPath.get(id))
      .filter((path): path is string => path !== undefined)
      .sort(compareStrings)
    if (paths.length === 0) continue
    if (folder !== null && !paths.some(path => inFolder(path, folder))) continue
    const canonical = canonicalCycle(paths)
    const key = cycleKey(canonical)
    if (seen.has(key)) continue
    seen.add(key)
    cycles.push({ paths: canonical })
  }
  cycles.sort((left, right) => compareStrings(cycleKey(left.paths), cycleKey(right.paths)))
  return cycles
}

export function collectQualityInputs(graph: Graph, folder: string | null = null): QualityInputs {
  const files: FileNode[] = []
  const idToPath = new Map<string, string>()
  const functionLines: QualityLargeFunction[] = []
  for (const node of graph.nodes) {
    if (node.kind === 'file') {
      idToPath.set(node.id, node.path)
      if (inFolder(node.path, folder)) files.push(node)
    }
  }
  for (const node of graph.nodes) {
    if (node.kind !== 'symbol' || node.symbolKind !== 'function') continue
    const path = idToPath.get(node.file)
    if (!path || !inFolder(path, folder)) continue
    const lines = spanLines(node.span)
    if (lines >= LARGE_FUNCTION_LINES) functionLines.push({ path, name: node.label, lines })
  }

  const findings: QualityFinding[] = []
  for (const finding of graph.architecture?.findings ?? []) {
    if (!inFolder(finding.file, folder)) continue
    findings.push({
      file: finding.file,
      rule: finding.rule,
      severity: HIGH_ARCH_RULES.has(finding.rule) ? 'high' : 'medium'
    })
  }
  findings.sort((left, right) => compareStrings(left.file, right.file) || compareStrings(left.rule, right.rule))

  const largeFiles: QualityLargeFile[] = []
  const hotspots: QualityHotspot[] = []
  for (const file of files) {
    if (file.lineCount !== null && file.lineCount >= LARGE_FILE_LINES) {
      largeFiles.push({ path: file.path, lines: file.lineCount })
    }
    const score = file.hotspot?.score ?? 0
    if (score >= HOTSPOT_HIGH_THRESHOLD) hotspots.push({ path: file.path, score })
  }
  largeFiles.sort((left, right) => right.lines - left.lines || compareStrings(left.path, right.path))
  functionLines.sort((left, right) => right.lines - left.lines || compareStrings(left.path, right.path) || compareStrings(left.name, right.name))
  hotspots.sort((left, right) => right.score - left.score || compareStrings(left.path, right.path))

  const nodesById = new Map(graph.nodes.map(node => [node.id, node]))
  let importEdges = 0
  let unresolvedEdges = 0
  let externalEdges = 0
  const fileIds = new Set(files.map(file => file.id))
  for (const edge of graph.edges) {
    if (!IMPORT_TYPES.has(edge.type)) continue
    if (!fileIds.has(edge.source)) continue
    const target = nodesById.get(edge.target)
    importEdges += 1
    if (target?.kind === 'unresolved') unresolvedEdges += 1
    else if (target?.kind === 'external') externalEdges += 1
  }

  return {
    findings,
    cycles: collectCycles(graph, idToPath, folder),
    hotspots,
    unresolvedEdges,
    externalEdges,
    importEdges,
    largeFiles,
    largeFunctions: functionLines
  }
}

function folderSet(graph: Graph): string[] {
  const folders = new Set<string>()
  for (const node of graph.nodes) {
    if (node.kind !== 'file') continue
    let current = parentPath(node.path)
    while (current && current !== '.') {
      folders.add(current)
      current = parentPath(current)
    }
  }
  return [...folders].sort(compareStrings)
}

/**
 * Returns a copy of `graph` with a project-level quality score and
 * per-folder scores. Does not mutate the input.
 */
export function attachQuality(graph: Graph): Graph {
  const emitCodes = graphEmitsMessageCodes(graph.schemaVersion)
  const project = buildScore(collectQualityInputs(graph, null), emitCodes)
  const folders: FolderQualityScore[] = []
  for (const path of folderSet(graph)) {
    const score = buildScore(collectQualityInputs(graph, path), emitCodes)
    folders.push({ path, ...score })
  }
  folders.sort((left, right) => left.score - right.score || compareStrings(left.path, right.path))
  const quality: GraphQuality = { project }
  if (folders.length > 0) quality.folders = folders
  const { quality: _ignored, ...rest } = graph
  void _ignored
  return { ...rest, quality }
}
