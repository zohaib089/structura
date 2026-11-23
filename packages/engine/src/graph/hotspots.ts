/**
 * Per-file hotspot scores for graph.json v1.2.0.
 *
 * Each file gets an integer 0–100 score: a weighted sum of min–max
 * normalised signals the engine already has (no git history):
 *
 *   score = round(100 * (
 *     3*fanIn + 3*impact + 2*findings + 1*fanOut + 1*size
 *   ) / 10)
 *
 * where each name above is value / max(value) across files in this graph
 * (0 if that maximum is 0).
 *
 *   fanIn    — unique files that import or reexport this file
 *   fanOut   — unique files this file imports or reexports
 *   impact   — unique files reachable within walkFileImpact's default
 *              depth (3) via imports/reexports in either direction
 *   findings — architecture findings whose `file` path matches this file
 *   size     — function-symbol count when greater than 0, otherwise
 *              `lineCount` (or 0 if the file was not read)
 *
 * Git churn is omitted: it needs a repository and is not always available
 * offline. Files with score 0 omit the `hotspot` field. The graph-level
 * `hotspots` list is the top 10 (by score, then path) with a plain-English
 * `why`.
 */
import { graphEmitsMessageCodes, messageFields } from './message-codes.js'
import { IMPACT_DEFAULT_DEPTH } from './impact.js'
import { compareStrings } from './ids.js'
import type { FileNode, Graph, GraphHotspot, GraphNode } from './types.js'

export const HOTSPOTS_DEFAULT_LIMIT = 10

const WEIGHTS = {
  fanIn: 3,
  impact: 3,
  findings: 2,
  fanOut: 1,
  size: 1
} as const

const WEIGHT_TOTAL = WEIGHTS.fanIn + WEIGHTS.impact + WEIGHTS.findings + WEIGHTS.fanOut + WEIGHTS.size

const IMPORT_TYPES = new Set(['imports', 'reexports'])

export interface FileHotspotSignals {
  fanIn: number
  fanOut: number
  impact: number
  findings: number
  size: number
  sizeKind: 'functions' | 'lines' | 'none'
}

function isFile(node: GraphNode | undefined): node is FileNode {
  return node?.kind === 'file'
}

function neighbourhoods(graph: Graph): {
  incoming: Map<string, Set<string>>
  outgoing: Map<string, Set<string>>
} {
  const incoming = new Map<string, Set<string>>()
  const outgoing = new Map<string, Set<string>>()
  const ensure = (map: Map<string, Set<string>>, id: string): Set<string> => {
    const existing = map.get(id)
    if (existing) return existing
    const created = new Set<string>()
    map.set(id, created)
    return created
  }
  const nodesById = new Map(graph.nodes.map(node => [node.id, node]))
  for (const edge of graph.edges) {
    if (!IMPORT_TYPES.has(edge.type)) continue
    const source = nodesById.get(edge.source)
    const target = nodesById.get(edge.target)
    if (!isFile(source) || !isFile(target) || source.id === target.id) continue
    ensure(outgoing, source.id).add(target.id)
    ensure(incoming, target.id).add(source.id)
  }
  return { incoming, outgoing }
}

function reachable(start: string, adj: Map<string, Set<string>>, depthLimit: number): Set<string> {
  const seen = new Set<string>()
  let frontier = [start]
  for (let depth = 1; depth <= depthLimit && frontier.length > 0; depth += 1) {
    const next: string[] = []
    for (const id of frontier) {
      for (const peer of adj.get(id) ?? []) {
        if (peer === start || seen.has(peer)) continue
        seen.add(peer)
        next.push(peer)
      }
    }
    frontier = next
  }
  return seen
}

function sizeOf(file: FileNode, functionCounts: Map<string, number>): { size: number; sizeKind: FileHotspotSignals['sizeKind'] } {
  const functions = functionCounts.get(file.id) ?? 0
  if (functions > 0) return { size: functions, sizeKind: 'functions' }
  if (file.lineCount !== null && file.lineCount > 0) return { size: file.lineCount, sizeKind: 'lines' }
  return { size: 0, sizeKind: 'none' }
}

function findingsFor(graph: Graph): Map<string, number> {
  const counts = new Map<string, number>()
  for (const finding of graph.architecture?.findings ?? []) {
    counts.set(finding.file, (counts.get(finding.file) ?? 0) + 1)
  }
  return counts
}

function functionCounts(graph: Graph): Map<string, number> {
  const counts = new Map<string, number>()
  for (const node of graph.nodes) {
    if (node.kind !== 'symbol' || node.symbolKind !== 'function') continue
    counts.set(node.file, (counts.get(node.file) ?? 0) + 1)
  }
  return counts
}

function normalise(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0
  return value / max
}

