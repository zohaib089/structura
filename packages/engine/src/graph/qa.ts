import { collectQualityInputs } from './quality.js'
import { walkFileImpact, type ImpactPath } from './impact.js'
import { compareStrings } from './ids.js'
import { indexNodes } from './resolve-ref.js'
import { messageFields, type MessageCodeId, type MessageParams } from './message-codes.js'
import type {
  ArchitectureFinding,
  DirectoryNode,
  FileNode,
  Graph,
  GraphEdge,
  GraphNode,
  QualityScore,
  SymbolNode
} from './types.js'

/** Intents returned by {@link answerGraphQuestion}. */
export const GRAPH_QA_INTENTS = [
  'impact',
  'explain',
  'hotspots',
  'quality',
  'duplicates',
  'architecture',
  'overview',
  'fallback'
] as const

export type GraphQaIntent = (typeof GRAPH_QA_INTENTS)[number]

/** Maximum question length accepted by the hosted ask route. The engine itself does not enforce this. */
export const GRAPH_QA_MAX_QUESTION_LENGTH = 500

const MAX_CITATIONS = 12
const MAX_SUGGESTIONS = 8
const MAX_LISTED = 8

const GENERIC_TARGETS = new Set([
  'it',
  'this',
  'that',
  'project',
  'the project',
  'this project',
  'my project',
  'the repo',
  'this repo',
  'the repository',
  'this repository',
  'the codebase',
  'this codebase',
  'the app',
  'this app',
  'the application',
  'this application',
  'the scan',
  'this scan',
  'the code',
  'this code',
  'a file',
  'the file',
  'a folder',
  'the folder'
])

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  vue: 'Vue',
  rust: 'Rust'
}

export type GraphQaCitationKind = 'file' | 'folder' | 'symbol'

export interface GraphQaCitation {
  kind: GraphQaCitationKind
  path: string
  name?: string
  startLine?: number
  endLine?: number
}

export interface GraphQaResponse {
  intent: GraphQaIntent
  answer: string
  /** Structured code for `answer` (1.7.0). */
  code?: string
  /** Parameters for `code`. Omitted when empty. */
  params?: MessageParams
  citations: GraphQaCitation[]
  suggestions: string[]
}

interface QaFileTarget {
  kind: 'file'
  id: string
  path: string
  node: FileNode
}

interface QaFolderTarget {
  kind: 'folder'
  id: string
  path: string
  node?: DirectoryNode
}

interface QaSymbolTarget {
  kind: 'symbol'
  id: string
  path: string
  name: string
  node: SymbolNode
}

type QaTarget = QaFileTarget | QaFolderTarget | QaSymbolTarget

type ResolveResult =
  | { status: 'found'; target: QaTarget }
  | { status: 'missing'; ref: string }
  | { status: 'ambiguous'; ref: string; candidates: QaTarget[] }
  | { status: 'none' }

const IMPORT_TYPES = new Set(['imports', 'reexports'])

/**
 * Answer a natural-language question about a scan graph. Deterministic and offline:
 * no model and no network. Optional graph sections may be absent
 * on schema 1.4.0 and earlier; those questions get a clear fallback.
 * Answers include a structured `code` and `params` next to the English text.
 */
export function answerGraphQuestion(graph: Graph, question: string): GraphQaResponse {
  const original = typeof question === 'string' ? question : String(question ?? '')
  const normalized = normalizeQuestion(original)
  const intent = classifyIntent(normalized)
  const targetText = extractTarget(original, intent)
  const resolved = targetText ? resolveQaTarget(graph, targetText) : { status: 'none' as const }

  if (resolved.status === 'missing' || resolved.status === 'ambiguous') {
    const resolvedMessage = describeResolve(resolved)
    return finish(graph, intent, resolvedMessage.answer, citationsForResolve(resolved), focusPath(resolved), resolvedMessage.code, resolvedMessage.params)
  }

  switch (intent) {
    case 'impact':
      return answerImpact(graph, resolved)
    case 'explain':
      return answerExplain(graph, resolved)
    case 'hotspots':
      return answerHotspots(graph)
    case 'quality':
      return answerQuality(graph, resolved)
    case 'duplicates':
      return answerDuplicates(graph)
    case 'architecture':
      return answerArchitecture(graph)
    case 'overview':
      return answerOverview(graph)
    case 'fallback':
      return answerFallback(graph, normalized)
  }
}

/** True when `value` has the node and edge arrays needed to answer a question. */
export function isGraphLike(value: unknown): value is Graph {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Array.isArray(record.nodes) && Array.isArray(record.edges)
}

function finish(
  graph: Graph,
  intent: GraphQaIntent,
  answer: string,
  citations: GraphQaCitation[],
  focus: string | undefined,
  code: MessageCodeId,
  params?: MessageParams
): GraphQaResponse {
  return {
    intent,
    answer,
    ...messageFields(code, params),
    citations: capCitations(citations),
    suggestions: buildSuggestions(graph, intent, focus)
  }
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, ' ').replace(/[?!.]+$/g, '').trim().toLowerCase()
}

function classifyIntent(normalized: string): GraphQaIntent {
  if (!normalized) return 'fallback'
  if (isArchitectureQuestion(normalized)) return 'architecture'
  if (isDuplicatesQuestion(normalized)) return 'duplicates'
  if (isHotspotsQuestion(normalized)) return 'hotspots'
  if (isQualityQuestion(normalized)) return 'quality'
  if (isOverviewQuestion(normalized)) return 'overview'
  if (isImpactQuestion(normalized)) return 'impact'
  if (isExplainQuestion(normalized)) return 'explain'
  if (looksLikeBareTarget(normalized)) return 'explain'
  return 'fallback'
}

function isArchitectureQuestion(q: string): boolean {
  return /\b(circular|import cycles?|cycles? in|any cycles?|architecture (rule|rules|finding|findings|violat)|rule breaks?|rules broken|violat(?:e|es|ed|ion|ions)|denied import|deny-list|allow-list|undeclared)\b/.test(q)
}

function isDuplicatesQuestion(q: string): boolean {
  return /\b(duplicat(?:e|es|ed|ion)?|copied code|repeated (code|blocks?)|clone[sd]?|copy-pasted)\b/.test(q)
}

function isHotspotsQuestion(q: string): boolean {
  return /\b(riskiest|hotspots?|risky files|highest risk|most (?:risky|dangerous|fragile) files|files at risk)\b/.test(q)
}

