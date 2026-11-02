import { compareEdges } from './canonical.js'
import { compareStrings } from './ids.js'
import { matchPathPattern } from './path-glob.js'
import { indexNodes, resolveNodeRef } from './resolve-ref.js'
import type { EdgeType, Graph, GraphEdge, GraphNode, NodeKind } from './types.js'
import { EDGE_TYPES, NODE_KINDS } from './types.js'

export interface QueryGraphOptions {
  kind?: NodeKind
  type?: EdgeType
  from?: string
  to?: string
  path?: string
  limit?: number
}

export type QueryGraphNodesResult = { mode: 'nodes'; nodes: GraphNode[] }
export type QueryGraphEdgesResult = { mode: 'edges'; edges: GraphEdge[] }
export type QueryGraphResult = QueryGraphNodesResult | QueryGraphEdgesResult

function positiveLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new QueryUsageError('--limit expects a positive integer')
  return limit
}

export class QueryUsageError extends Error {
  readonly exitCode = 2
  constructor(message: string) {
    super(message)
    this.name = 'QueryUsageError'
  }
}

function parseKind(value: string | undefined): NodeKind | undefined {
  if (value === undefined) return undefined
  if (!(NODE_KINDS as readonly string[]).includes(value)) {
    throw new QueryUsageError(`--kind must be one of: ${NODE_KINDS.join(', ')}`)
  }
  return value as NodeKind
}

function parseEdgeType(value: string | undefined): EdgeType | undefined {
  if (value === undefined) return undefined
  if (!(EDGE_TYPES as readonly string[]).includes(value)) {
    throw new QueryUsageError(`--type must be one of: ${EDGE_TYPES.join(', ')}`)
  }
  return value as EdgeType
}

export function queryGraph(graph: Graph, options: QueryGraphOptions = {}): QueryGraphResult {
  const kind = parseKind(options.kind)
  const type = parseEdgeType(options.type)
  const limit = positiveLimit(options.limit)
  const nodesById = indexNodes(graph)
  const edgeMode = type !== undefined || options.from !== undefined || options.to !== undefined
  if (edgeMode) {
    let edges = graph.edges.slice()
    if (type !== undefined) edges = edges.filter(edge => edge.type === type)
    if (options.from !== undefined) {
      const source = resolveNodeRef(graph, options.from, nodesById)
      edges = edges.filter(edge => edge.source === source)
    }
    if (options.to !== undefined) {
      const target = resolveNodeRef(graph, options.to, nodesById)
      edges = edges.filter(edge => edge.target === target)
    }
    edges.sort(compareEdges)
    if (limit !== undefined) edges = edges.slice(0, limit)
    return { mode: 'edges', edges }
  }
  let nodes = graph.nodes.slice()
  if (kind !== undefined) nodes = nodes.filter(node => node.kind === kind)
  if (options.path !== undefined) nodes = nodes.filter(node => nodePath(node) !== undefined && matchPathPattern(nodePath(node) as string, options.path as string))
  nodes.sort((left, right) => compareStrings(left.id, right.id))
  if (limit !== undefined) nodes = nodes.slice(0, limit)
  return { mode: 'nodes', nodes }
}

function nodePath(node: GraphNode): string | undefined {
  if (node.kind === 'directory' || node.kind === 'file') return node.path
  return undefined
}
