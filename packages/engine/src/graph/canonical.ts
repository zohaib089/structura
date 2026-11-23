import { compareStrings } from './ids.js'
import type { Coverage, Graph, GraphArchitecture, GraphEdge, GraphNode, GraphQuality } from './types.js'

/**
 * The canonical form is what makes graph.json byte-for-byte reproducible:
 *  - nodes sorted by id, edges by (source, type, target, start.line, start.col), lists in coverage sorted
 *    (all in UTF-16 code-unit order, never locale order)
 *  - fixed property order per shape (the order of the types), extension keys sorted
 *  - UTF-8 without BOM, 2-space indent, `\n` line ends, exactly one trailing newline
 */

const NODE_ORDER: Record<string, readonly string[]> = {
  directory: ['id', 'kind', 'path', 'label', 'extensions'],
  file: ['id', 'kind', 'path', 'label', 'language', 'lineCount', 'parse', 'decoding', 'entryCandidate', 'entryCandidates', 'module', 'docSummary', 'hotspot', 'extensions'],
  symbol: ['id', 'kind', 'file', 'label', 'symbolKind', 'exported', 'span', 'parent', 'paramCount', 'scope', 'mutable', 'stateKind', 'docSummary', 'extensions'],
  external: ['id', 'kind', 'ecosystem', 'label', 'extensions'],
  unresolved: ['id', 'kind', 'label', 'reason', 'extensions']
}
const EDGE_ORDER = ['source', 'type', 'target', 'provenance', 'confidence', 'reason', 'span', 'specifier', 'importKind', 'typeOnly', 'extensions']
const ARCHITECTURE_ORDER = ['config', 'defaultPolicy', 'modules', 'unassigned', 'findings', 'summary'] as const
const ARCHITECTURE_MODULE_ORDER = ['name', 'paths', 'allow', 'deny', 'policy'] as const
const ARCHITECTURE_FINDING_ORDER = ['from', 'to', 'edgeKind', 'file', 'line', 'rule', 'provenance'] as const
const NESTED_ORDER: Record<string, readonly string[]> = {
  span: ['start', 'end'],
  start: ['line', 'col'],
  end: ['line', 'col'],
  parse: ['status', 'reason'],
  entryCandidate: ['reason', 'provenance'],
  entryCandidateDetail: ['reason', 'evidence', 'confidence'],
  entryEvidence: ['source', 'pointer', 'span'],
  hotspot: ['score']
}

function ordered(value: Record<string, unknown>, order: readonly string[], nested = true): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const known = new Set(order)
  for (const key of order) if (value[key] !== undefined) out[key] = nestedValue(key, value[key], nested)
  // Unknown (newer-minor) properties keep a deterministic place after the known ones.
  for (const key of Object.keys(value).filter(key => !known.has(key)).sort(compareStrings)) {
    if (value[key] !== undefined) out[key] = sortedDeep(value[key])
  }
  return out
}

function nestedValue(key: string, value: unknown, nested: boolean): unknown {
  if (key === 'extensions') return sortedDeep(value)
  if (key === 'entryCandidates' && Array.isArray(value)) {
    return value.map(item => (typeof item === 'object' && item !== null
      ? ordered(item as Record<string, unknown>, NESTED_ORDER.entryCandidateDetail)
      : item))
  }
  const order = NESTED_ORDER[key]
  if (nested && order && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const record = ordered(value as Record<string, unknown>, order)
    if (key === 'entryCandidateDetail' && record.evidence && typeof record.evidence === 'object') {
      record.evidence = ordered(record.evidence as Record<string, unknown>, NESTED_ORDER.entryEvidence)
    }
    return record
  }
  return value
}

/** Recursively sorts object keys (used for free-form extension values). */
function sortedDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedDeep)
  if (typeof value === 'object' && value !== null) {
    const source = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort(compareStrings)) out[key] = sortedDeep(source[key])
    return out
  }
  return value
}

