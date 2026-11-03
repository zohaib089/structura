import { compareStrings, fileId } from './ids.js'
import { GraphNodeNotFoundError, indexNodes, resolveNodeRef } from './resolve-ref.js'
import type { Graph, GraphEdge, GraphNode, Provenance } from './types.js'

export const IMPACT_DEFAULT_DEPTH = 3
export const IMPACT_MAX_DEPTH = 16

const IMPORT_TYPES = new Set(['imports', 'reexports'])

export class ImpactTargetNotFoundError extends Error {
  readonly exitCode = 2
  constructor(readonly ref: string) {
    super(`unknown impact target "${ref}"`)
    this.name = 'ImpactTargetNotFoundError'
  }
}

export class ImpactTargetAmbiguousError extends Error {
  readonly exitCode = 2
  constructor(
    readonly ref: string,
    readonly candidates: readonly ImpactTargetCandidate[]
  ) {
    const lines = candidates.map(candidate => `  ${candidate.id}  ${candidate.filePath ?? candidate.path ?? candidate.label}`)
    super(`ambiguous impact target "${ref}":\n${lines.join('\n')}`)
    this.name = 'ImpactTargetAmbiguousError'
  }
}

export class ImpactUsageError extends Error {
  readonly exitCode = 2
  constructor(message: string) {
    super(message)
    this.name = 'ImpactUsageError'
  }
}

export interface ImpactTargetCandidate {
  id: string
  kind: GraphNode['kind']
  label: string
  path?: string
  filePath?: string
}

export interface ImpactTarget {
  id: string
  kind: 'file' | 'symbol'
  label: string
  path?: string
  file?: string
  filePath?: string
}

export interface ImpactPathEdge {
  source: string
  target: string
  type: 'imports' | 'reexports'
  provenance: Provenance
  confidence?: number
  reason?: string
}

export interface ImpactPath {
  depth: number
  nodes: string[]
  edges: ImpactPathEdge[]
  status: 'EXTRACTED' | 'INFERRED'
}

export interface GraphImpactResult {
  target: ImpactTarget
  depthLimit: number
  upstream: ImpactPath[]
  downstream: ImpactPath[]
}

export interface WalkFileImpactOptions {
  depthLimit?: number
  resultLimit?: number
}

export interface WalkFileImpactResult {
  depthLimit: number
  truncated: boolean
  paths: ImpactPath[]
}

function positiveDepth(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new ImpactUsageError('depth expects a positive integer')
  }
  if (value > IMPACT_MAX_DEPTH) {
    throw new ImpactUsageError(`depth must be at most ${IMPACT_MAX_DEPTH}`)
  }
  return value
}

function nodePathLabel(node: GraphNode | undefined): string | undefined {
  if (!node) return undefined
  if (node.kind === 'file' || node.kind === 'directory') return node.path
  if (node.kind === 'external') return node.label
  if (node.kind === 'unresolved') return node.label
  return undefined
}

function targetFromNode(graph: Graph, id: string, nodesById: Map<string, GraphNode>): ImpactTarget {
  const node = nodesById.get(id)
  if (!node) throw new ImpactTargetNotFoundError(id)
  if (node.kind === 'file') {
    return { id, kind: 'file', label: node.label, path: node.path }
  }
  if (node.kind === 'symbol') {
    const fileNode = nodesById.get(node.file)
    const filePath = fileNode?.kind === 'file' ? fileNode.path : undefined
    return {
      id,
      kind: 'symbol',
      label: node.label,
      file: node.file,
      filePath
    }
  }
  throw new ImpactUsageError(`impact target must be a file or symbol, not ${node.kind}`)
}

export function resolveImpactTarget(graph: Graph, ref: string): ImpactTarget {
  const nodesById = indexNodes(graph)
  if (nodesById.has(ref)) {
    return targetFromNode(graph, ref, nodesById)
  }
  try {
    const id = resolveNodeRef(graph, ref, nodesById)
    return targetFromNode(graph, id, nodesById)
  } catch (error) {
    if (!(error instanceof GraphNodeNotFoundError)) throw error
  }
  const matches: ImpactTargetCandidate[] = []
  for (const node of graph.nodes) {
    if (node.kind !== 'symbol' || node.label !== ref) continue
    const fileNode = nodesById.get(node.file)
    const filePath = fileNode?.kind === 'file' ? fileNode.path : node.file
    matches.push({
      id: node.id,
      kind: 'symbol',
      label: node.label,
      filePath
    })
  }
  matches.sort((left, right) => compareStrings(left.id, right.id))
  if (matches.length === 1) return targetFromNode(graph, matches[0]!.id, nodesById)
  if (matches.length > 1) throw new ImpactTargetAmbiguousError(ref, matches)
  throw new ImpactTargetNotFoundError(ref)
}

