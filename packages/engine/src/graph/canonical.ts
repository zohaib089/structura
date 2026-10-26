import { compareStrings } from './ids.js'
import type { Coverage, Graph, GraphEdge, GraphNode } from './types.js'

/**
 * The canonical form is what makes graph.json byte-for-byte reproducible:
 *  - nodes sorted by id, edges by (source, type, target, start.line, start.col), lists in coverage sorted
 *    (all in UTF-16 code-unit order, never locale order)
 *  - fixed property order per shape (the order of the types), extension keys sorted
 *  - UTF-8 without BOM, 2-space indent, `\n` line ends, exactly one trailing newline
 */

const NODE_ORDER: Record<string, readonly string[]> = {
  directory: ['id', 'kind', 'path', 'label', 'extensions'],
  file: ['id', 'kind', 'path', 'label', 'language', 'lineCount', 'parse', 'decoding', 'entryCandidate', 'extensions'],
  symbol: ['id', 'kind', 'file', 'label', 'symbolKind', 'exported', 'span', 'extensions'],
  external: ['id', 'kind', 'ecosystem', 'label', 'extensions'],
  unresolved: ['id', 'kind', 'label', 'reason', 'extensions']
}
const EDGE_ORDER = ['source', 'type', 'target', 'provenance', 'confidence', 'reason', 'span', 'specifier', 'importKind', 'typeOnly', 'extensions']
const NESTED_ORDER: Record<string, readonly string[]> = {
  span: ['start', 'end'],
  start: ['line', 'col'],
  end: ['line', 'col'],
  parse: ['status', 'reason'],
  entryCandidate: ['reason', 'provenance']
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
  const order = NESTED_ORDER[key]
  if (nested && order && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return ordered(value as Record<string, unknown>, order)
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
    ignored: [...coverage.ignored].sort((a, b) => compareStrings(a.rule, b.rule)).map(item => ({ rule: item.rule, count: item.count })),
    unresolved: reasons(coverage.unresolved),
    accounting: { discovered: coverage.accounting.discovered, accounted: coverage.accounting.accounted }
  }
}

/** Returns a sorted, property-ordered copy. Never mutates the input. */
export function canonicalizeGraph(graph: Graph): Graph {
  const out: Record<string, unknown> = {
    schemaVersion: graph.schemaVersion,
    summary: { nodes: graph.summary.nodes, edges: graph.summary.edges, files: graph.summary.files },
    coverage: orderedCoverage(graph.coverage),
    nodes: [...graph.nodes].sort(compareNodes).map(orderedNode),
    edges: [...graph.edges].sort(compareEdges).map(edge => ordered(edge as unknown as Record<string, unknown>, EDGE_ORDER))
  }
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
  for (const key of ['nodes', 'edges'] as const) {
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
    yield canonical.extensions !== undefined || key === 'nodes' ? ',\n' : '\n'
  }
  if (canonical.extensions !== undefined) yield `  "extensions": ${indent(JSON.stringify(canonical.extensions, null, 2), 2)}\n`
  yield '}\n'
}

export function serializeGraph(graph: Graph): string {
  return Array.from(graphChunks(graph)).join('')
}