export function compareNodes(left: GraphNode, right: GraphNode): number {
  return compareStrings(left.id, right.id)
}

const startOf = (edge: GraphEdge): { line: number; col: number } =>
  'span' in edge ? edge.span.start : { line: 0, col: 0 }

export function compareEdges(left: GraphEdge, right: GraphEdge): number {
  const a = startOf(left)
  const b = startOf(right)
  return (
    compareStrings(left.source, right.source) ||
    compareStrings(left.type, right.type) ||
    compareStrings(left.target, right.target) ||
    a.line - b.line ||
    a.col - b.col
  )
}

function orderedNode(node: GraphNode): Record<string, unknown> {
  return ordered(node as unknown as Record<string, unknown>, NODE_ORDER[node.kind] ?? ['id', 'kind'])
}

function orderedCoverage(coverage: Coverage): Record<string, unknown> {
  const reasons = (list: { reason: string; count: number }[]): unknown[] =>
    [...list].sort((a, b) => compareStrings(a.reason, b.reason)).map(item => ({ reason: item.reason, count: item.count }))
  const f = coverage.files
  return {
    files: { discovered: f.discovered, parsed: f.parsed, partial: f.partial, failed: f.failed, skipped: f.skipped, ignored: f.ignored },
    byLanguage: [...coverage.byLanguage]
      .sort((a, b) => compareStrings(a.language ?? '', b.language ?? ''))
      .map(item => ({ language: item.language, parsed: item.parsed, partial: item.partial, failed: item.failed, skipped: item.skipped })),
    skipped: reasons(coverage.skipped),
    failed: reasons(coverage.failed),
    ignored: [...coverage.ignored].sort((a, b) => compareStrings(a.rule, b.rule)).map(item => ({ rule: item.rule, count: item.count })),
    unresolved: reasons(coverage.unresolved),
    ...(coverage.calls
      ? { calls: { resolved: coverage.calls.resolved, unresolved: coverage.calls.unresolved } }
      : {}),
    accounting: { discovered: coverage.accounting.discovered, accounted: coverage.accounting.accounted }
  }
}

function orderedArchitecture(architecture: GraphArchitecture): Record<string, unknown> {
  const modules = architecture.modules.map(mod => ordered(mod as unknown as Record<string, unknown>, ARCHITECTURE_MODULE_ORDER))
  const findings = architecture.findings?.map(item => ordered(item as unknown as Record<string, unknown>, ARCHITECTURE_FINDING_ORDER))
  const unassigned = [...architecture.unassigned].sort(compareStrings)
  return ordered(
    {
      ...architecture,
      modules,
      unassigned,
      ...(findings ? { findings } : {})
    } as unknown as Record<string, unknown>,
    ARCHITECTURE_ORDER
  )
}


const QUALITY_SCORE_ORDER = ['score', 'grade', 'breakdown', 'tips'] as const
const FOLDER_QUALITY_ORDER = ['path', 'score', 'grade', 'breakdown', 'tips'] as const
const BREAKDOWN_ORDER = ['category', 'label', 'penalty'] as const
const TIP_ORDER = ['text', 'gain'] as const

function orderedQualityScore(value: Record<string, unknown>, order: readonly string[]): Record<string, unknown> {
  const breakdown = Array.isArray(value.breakdown)
    ? value.breakdown.map(item => ordered(item as Record<string, unknown>, BREAKDOWN_ORDER, false))
    : value.breakdown
  const tips = Array.isArray(value.tips)
    ? value.tips.map(item => ordered(item as Record<string, unknown>, TIP_ORDER, false))
    : value.tips
  return ordered({ ...value, breakdown, tips }, order, false)
}

function orderedQuality(quality: GraphQuality): Record<string, unknown> {
  const project = orderedQualityScore(quality.project as unknown as Record<string, unknown>, QUALITY_SCORE_ORDER)
  const folders = quality.folders?.map(item =>
    orderedQualityScore(item as unknown as Record<string, unknown>, FOLDER_QUALITY_ORDER)
  )
  return ordered({ project, ...(folders ? { folders } : {}) }, ['project', 'folders'], false)
}