function isQualityQuestion(q: string): boolean {
  return /\b(how healthy|quality score|quality of|raise the score|improve (the )?(score|quality|health|grade)|worst folders?|folder scores?|health(?:y| of)|project score|letter grade|how do i (improve|raise|fix the score)|how can i (improve|raise))\b/.test(q)
}

function isOverviewQuestion(q: string): boolean {
  return /\b((what|which) languages?|languages? (are|does|is|do)|entry points?|where does (the )?(app|application|project|this) start|where (do|does) (we|it|this) start|project overview|what is this (project|repo|repository|codebase|app|application)|how (big|large) is|how many files|top-level folders?|what'?s in this (project|repo)|give me an overview|overview of (the|this) (project|repo|codebase))\b/.test(q)
}

function isImpactQuestion(q: string): boolean {
  return /\b((what|which) breaks|blast radius|if i (change|edit|modify|touch|update)|what depends|who depends|depends on\b|impact of|who uses|what uses|what (will|would) break|if .+ (is )?chang(?:e|ed|es)|who (?:is |are )?affected)\b/.test(q)
}

function isExplainQuestion(q: string): boolean {
  return /\b(what does\b|what do\b|explain\b|tell me about\b|what is\b|imports of\b|dependencies of\b|what .+ (import|imports|use|uses|depend|depends)|used by\b|describe\b)\b/.test(q)
}

function looksLikeBareTarget(q: string): boolean {
  if (!q || q.includes(' ')) return false
  return /[./]/.test(q) || /^[\w$]+$/.test(q)
}

function extractTarget(original: string, intent: GraphQaIntent): string | undefined {
  const trimmed = original.trim().replace(/\s+/g, ' ').replace(/[?!.]+$/g, '').trim()
  if (!trimmed) return undefined
  const quoted = trimmed.match(/["“]([^"”]+)["”]/) ?? trimmed.match(/['‘]([^'’]+)['’]/)
  if (quoted?.[1]) return cleanTarget(quoted[1])

  if (intent === 'hotspots' || intent === 'duplicates' || intent === 'architecture' || intent === 'overview' || intent === 'fallback') {
    return undefined
  }

  const patterns: RegExp[] = [
    /if i (?:change|edit|modify|touch|update)\s+(.+)$/i,
    /(?:depends on|depend on|depending on)\s+(.+)$/i,
    /(?:what|who) (?:breaks(?: in)?|uses|imports)\s+(.+)$/i,
    /impact of\s+(.+)$/i,
    /blast radius of\s+(.+)$/i,
    /what does\s+(.+?)\s+(?:do|import|imports|use|uses|depend|depend on|depend upon)\b/i,
    /what is\s+(.+)$/i,
    /explain\s+(.+)$/i,
    /tell me about\s+(.+)$/i,
    /describe\s+(.+)$/i,
    /(?:dependencies|imports|importers) (?:of|for)\s+(.+)$/i,
    /(?:change|changing)\s+(.+)$/i,
    /(?:raise|improve) (?:the )?(?:score|quality|health|grade) (?:for|of|in)\s+(.+)$/i,
    /how healthy is\s+(.+)$/i,
    /(?:health|quality|score) of\s+(.+)$/i,
    /worst folders? (?:in|under|of)\s+(.+)$/i
  ]
  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    const raw = match?.[1] ? cleanTarget(match[1]) : undefined
    if (raw) return raw
  }

  if (intent === 'explain' && looksLikeBareTarget(normalizeQuestion(trimmed))) {
    return cleanTarget(trimmed)
  }
  return undefined
}

function cleanTarget(raw: string): string | undefined {
  let text = raw.trim().replace(/[?!.]+$/g, '').trim()
  text = text.replace(/^(the file|file|the folder|folder|the directory|directory|the module|module|the function|function|the class|class|the symbol|symbol|the path|path)\s+/i, '')
  text = text.replace(/^(called|named)\s+/i, '')
  text = text.replace(/\s+(file|folder|directory|module|function|class|symbol)$/i, '')
  text = text.replace(/^[\s./]+/, '').replace(/\/+$/, '')
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (!normalized || GENERIC_TARGETS.has(normalized.toLowerCase())) return undefined
  return normalized
}

function resolveQaTarget(graph: Graph, ref: string): ResolveResult {
  const needle = ref.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
  if (!needle) return { status: 'none' }
  const pathLike = needle.includes('/') || /\.\w+$/.test(needle)

  const files = graph.nodes.filter((node): node is FileNode => node.kind === 'file')
  const folders = graph.nodes.filter((node): node is DirectoryNode => node.kind === 'directory' && node.path !== '.')
  const symbols = graph.nodes.filter((node): node is SymbolNode => node.kind === 'symbol')
  const nodesById = indexNodes(graph)

  const fileTarget = (node: FileNode): QaFileTarget => ({ kind: 'file', id: node.id, path: node.path, node })
  const folderTarget = (node: DirectoryNode): QaFolderTarget => ({ kind: 'folder', id: node.id, path: node.path, node })
  const folderFromPath = (path: string): QaFolderTarget => ({ kind: 'folder', id: `dir:${path}`, path })
  const symbolTarget = (node: SymbolNode): QaSymbolTarget => {
    const fileNode = nodesById.get(node.file)
    const path = fileNode?.kind === 'file' ? fileNode.path : node.file
    return { kind: 'symbol', id: node.id, path, name: node.label, node }
  }

  const exactFiles = files.filter(node => node.path === needle)
  const exactFolders = folders.filter(node => node.path === needle)
  if (exactFiles.length + exactFolders.length === 1) {
    const file = exactFiles[0]
    const folder = exactFolders[0]
    return { status: 'found', target: file ? fileTarget(file) : folderTarget(folder!) }
  }
  if (exactFiles.length + exactFolders.length > 1) {
    return ambiguous(needle, [...exactFiles.map(fileTarget), ...exactFolders.map(folderTarget)])
  }

  const ci = needle.toLowerCase()
  const ciFiles = files.filter(node => node.path.toLowerCase() === ci)
  const ciFolders = folders.filter(node => node.path.toLowerCase() === ci)
  if (ciFiles.length + ciFolders.length === 1) {
    const file = ciFiles[0]
    const folder = ciFolders[0]
    return { status: 'found', target: file ? fileTarget(file) : folderTarget(folder!) }
  }
  if (ciFiles.length + ciFolders.length > 1) {
    return ambiguous(needle, [...ciFiles.map(fileTarget), ...ciFolders.map(folderTarget)])
  }

  const suffixOf = (path: string, ignoreCase: boolean): boolean => {
    const left = ignoreCase ? path.toLowerCase() : path
    const right = ignoreCase ? ci : needle
    return left === right || left.endsWith(`/${right}`)
  }
  const suffixFiles = files.filter(node => suffixOf(node.path, false))
  const suffixFolders = folders.filter(node => suffixOf(node.path, false))
  if (suffixFiles.length + suffixFolders.length === 1) {
    const file = suffixFiles[0]
    const folder = suffixFolders[0]
    return { status: 'found', target: file ? fileTarget(file) : folderTarget(folder!) }
  }
  if (suffixFiles.length + suffixFolders.length > 1) {
    return ambiguous(needle, [...suffixFiles.map(fileTarget), ...suffixFolders.map(folderTarget)])
  }
  const ciSuffixFiles = files.filter(node => suffixOf(node.path, true))
  const ciSuffixFolders = folders.filter(node => suffixOf(node.path, true))
  if (ciSuffixFiles.length + ciSuffixFolders.length === 1) {
    const file = ciSuffixFiles[0]
    const folder = ciSuffixFolders[0]
    return { status: 'found', target: file ? fileTarget(file) : folderTarget(folder!) }
  }
  if (ciSuffixFiles.length + ciSuffixFolders.length > 1) {
    return ambiguous(needle, [...ciSuffixFiles.map(fileTarget), ...ciSuffixFolders.map(folderTarget)])
  }

  const base = basename(needle)
  const baseCi = base.toLowerCase()
  const baseFiles = files.filter(node => basename(node.path) === base || node.label === base)
  const baseFolders = folders.filter(node => basename(node.path) === base || node.label === base)
  if (baseFiles.length + baseFolders.length === 1) {
    const file = baseFiles[0]
    const folder = baseFolders[0]
    return { status: 'found', target: file ? fileTarget(file) : folderTarget(folder!) }
  }
  if (baseFiles.length + baseFolders.length > 1) {
    return ambiguous(needle, [...baseFiles.map(fileTarget), ...baseFolders.map(folderTarget)])
  }
  const ciBaseFiles = files.filter(node => basename(node.path).toLowerCase() === baseCi || node.label.toLowerCase() === baseCi)
  const ciBaseFolders = folders.filter(node => basename(node.path).toLowerCase() === baseCi || node.label.toLowerCase() === baseCi)
  if (ciBaseFiles.length + ciBaseFolders.length === 1) {
    const file = ciBaseFiles[0]
    const folder = ciBaseFolders[0]
    return { status: 'found', target: file ? fileTarget(file) : folderTarget(folder!) }
  }
  if (ciBaseFiles.length + ciBaseFolders.length > 1) {
    return ambiguous(needle, [...ciBaseFiles.map(fileTarget), ...ciBaseFolders.map(folderTarget)])
  }

  if (!pathLike) {
    const exactSymbols = symbols.filter(node => node.label === needle)
    if (exactSymbols.length === 1) return { status: 'found', target: symbolTarget(exactSymbols[0]!) }
    if (exactSymbols.length > 1) return ambiguous(needle, exactSymbols.map(symbolTarget))
    const ciSymbols = symbols.filter(node => node.label.toLowerCase() === ci)
    if (ciSymbols.length === 1) return { status: 'found', target: symbolTarget(ciSymbols[0]!) }
    if (ciSymbols.length > 1) return ambiguous(needle, ciSymbols.map(symbolTarget))
  }

  if (!pathLike && !folders.some(node => node.path === needle)) {
    const filesInFolder = files.filter(node => inFolder(node.path, needle))
    const implied = impliedFolders(graph)
    if (implied.has(needle) || filesInFolder.length > 0 && needle !== base) {
      if (implied.has(needle) || filesInFolder.length > 0) {
        return { status: 'found', target: folderFromPath(needle) }
      }
    }
  }

  return { status: 'missing', ref: needle }
}

function ambiguous(ref: string, candidates: QaTarget[]): ResolveResult {
  const unique = uniqueTargets(candidates)
  if (unique.length === 1) return { status: 'found', target: unique[0]! }
  unique.sort(compareTargets)
  return { status: 'ambiguous', ref, candidates: unique }
}

function uniqueTargets(targets: QaTarget[]): QaTarget[] {
  const seen = new Set<string>()
  const out: QaTarget[] = []
  for (const target of targets) {
    const key = `${target.kind}\0${target.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(target)
  }
  return out
}

function compareTargets(left: QaTarget, right: QaTarget): number {
  return compareStrings(left.kind, right.kind) || compareStrings(left.path, right.path) || compareStrings(targetName(left), targetName(right))
}

function targetName(target: QaTarget): string {
  return target.kind === 'symbol' ? target.name : target.path
}

function targetLabel(target: QaTarget): string {
  if (target.kind === 'symbol') return `${target.name} in ${target.path}`
  return target.path
}

function describeResolve(resolved: Extract<ResolveResult, { status: 'missing' } | { status: 'ambiguous' }>): {
  answer: string
  code: MessageCodeId
  params?: MessageParams
} {
  if (resolved.status === 'missing') {
    return {
      answer: `I could not find “${resolved.ref}” in this scan. Try a full repo-relative path, a file name, or a symbol name, or ask for an overview of the project.`,
      code: 'qa.resolve.missing',
      params: { ref: resolved.ref }
    }
  }
  const listed = resolved.candidates.slice(0, MAX_LISTED).map(candidate => targetLabel(candidate))
  const extraCount = Math.max(0, resolved.candidates.length - MAX_LISTED)
  const extra = extraCount > 0 ? ` and ${extraCount} more` : ''
  return {
    answer: `“${resolved.ref}” matches more than one place: ${andList(listed)}${extra}. Please use a full path or a more specific name.`,
    code: 'qa.resolve.ambiguous',
    params: { ref: resolved.ref, listed, extraCount }
  }
}

function citationsForResolve(resolved: ResolveResult): GraphQaCitation[] {
  if (resolved.status === 'ambiguous') return resolved.candidates.map(citationForTarget)
  if (resolved.status === 'found') return [citationForTarget(resolved.target)]
  return []
}

function focusPath(resolved: ResolveResult): string | undefined {
  if (resolved.status === 'found') return resolved.target.path
  if (resolved.status === 'ambiguous') return resolved.candidates[0]?.path
  return undefined
}

function citationForTarget(target: QaTarget): GraphQaCitation {
  if (target.kind === 'symbol') {
    const citation: GraphQaCitation = {
      kind: 'symbol',
      path: target.path,
      name: target.name,
      startLine: target.node.span.start.line,
      endLine: target.node.span.end.line
    }
    return citation
  }
  return { kind: target.kind, path: target.path }
}

function answerImpact(graph: Graph, resolved: ResolveResult): GraphQaResponse {
  if (resolved.status !== 'found') {
    return finish(
      graph,
      'impact',
      'Tell me which file, folder, or symbol you want to change and I can list what depends on it. For example: “What breaks if I change src/app.ts?”',
      [],
      firstFilePath(graph),
      'qa.impact.need-target'
    )
  }
  const target = resolved.target
  const files = filesForImpact(graph, target)
  if (files.length === 0) {
    return finish(
      graph,
      'impact',
      `I could not find any files to walk from ${targetLabel(target)}.`,
      [citationForTarget(target)],
      target.path,
      'qa.impact.no-files',
      { target: targetLabel(target) }
    )
  }

  const dependents = new Map<string, { path: string; depth: number; edge?: GraphEdge }>()
  const nodesById = indexNodes(graph)
  for (const file of files) {
    const walked = walkFileImpact(graph, file.id, 'downstream')
    collectDependents(graph, file.path, walked.paths, dependents, nodesById, target.kind === 'folder' ? target.path : undefined)
  }

  const rows = [...dependents.values()].sort((left, right) => left.depth - right.depth || compareStrings(left.path, right.path))
  const citations: GraphQaCitation[] = [citationForTarget(target)]
  for (const row of rows) {
    const citation: GraphQaCitation = { kind: 'file', path: row.path }
    const span = importSpan(row.edge)
    if (span) {
      citation.startLine = span.startLine
      citation.endLine = span.endLine
    }
    citations.push(citation)
  }

  if (rows.length === 0) {
    const scope = target.kind === 'folder'
      ? `${target.path} contains ${plural(files.length, 'file')} and nothing outside it imports those files`
      : `Nothing in this scan imports ${targetLabel(target)}`
    return finish(
      graph,
      'impact',
      `${scope}, so a change is unlikely to break other files here.`,
      citations,
      target.path,
      'qa.impact.none',
      { target: targetLabel(target), kind: target.kind, ...(target.kind === 'folder' ? { fileCount: files.length } : {}) }
    )
  }

  const listed = rows.slice(0, MAX_LISTED).map(row => `${row.path} (depth ${row.depth})`)
  const extra = rows.length > MAX_LISTED ? ` ${rows.length - MAX_LISTED} more files also depend on it.` : ''
  const lead = target.kind === 'folder'
    ? `If you change ${target.path} (${plural(files.length, 'file')}), ${plural(rows.length, 'file')} outside or downstream would be affected: `
    : `If you change ${targetLabel(target)}, ${plural(rows.length, 'file')} depend on it: `
  return finish(
    graph,
    'impact',
    `${lead}${andList(listed)}.${extra}`,
    citations,
    target.path,
    'qa.impact.dependents',
    {
      target: targetLabel(target),
      kind: target.kind,
      ...(target.kind === 'folder' ? { fileCount: files.length } : {}),
      dependentCount: rows.length,
      listed,
      extraCount: Math.max(0, rows.length - MAX_LISTED)
    }
  )
}

function filesForImpact(graph: Graph, target: QaTarget): FileNode[] {
  if (target.kind === 'file') return [target.node]
  if (target.kind === 'symbol') {
    const node = indexNodes(graph).get(target.node.file)
    return node?.kind === 'file' ? [node] : []
  }
  return graph.nodes.filter((node): node is FileNode => node.kind === 'file' && inFolder(node.path, target.path))
}

function collectDependents(
  graph: Graph,
  startPath: string,
  paths: readonly ImpactPath[],
  into: Map<string, { path: string; depth: number; edge?: GraphEdge }>,
  nodesById: Map<string, GraphNode>,
  excludeFolder?: string
): void {
  for (const path of paths) {
    const endId = path.nodes.at(-1)
    if (!endId) continue
    const node = nodesById.get(endId)
    if (node?.kind !== 'file') continue
    if (node.path === startPath) continue
    if (excludeFolder && inFolder(node.path, excludeFolder)) continue
    const existing = into.get(node.path)
    if (existing && existing.depth <= path.depth) continue
    const lastEdge = path.edges.at(-1)
    const graphEdge = lastEdge
      ? graph.edges.find(edge => edge.source === lastEdge.source && edge.target === lastEdge.target && IMPORT_TYPES.has(edge.type))
      : undefined
    into.set(node.path, { path: node.path, depth: path.depth, edge: graphEdge })
  }
}

function importSpan(edge: GraphEdge | undefined): { startLine: number; endLine: number } | undefined {
  if (!edge || !('span' in edge) || !edge.span) return undefined
  return { startLine: edge.span.start.line, endLine: edge.span.end.line }
}

function answerExplain(graph: Graph, resolved: ResolveResult): GraphQaResponse {
  if (resolved.status !== 'found') {
    return finish(
      graph,
      'explain',
      'Ask about a specific file, folder, or symbol — for example, “What does src/app.ts do?” — and I can summarise what it is, what it imports, and what imports it.',
      [],
      firstFilePath(graph),
      'qa.explain.need-target'
    )
  }
  const target = resolved.target
  if (target.kind === 'folder') {
    const explained = explainFolder(graph, target)
    return finish(graph, 'explain', explained.answer, [citationForTarget(target)], target.path, explained.code, explained.params)
  }
  if (target.kind === 'symbol') {
    const explained = explainSymbol(graph, target)
    return finish(graph, 'explain', explained.answer, [citationForTarget(target)], target.path, explained.code, explained.params)
  }
  const explained = explainFile(graph, target)
  return finish(graph, 'explain', explained.answer, explainFileCitations(graph, target), target.path, explained.code, explained.params)
}

function explainFile(graph: Graph, target: QaFileTarget): { answer: string; code: MessageCodeId; params: MessageParams } {
  const file = target.node
  const parts: string[] = []
  const params: MessageParams = { path: file.path, language: languageLabel(file.language) }
  const language = languageLabel(file.language)
  const lines = file.lineCount !== null ? ` (${file.lineCount} lines)` : ''
  parts.push(`${file.path} is a ${language} file${lines}.`)
  if (file.lineCount !== null) params.lineCount = file.lineCount
  if (file.docSummary) parts.push(file.docSummary.replace(/\s+/g, ' ').trim())
  if (file.hotspot && file.hotspot.score > 0) {
    parts.push(`Its hotspot score is ${file.hotspot.score}.`)
    params.hotspotScore = file.hotspot.score
  }

  const symbols = graph.nodes
    .filter((node): node is SymbolNode => node.kind === 'symbol' && node.file === file.id)
    .sort((left, right) => left.span.start.line - right.span.start.line || compareStrings(left.label, right.label))
  if (symbols.length > 0) {
    const listed = symbols.slice(0, MAX_LISTED).map(symbol => {
      const exportTag = symbol.exported ? 'exported ' : ''
      return `${exportTag}${symbol.symbolKind} ${symbol.label}`
    })
    const extra = symbols.length > MAX_LISTED ? ` and ${symbols.length - MAX_LISTED} more` : ''
    parts.push(`It declares ${andList(listed)}${extra}.`)
    params.symbols = listed
    params.extraSymbols = Math.max(0, symbols.length - MAX_LISTED)
  }

  const { imports, importers } = fileImports(graph, file.id)
  if (imports.length > 0) {
    const listedImports = imports.slice(0, MAX_LISTED)
    parts.push(`It imports ${andList(listedImports)}${imports.length > MAX_LISTED ? ` and ${imports.length - MAX_LISTED} more` : ''}.`)
    params.imports = listedImports
    params.extraImports = Math.max(0, imports.length - MAX_LISTED)
  } else parts.push('It does not import other files in this scan.')
  if (importers.length > 0) {
    const listedImporters = importers.slice(0, MAX_LISTED)
    parts.push(`It is imported by ${andList(listedImporters)}${importers.length > MAX_LISTED ? ` and ${importers.length - MAX_LISTED} more` : ''}.`)
    params.importers = listedImporters
    params.extraImporters = Math.max(0, importers.length - MAX_LISTED)
  } else parts.push('No other file in this scan imports it.')

  const findings = (graph.architecture?.findings ?? []).filter(finding => finding.file === file.path)
  if (findings.length > 0) {
    const listedFindings = findings.slice(0, MAX_LISTED).map(formatFinding)
    parts.push(`Architecture findings: ${andList(listedFindings)}.`)
    params.findings = listedFindings
  }
  const entry = entryReasons(file)
  if (entry.length > 0) {
    parts.push(`It looks like an entry point (${andList(entry)}).`)
    params.entry = entry
  }
  return { answer: parts.join(' '), code: 'qa.explain.file', params }
}

function explainFileCitations(graph: Graph, target: QaFileTarget): GraphQaCitation[] {
  const citations: GraphQaCitation[] = [citationForTarget(target)]
  const symbols = graph.nodes
    .filter((node): node is SymbolNode => node.kind === 'symbol' && node.file === target.id)
    .sort((left, right) => left.span.start.line - right.span.start.line || compareStrings(left.label, right.label))
  for (const symbol of symbols.slice(0, 4)) {
    citations.push({
      kind: 'symbol',
      path: target.path,
      name: symbol.label,
      startLine: symbol.span.start.line,
      endLine: symbol.span.end.line
    })
  }
  return citations
}

function explainFolder(graph: Graph, target: QaFolderTarget): { answer: string; code: MessageCodeId; params: MessageParams } {
  const files = graph.nodes.filter((node): node is FileNode => node.kind === 'file' && inFolder(node.path, target.path))
  if (files.length === 0) {
    return { answer: `The folder ${target.path} has no scanned files.`, code: 'qa.explain.folder-empty', params: { path: target.path } }
  }
  const languages = countLanguages(files)
  const params: MessageParams = { path: target.path, fileCount: files.length }
  if (languages) params.languages = languages
  const parts = [
    `${target.path} contains ${plural(files.length, 'file')}${languages ? `: ${languages}` : ''}.`
  ]
  const folderQuality = graph.quality?.folders?.find(folder => folder.path === target.path)
  if (folderQuality) {
    parts.push(`Its quality score is ${folderQuality.score} (grade ${folderQuality.grade}).`)
    params.score = folderQuality.score
    params.grade = folderQuality.grade
    if (folderQuality.tips[0]) {
      parts.push(`To raise it: ${folderQuality.tips[0].text} (about ${folderQuality.tips[0].gain} points).`)
      params.tip = folderQuality.tips[0].text
      params.tipGain = folderQuality.tips[0].gain
    }
  }
  const listed = files.map(file => file.path).sort(compareStrings).slice(0, MAX_LISTED)
  const extra = files.length > MAX_LISTED ? ` and ${files.length - MAX_LISTED} more` : ''
  parts.push(`Files include ${andList(listed)}${extra}.`)
  params.files = listed
  params.extraFiles = Math.max(0, files.length - MAX_LISTED)
  return { answer: parts.join(' '), code: 'qa.explain.folder', params }
}

function explainSymbol(graph: Graph, target: QaSymbolTarget): { answer: string; code: MessageCodeId; params: MessageParams } {
  const symbol = target.node
  const params: MessageParams = {
    name: symbol.label,
    kind: symbol.symbolKind,
    path: target.path,
    startLine: symbol.span.start.line,
    endLine: symbol.span.end.line,
    exported: symbol.exported
  }
  const parts = [
    `${symbol.label} is ${article(symbol.symbolKind)} ${symbol.symbolKind} in ${target.path} (lines ${symbol.span.start.line}–${symbol.span.end.line}).`
  ]
  if (symbol.exported) parts.push('It is exported.')
  if (symbol.docSummary) parts.push(symbol.docSummary.replace(/\s+/g, ' ').trim())
  const file = indexNodes(graph).get(symbol.file)
  if (file?.kind === 'file' && file.docSummary) {
    parts.push(`The surrounding file: ${file.docSummary.replace(/\s+/g, ' ').trim()}`)
  }
  return { answer: parts.join(' '), code: 'qa.explain.symbol', params }
}

function fileImports(graph: Graph, fileId: string): { imports: string[]; importers: string[] } {
  const nodesById = indexNodes(graph)
  const imports: string[] = []
  const importers: string[] = []
  const seenImports = new Set<string>()
  const seenImporters = new Set<string>()
  for (const edge of graph.edges) {
    if (!IMPORT_TYPES.has(edge.type)) continue
    if (edge.source === fileId) {
      const label = edgeLabel(nodesById.get(edge.target), edge)
      if (!seenImports.has(label)) {
        seenImports.add(label)
        imports.push(label)
      }
    }
    if (edge.target === fileId) {
      const node = nodesById.get(edge.source)
      const label = node?.kind === 'file' ? node.path : edge.source
      if (!seenImporters.has(label)) {
        seenImporters.add(label)
        importers.push(label)
      }
    }
  }
  imports.sort(compareStrings)
  importers.sort(compareStrings)
  return { imports, importers }
}

function edgeLabel(node: GraphNode | undefined, edge: GraphEdge): string {
  if (node?.kind === 'file') return node.path
  if (node?.kind === 'external') return node.label
  if (node?.kind === 'unresolved') return `${'specifier' in edge ? edge.specifier : node.label} (unresolved)`
  return 'specifier' in edge ? edge.specifier : edge.target
}

function entryReasons(file: FileNode): string[] {
  const details = file.entryCandidates ?? (file.entryCandidate ? [file.entryCandidate] : [])
  const reasons = details.map(item => entryReasonLabel(item.reason)).sort(compareStrings)
  return [...new Set(reasons)]
}

function entryReasonLabel(reason: string): string {
  switch (reason) {
    case 'conventional-name':
      return 'conventional name'
    case 'package-bin':
      return 'package bin'
    case 'package-main':
      return 'package main'
    case 'package-exports':
      return 'package exports'
    case 'package-script':
      return 'package script'
    case 'python-name-main':
      return 'Python __main__'
    case 'pyproject-script':
    case 'pyproject-gui-script':
    case 'setup-console-script':
      return 'Python script entry'
    case 'dockerfile-cmd':
    case 'dockerfile-entrypoint':
      return 'Docker entrypoint'
    default:
      return reason.replace(/-/g, ' ')
  }
}

function answerHotspots(graph: Graph): GraphQaResponse {
  const hotspots = graph.hotspots ?? []
  if (hotspots.length === 0) {
    return finish(
      graph,
      'hotspots',
      'This scan does not include hotspot scores. They appear in graph.json 1.2.0 and later when at least one file scores above 0. I can still explain a file or walk its impact if you name it.',
      [],
      undefined,
      'qa.hotspots.none'
    )
  }
  const listed = hotspots.slice(0, MAX_LISTED)
  const lines = listed.map((item, index) => `${index + 1}. ${item.path} (score ${item.score}) — ${item.why}`)
  const extra = hotspots.length > MAX_LISTED ? ` ${hotspots.length - MAX_LISTED} more files are also listed on the graph.` : ''
  const citations = listed.map(item => ({ kind: 'file' as const, path: item.path }))
  return finish(
    graph,
    'hotspots',
    `The riskiest files are:\n${lines.join('\n')}${extra}`,
    citations,
    listed[0]?.path,
    'qa.hotspots.list',
    {
      count: hotspots.length,
      paths: listed.map(item => item.path),
      scores: listed.map(item => String(item.score)),
      extraCount: Math.max(0, hotspots.length - MAX_LISTED)
    }
  )
}

function answerQuality(graph: Graph, resolved: ResolveResult): GraphQaResponse {
  const quality = graph.quality
  if (!quality) {
    return finish(
      graph,
      'quality',
      'This scan does not include quality scores. They appear in graph.json 1.3.0 and later. I can still look for circular imports or architecture rule breaks, or talk through a specific file.',
      [],
      undefined,
      'qa.quality.none'
    )
  }

  if (resolved.status === 'found' && (resolved.target.kind === 'folder' || resolved.target.kind === 'file')) {
    const folderPath = resolved.target.kind === 'folder' ? resolved.target.path : parentFolder(resolved.target.path)
    const folder = folderPath ? quality.folders?.find(item => item.path === folderPath) : undefined
    if (folder) {
      const folderMessage = describeQualityScore(`${folder.path} scores`, folder, quality.folders)
      return finish(graph, 'quality', folderMessage.answer, [ { kind: 'folder', path: folder.path } ], folder.path, folderMessage.code, folderMessage.params)
    }
    if (resolved.target.kind === 'folder') {
      return finish(
        graph,
        'quality',
        `There is no separate quality score for ${resolved.target.path}. The project scores ${quality.project.score} (grade ${quality.project.grade}).`,
        [{ kind: 'folder', path: resolved.target.path }],
        resolved.target.path,
        'qa.quality.folder-missing',
        { path: resolved.target.path, projectScore: quality.project.score, projectGrade: quality.project.grade }
      )
    }
  }

  const projectMessage = describeQualityScore('The project scores', quality.project, quality.folders)
  return finish(
    graph,
    'quality',
    projectMessage.answer,
    quality.folders?.slice(0, 5).map(folder => ({ kind: 'folder' as const, path: folder.path })) ?? [],
    quality.folders?.[0]?.path,
    projectMessage.code,
    projectMessage.params
  )
}

function describeQualityScore(lead: string, score: QualityScore, folders?: { path: string; score: number; grade: string }[]): {
  answer: string
  code: MessageCodeId
  params: MessageParams
} {
  const parts = [`${lead} ${score.score} out of 100 (grade ${score.grade}).`]
  const params: MessageParams = { lead, score: score.score, grade: score.grade }
  const penalties = score.breakdown.filter(item => item.penalty > 0)
  if (penalties.length > 0) {
    const penaltyLabels = penalties.map(item => `${item.label} (−${item.penalty})`)
    parts.push(`What pulled it down: ${andList(penaltyLabels)}.`)
    params.penalties = penaltyLabels
  } else {
    parts.push('No category currently takes points off.')
  }
  if (score.tips.length > 0) {
    const tips = score.tips.slice(0, 3).map(tip => `${tip.text} (about ${tip.gain} points)`)
    parts.push(`To raise the score: ${andList(tips)}.`)
    params.tips = tips
  }
  if (folders && folders.length > 0) {
    const worst = [...folders].sort((left, right) => right.score === left.score ? compareStrings(left.path, right.path) : left.score - right.score)
    const listed = worst.slice(0, 5).map(folder => `${folder.path} (${folder.score}, ${folder.grade})`)
    parts.push(`Worst folders: ${andList(listed)}.`)
    params.worstFolders = listed
  }
  return { answer: parts.join(' '), code: 'qa.quality.score', params }
}

function answerDuplicates(graph: Graph): GraphQaResponse {
  const duplicates = graph.duplicates
  if (!duplicates || duplicates.groups.length === 0) {
    return finish(
      graph,
      'duplicates',
      'This scan does not list any duplicated code. Duplicate groups appear in graph.json 1.4.0 and later when a repeated block meets the size threshold.',
      [],
      undefined,
      'qa.duplicates.none'
    )
  }
  const summary = duplicates.summary
  const groups = duplicates.groups
  const listed = groups.slice(0, MAX_LISTED)
  const lines = listed.map((group, index) => `${index + 1}. ${group.description}`)
  const extra = groups.length > MAX_LISTED ? ` ${groups.length - MAX_LISTED} more groups are on the graph.` : ''
  const citations: GraphQaCitation[] = []
  for (const group of listed) {
    for (const occurrence of group.occurrences) {
      citations.push({
        kind: 'file',
        path: occurrence.path,
        startLine: occurrence.startLine,
        endLine: occurrence.endLine
      })
    }
  }
  const head = `There ${summary.groups === 1 ? 'is' : 'are'} ${plural(summary.groups, 'duplicate group')} covering ${summary.duplicatedLines} lines (${summary.percentage}% of the scanned files).`
  return finish(
    graph,
    'duplicates',
    `${head}\n${lines.join('\n')}${extra}`,
    citations,
    listed[0]?.occurrences[0]?.path,
    'qa.duplicates.list',
    {
      groups: summary.groups,
      duplicatedLines: summary.duplicatedLines,
      percentage: summary.percentage,
      descriptions: listed.map(group => group.description),
      extraCount: Math.max(0, groups.length - MAX_LISTED)
    }
  )
}

function answerArchitecture(graph: Graph): GraphQaResponse {
  const cycles = collectQualityInputs(graph).cycles
  const findings = [...(graph.architecture?.findings ?? [])].sort(
    (left, right) => compareStrings(left.file, right.file) || left.line - right.line || compareStrings(left.rule, right.rule)
  )
  const parts: string[] = []
  const citations: GraphQaCitation[] = []

  if (cycles.length === 0) {
    parts.push('No file-level import cycles showed up in this scan.')
  } else {
    const listed = cycles.slice(0, MAX_LISTED).map(cycle => cycle.paths.join(' → '))
    const extra = cycles.length > MAX_LISTED ? ` and ${cycles.length - MAX_LISTED} more` : ''
    parts.push(`${plural(cycles.length, 'import cycle')} ${cycles.length === 1 ? 'was' : 'were'} found: ${andList(listed)}${extra}.`)
    for (const cycle of cycles.slice(0, MAX_LISTED)) {
      for (const path of cycle.paths) citations.push({ kind: 'file', path })
    }
  }

  if (!graph.architecture) {
    parts.push('This scan has no architecture rules section, so I cannot report configured rule breaks.')
  } else if (findings.length === 0) {
    parts.push('No architecture rule breaks were recorded.')
  } else {
    const listed = findings.slice(0, MAX_LISTED).map(formatFinding)
    const extra = findings.length > MAX_LISTED ? ` and ${findings.length - MAX_LISTED} more` : ''
    parts.push(`${plural(findings.length, 'architecture finding')} ${findings.length === 1 ? 'was' : 'were'} recorded: ${andList(listed)}${extra}.`)
    for (const finding of findings.slice(0, MAX_LISTED)) {
      citations.push({ kind: 'file', path: finding.file, startLine: finding.line, endLine: finding.line })
    }
  }

  return finish(graph, 'architecture', parts.join(' '), citations, citations[0]?.path, 'qa.architecture', {
    cycleCount: cycles.length,
    hasConfig: Boolean(graph.architecture),
    findingCount: findings.length
  })
}

function formatFinding(finding: ArchitectureFinding): string {
  return `${finding.file}:${finding.line} (${finding.rule}: ${finding.from} → ${finding.to})`
}

function answerOverview(graph: Graph): GraphQaResponse {
  const files = graph.nodes.filter((node): node is FileNode => node.kind === 'file')
  const fileCount = graph.summary?.files ?? files.length
  const parts: string[] = [`This scan covers ${plural(fileCount, 'file')}.`]
  const languages = languagesFromCoverage(graph, files)
  if (languages) parts.push(`Languages: ${languages}.`)
  const folders = topLevelFolders(graph, files)
  if (folders.length > 0) {
    parts.push(`Top-level folders: ${andList(folders.slice(0, MAX_LISTED))}${folders.length > MAX_LISTED ? ` and ${folders.length - MAX_LISTED} more` : ''}.`)
  }
  const entries = entryPointPaths(files)
  if (entries.length > 0) {
    parts.push(`Likely entry points: ${andList(entries.slice(0, MAX_LISTED))}${entries.length > MAX_LISTED ? ` and ${entries.length - MAX_LISTED} more` : ''}.`)
  } else {
    const roots = rootFiles(graph, files)
    if (roots.length > 0) {
      parts.push(`No conventional entry points were marked. Files that nothing else imports include ${andList(roots.slice(0, MAX_LISTED))}.`)
    } else {
      parts.push('No conventional entry points were marked.')
    }
  }
  const citations: GraphQaCitation[] = [
    ...folders.slice(0, 4).map(path => ({ kind: 'folder' as const, path })),
    ...entries.slice(0, 4).map(path => ({ kind: 'file' as const, path }))
  ]
  if (citations.length === 0) {
    for (const file of files.slice(0, 4)) citations.push({ kind: 'file', path: file.path })
  }
  return finish(graph, 'overview', parts.join(' '), citations, entries[0] ?? folders[0] ?? files[0]?.path, 'qa.overview', {
    fileCount,
    ...(languages ? { languages } : {}),
    ...(folders.length > 0 ? { folders: folders.slice(0, MAX_LISTED), extraFolders: Math.max(0, folders.length - MAX_LISTED) } : {}),
    ...(entries.length > 0 ? { entries: entries.slice(0, MAX_LISTED), extraEntries: Math.max(0, entries.length - MAX_LISTED) } : {})
  })
}

function languagesFromCoverage(graph: Graph, files: readonly FileNode[]): string | undefined {
  const rows = graph.coverage?.byLanguage
  if (rows && rows.length > 0) {
    const counted = rows
      .map(row => ({ language: row.language, count: row.parsed + row.partial }))
      .filter((row): row is { language: string; count: number } => Boolean(row.language) && row.count > 0)
      .sort((left, right) => right.count - left.count || compareStrings(left.language, right.language))
    if (counted.length > 0) {
      return andList(counted.map(row => `${row.count} ${languageLabel(row.language)}`))
    }
  }
  return countLanguages(files) || undefined
}

function countLanguages(files: readonly FileNode[]): string {
  const counts = new Map<string, number>()
  for (const file of files) {
    if (!file.language) continue
    counts.set(file.language, (counts.get(file.language) ?? 0) + 1)
  }
  const rows = [...counts.entries()].sort((left, right) => right[1] - left[1] || compareStrings(left[0], right[0]))
  return andList(rows.map(([language, count]) => `${count} ${languageLabel(language)}`))
}

function answerFallback(graph: Graph, normalized: string): GraphQaResponse {
  const suggestions = buildSuggestions(graph, 'fallback')
  const examples = suggestions.length > 0 ? ` For example: ${andList(suggestions.map(item => `“${item}”`))}.` : ''
  const lead = !normalized
    ? 'Ask a question about this scan and I will answer from the graph only, with no AI.'
    : 'I am not sure how to read that question. I can answer from this scan without AI.'
  return finish(
    graph,
    'fallback',
    `${lead}${examples}`,
    [],
    undefined,
    normalized ? 'qa.fallback.unknown' : 'qa.fallback.empty',
    suggestions.length > 0 ? { examples: suggestions } : undefined
  )
}

function buildSuggestions(graph: Graph, intent: GraphQaIntent, focus?: string): string[] {
  const out: string[] = []
  const add = (item: string) => {
    if (!out.includes(item) && out.length < MAX_SUGGESTIONS) out.push(item)
  }
  const focusIsFile = Boolean(focus && graph.nodes.some(node => node.kind === 'file' && node.path === focus))
  const file = focusIsFile ? focus : firstFilePath(graph)
  if (intent !== 'impact' && file) add(`What breaks if I change ${file}?`)
  if (intent !== 'explain' && file) add(`What does ${file} do?`)
  if (intent !== 'hotspots' && (graph.hotspots?.length ?? 0) > 0) add('What are the riskiest files?')
  if (intent !== 'quality' && graph.quality) add('How healthy is the project?')
  if (intent !== 'quality' && (graph.quality?.folders?.length ?? 0) > 0) add('What are the worst folders?')
  if (intent !== 'duplicates' && (graph.duplicates?.groups.length ?? 0) > 0) add('Where is code duplicated?')
  if (intent !== 'architecture') add('Any circular imports?')
  if (intent !== 'architecture' && (graph.architecture?.findings?.length ?? 0) > 0) add('Any architecture rule breaks?')
  if (intent !== 'overview') add('What languages does this use?')
  if (intent !== 'overview') add('Where does the app start?')
  return out.slice(0, MAX_SUGGESTIONS)
}

function capCitations(citations: GraphQaCitation[]): GraphQaCitation[] {
  const seen = new Set<string>()
  const out: GraphQaCitation[] = []
  for (const citation of citations) {
    const key = `${citation.kind}\0${citation.path}\0${citation.name ?? ''}\0${citation.startLine ?? ''}\0${citation.endLine ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(citation)
    if (out.length >= MAX_CITATIONS) break
  }
  return out
}

function andList(items: readonly string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]!
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`
}

function inFolder(path: string, folder: string): boolean {
  if (folder === '.' || folder === '') return true
  return path === folder || path.startsWith(`${folder}/`)
}

function parentFolder(path: string): string | undefined {
  const index = path.lastIndexOf('/')
  if (index <= 0) return undefined
  return path.slice(0, index)
}

function firstFilePath(graph: Graph): string | undefined {
  return graph.nodes
    .filter((node): node is FileNode => node.kind === 'file')
    .map(node => node.path)
    .sort(compareStrings)[0]
}

function languageLabel(language: string | null | undefined): string {
  if (!language) return 'unknown language'
  return LANGUAGE_LABELS[language] ?? language
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}

function basename(path: string): string {
  const index = path.lastIndexOf('/')
  return index >= 0 ? path.slice(index + 1) : path
}

function impliedFolders(graph: Graph): Set<string> {
  const folders = new Set<string>()
  for (const node of graph.nodes) {
    const path = node.kind === 'file' || node.kind === 'directory' ? node.path : undefined
    if (!path || path === '.') continue
    if (node.kind === 'directory') folders.add(path)
    let current = parentFolder(path)
    while (current) {
      folders.add(current)
      current = parentFolder(current)
    }
  }
  return folders
}

function topLevelFolders(graph: Graph, files: readonly FileNode[]): string[] {
  const dirs = graph.nodes
    .filter((node): node is DirectoryNode => node.kind === 'directory' && node.path !== '.' && !node.path.includes('/'))
    .map(node => node.path)
  if (dirs.length > 0) return [...new Set(dirs)].sort(compareStrings)
  const derived = new Set<string>()
  for (const file of files) {
    const top = file.path.split('/')[0]
    if (top && top !== file.path) derived.add(top)
  }
  return [...derived].sort(compareStrings)
}

function entryPointPaths(files: readonly FileNode[]): string[] {
  return files
    .filter(file => Boolean(file.entryCandidate) || (file.entryCandidates && file.entryCandidates.length > 0))
    .map(file => file.path)
    .sort(compareStrings)
}

function rootFiles(graph: Graph, files: readonly FileNode[]): string[] {
  const imported = new Set<string>()
  for (const edge of graph.edges) {
    if (IMPORT_TYPES.has(edge.type)) imported.add(edge.target)
  }
  return files.filter(file => !imported.has(file.id)).map(file => file.path).sort(compareStrings)
}