function scoreOf(signals: FileHotspotSignals, maxima: Omit<FileHotspotSignals, 'sizeKind'>): number {
  const weighted =
    WEIGHTS.fanIn * normalise(signals.fanIn, maxima.fanIn) +
    WEIGHTS.impact * normalise(signals.impact, maxima.impact) +
    WEIGHTS.findings * normalise(signals.findings, maxima.findings) +
    WEIGHTS.fanOut * normalise(signals.fanOut, maxima.fanOut) +
    WEIGHTS.size * normalise(signals.size, maxima.size)
  return Math.max(0, Math.min(100, Math.round((100 * weighted) / WEIGHT_TOTAL)))
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function describeHotspot(signals: FileHotspotSignals): string {
  return describeHotspotMessage(signals).why
}

/** Plain-English `why` plus the structured `hotspot.why` message. */
export function describeHotspotMessage(signals: FileHotspotSignals): {
  why: string
  code: 'hotspot.why'
  params: import('./message-codes.js').MessageParams
} {
  const parts: string[] = []
  const params: import('./message-codes.js').MessageParams = {}
  if (signals.fanIn > 0) {
    parts.push(`Used by ${plural(signals.fanIn, 'file')}`)
    params.fanIn = signals.fanIn
  }
  if (signals.fanOut > 0) {
    parts.push(`imports ${plural(signals.fanOut, 'file')}`)
    params.fanOut = signals.fanOut
  }
  if (signals.impact > 0) {
    parts.push(`impacts ${plural(signals.impact, 'file')}`)
    params.impact = signals.impact
  }
  if (signals.findings > 0) {
    parts.push(`has ${plural(signals.findings, 'finding')}`)
    params.findings = signals.findings
  }
  if (signals.sizeKind === 'functions' && signals.size > 0) {
    parts.push(`has ${plural(signals.size, 'function')}`)
    params.size = signals.size
    params.sizeKind = 'functions'
  } else if (signals.sizeKind === 'lines' && signals.size > 0) {
    parts.push(`has ${signals.size} lines`)
    params.size = signals.size
    params.sizeKind = 'lines'
  }
  const why = parts.length === 0
    ? 'No hotspot signals'
    : parts.length === 1
      ? parts[0]!
      : parts.length === 2
        ? `${parts[0]} and ${parts[1]}`
        : `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`
  return { why, code: 'hotspot.why', params }
}

export function collectFileHotspotSignals(graph: Graph): Map<string, FileHotspotSignals> {
  const { incoming, outgoing } = neighbourhoods(graph)
  const findingCounts = findingsFor(graph)
  const functions = functionCounts(graph)
  const signals = new Map<string, FileHotspotSignals>()
  for (const node of graph.nodes) {
    if (!isFile(node)) continue
    const fanIn = incoming.get(node.id)?.size ?? 0
    const fanOut = outgoing.get(node.id)?.size ?? 0
    const upstream = reachable(node.id, incoming, IMPACT_DEFAULT_DEPTH)
    const downstream = reachable(node.id, outgoing, IMPACT_DEFAULT_DEPTH)
    for (const id of downstream) upstream.add(id)
    const size = sizeOf(node, functions)
    signals.set(node.id, {
      fanIn,
      fanOut,
      impact: upstream.size,
      findings: findingCounts.get(node.path) ?? 0,
      size: size.size,
      sizeKind: size.sizeKind
    })
  }
  return signals
}

/**
 * Returns a copy of `graph` with optional per-file `hotspot` scores and a
 * top-N `hotspots` list. Does not mutate the input.
 */
export function attachHotspots(graph: Graph, limit = HOTSPOTS_DEFAULT_LIMIT): Graph {
  const signalsById = collectFileHotspotSignals(graph)
  const maxima = { fanIn: 0, fanOut: 0, impact: 0, findings: 0, size: 0 }
  for (const signals of signalsById.values()) {
    maxima.fanIn = Math.max(maxima.fanIn, signals.fanIn)
    maxima.fanOut = Math.max(maxima.fanOut, signals.fanOut)
    maxima.impact = Math.max(maxima.impact, signals.impact)
    maxima.findings = Math.max(maxima.findings, signals.findings)
    maxima.size = Math.max(maxima.size, signals.size)
  }

  const ranked: Array<{ node: FileNode; score: number; signals: FileHotspotSignals }> = []
  const nodes = graph.nodes.map(node => {
    if (!isFile(node)) return node
    const signals = signalsById.get(node.id)
    if (!signals) return node
    const score = scoreOf(signals, maxima)
    const { hotspot: _ignored, ...rest } = node
    void _ignored
    if (score <= 0) return rest as FileNode
    ranked.push({ node, score, signals })
    return { ...rest, hotspot: { score } } as FileNode
  })

  ranked.sort((left, right) => right.score - left.score || compareStrings(left.node.path, right.node.path))
  const cap = Number.isSafeInteger(limit) && limit > 0 ? limit : HOTSPOTS_DEFAULT_LIMIT
  const emitCodes = graphEmitsMessageCodes(graph.schemaVersion)
  const hotspots: GraphHotspot[] = ranked.slice(0, cap).map(item => {
    const message = describeHotspotMessage(item.signals)
    return {
      path: item.node.path,
      score: item.score,
      why: message.why,
      ...(emitCodes ? messageFields(message.code, message.params) : {})
    }
  })

  const next: Graph = { ...graph, nodes }
  if (hotspots.length > 0) next.hotspots = hotspots
  else delete next.hotspots
  return next
}