/** Returns a sorted, property-ordered copy. Never mutates the input. */
export function canonicalizeGraph(graph: Graph): Graph {
  const out: Record<string, unknown> = {
    schemaVersion: graph.schemaVersion,
    summary: {
      nodes: graph.summary.nodes,
      edges: graph.summary.edges,
      files: graph.summary.files,
      ...(graph.summary.entryCandidates ? { entryCandidates: graph.summary.entryCandidates } : {})
    },
    coverage: orderedCoverage(graph.coverage),
    nodes: [...graph.nodes].sort(compareNodes).map(orderedNode),
    edges: [...graph.edges].sort(compareEdges).map(edge => ordered(edge as unknown as Record<string, unknown>, EDGE_ORDER))
  }
  if (graph.architecture !== undefined) out.architecture = orderedArchitecture(graph.architecture)
  if (graph.hotspots !== undefined) {
    out.hotspots = graph.hotspots.map(item => ordered(item as unknown as Record<string, unknown>, ['path', 'score', 'why']))
  }
  if (graph.quality !== undefined) out.quality = orderedQuality(graph.quality)
  if (graph.extensions !== undefined) out.extensions = sortedDeep(graph.extensions)
  return out as unknown as Graph
}

const indent = (text: string, spaces: number): string => text.replace(/\n/g, `\n${' '.repeat(spaces)}`)

/**
 * Yields the serialised document in pieces (no giant intermediate string), so very large graphs
 * can be streamed to disk. Joining the chunks gives exactly `serializeGraph(graph)`.
 */
export function* graphChunks(graph: Graph): Generator<string> {
  const canonical = canonicalizeGraph(graph) as unknown as Record<string, unknown>
  yield '{\n'
  yield `  "schemaVersion": ${JSON.stringify(canonical.schemaVersion)},\n`
  yield `  "summary": ${indent(JSON.stringify(canonical.summary, null, 2), 2)},\n`
  yield `  "coverage": ${indent(JSON.stringify(canonical.coverage, null, 2), 2)},\n`
  for (let ki = 0; ki < (['nodes', 'edges'] as const).length; ki += 1) {
    const key = (['nodes', 'edges'] as const)[ki]
    const items = canonical[key] as unknown[]
    if (items.length === 0) {
      yield `  "${key}": []`
    } else {
      yield `  "${key}": [\n`
      for (let i = 0; i < items.length; i += 1) {
        yield `    ${indent(JSON.stringify(items[i], null, 2), 4)}${i < items.length - 1 ? ',' : ''}\n`
      }
      yield '  ]'
    }
    const trailing = ki === 0 || canonical.architecture !== undefined || canonical.hotspots !== undefined || canonical.quality !== undefined || canonical.extensions !== undefined
    yield trailing ? ',\n' : '\n'
  }
  if (canonical.architecture !== undefined) {
    yield `  "architecture": ${indent(JSON.stringify(canonical.architecture, null, 2), 2)}`
    yield canonical.hotspots !== undefined || canonical.quality !== undefined || canonical.extensions !== undefined ? ',\n' : '\n'
  }
  if (canonical.hotspots !== undefined) {
    yield `  "hotspots": ${indent(JSON.stringify(canonical.hotspots, null, 2), 2)}`
    yield canonical.quality !== undefined || canonical.extensions !== undefined ? ',\n' : '\n'
  }
  if (canonical.quality !== undefined) {
    yield `  "quality": ${indent(JSON.stringify(canonical.quality, null, 2), 2)}`
    yield canonical.extensions !== undefined ? ',\n' : '\n'
  }
  if (canonical.extensions !== undefined) yield `  "extensions": ${indent(JSON.stringify(canonical.extensions, null, 2), 2)}\n`
  yield '}\n'
}

export function serializeGraph(graph: Graph): string {
  return Array.from(graphChunks(graph)).join('')
}