function traversalFileId(target: ImpactTarget): string {
  if (target.kind === 'file') return target.id
  return target.file ?? fileId('')
}

function edgeSummary(edge: GraphEdge): ImpactPathEdge {
  const base: ImpactPathEdge = {
    source: edge.source,
    target: edge.target,
    type: edge.type as 'imports' | 'reexports',
    provenance: edge.provenance
  }
  if (edge.provenance === 'INFERRED') {
    base.confidence = edge.confidence
    base.reason = edge.reason
  }
  return base
}

function pathStatus(edges: readonly ImpactPathEdge[]): 'EXTRACTED' | 'INFERRED' {
  return edges.some(edge => edge.provenance === 'INFERRED') ? 'INFERRED' : 'EXTRACTED'
}

function compareImpactPaths(left: ImpactPath, right: ImpactPath): number {
  if (left.depth !== right.depth) return left.depth - right.depth
  const leftKey = left.nodes.join('\0')
  const rightKey = right.nodes.join('\0')
  return compareStrings(leftKey, rightKey)
}

function buildPath(
  startId: string,
  endId: string,
  parent: Map<string, { prev: string; edge: GraphEdge }>,
  depth: number
): ImpactPath {
  const nodes: string[] = [endId]
  const edges: ImpactPathEdge[] = []
  let cursor = endId
  while (cursor !== startId) {
    const link = parent.get(cursor)
    if (!link) break
    edges.unshift(edgeSummary(link.edge))
    nodes.unshift(link.prev)
    cursor = link.prev
  }
  return {
    depth,
    nodes,
    edges,
    status: pathStatus(edges)
  }
}

function importEdgesFor(graph: Graph): GraphEdge[] {
  return graph.edges.filter(edge => IMPORT_TYPES.has(edge.type))
}

export function walkFileImpact(
  graph: Graph,
  startFileId: string,
  direction: 'upstream' | 'downstream',
  options?: WalkFileImpactOptions
): WalkFileImpactResult {
  const depthMax = positiveDepth(options?.depthLimit, IMPACT_DEFAULT_DEPTH)
  const resultLimit = options?.resultLimit
  const nodesById = indexNodes(graph)
  const start = nodesById.get(startFileId)
  if (start?.kind !== 'file') throw new ImpactUsageError(`"${startFileId}" is not a file node`)

  const edges = importEdgesFor(graph)
  const seen = new Set<string>([startFileId])
  const parent = new Map<string, { prev: string; edge: GraphEdge }>()
  const paths: ImpactPath[] = []
  let frontier = [startFileId]
  let truncated = false

  for (let depth = 1; depth <= depthMax && frontier.length > 0; depth += 1) {
    const next: string[] = []
    const layer = [...frontier].sort(compareStrings)
    for (const currentId of layer) {
      const stepEdges = edges.filter(edge => {
        if (direction === 'upstream') return edge.source === currentId
        return edge.target === currentId
      })
      stepEdges.sort((left, right) => {
        const leftPeer = direction === 'upstream' ? left.target : left.source
        const rightPeer = direction === 'upstream' ? right.target : right.source
        return compareStrings(leftPeer, rightPeer)
          || compareStrings(left.type, right.type)
          || compareStrings(left.source, right.source)
          || compareStrings(left.target, right.target)
      })
      for (const edge of stepEdges) {
        const peerId = direction === 'upstream' ? edge.target : edge.source
        if (seen.has(peerId)) continue
        seen.add(peerId)
        parent.set(peerId, { prev: currentId, edge })
        paths.push(buildPath(startFileId, peerId, parent, depth))
        if (resultLimit !== undefined && paths.length >= resultLimit) {
          truncated = true
          break
        }
        const peer = nodesById.get(peerId)
        if (peer?.kind === 'file') next.push(peerId)
      }
      if (truncated) break
    }
    if (truncated) break
    frontier = next
  }

  paths.sort(compareImpactPaths)
  return { depthLimit: depthMax, truncated, paths }
}

export function graphImpact(graph: Graph, ref: string, options?: { depth?: number }): GraphImpactResult {
  const target = resolveImpactTarget(graph, ref)
  const depthLimit = positiveDepth(options?.depth, IMPACT_DEFAULT_DEPTH)
  const fileIdForWalk = traversalFileId(target)
  const upstream = walkFileImpact(graph, fileIdForWalk, 'upstream', { depthLimit }).paths
  const downstream = walkFileImpact(graph, fileIdForWalk, 'downstream', { depthLimit }).paths
  return { target, depthLimit, upstream, downstream }
}

/** Format a node id as a human path label for CLI output. */
export function impactNodeLabel(graph: Graph, nodeId: string): string {
  const node = indexNodes(graph).get(nodeId)
  return nodePathLabel(node) ?? nodeId
}
