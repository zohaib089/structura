import { compareStrings } from './ids.js'
import { indexNodes, resolveNodeRef } from './resolve-ref.js'
import type {
  EdgeType,
  EntryCandidate,
  Graph,
  GraphEdge,
  GraphNode,
  ParseInfo,
  Provenance,
  Span,
  UnresolvedReason
} from './types.js'
import { EDGE_TYPES } from './types.js'

export interface ExplainedEdge {
  peer: string
  direction: 'in' | 'out'
  provenance: Provenance
  confidence?: number
  reason?: string
  specifier?: string
  span?: Span
}

export interface ExplainNodeResult {
  id: string
  kind: GraphNode['kind']
  label: string
  path?: string
  file?: string
  span?: Span
  symbolKind?: string
  exported?: boolean
  ecosystem?: string
  entryCandidate?: EntryCandidate
  unresolvedReason?: UnresolvedReason
  coverage?: ParseInfo
  inbound: Partial<Record<EdgeType, ExplainedEdge[]>>
  outbound: Partial<Record<EdgeType, ExplainedEdge[]>>
}

export function explainGraphNode(graph: Graph, ref: string): ExplainNodeResult {
  const nodesById = indexNodes(graph)
  const id = resolveNodeRef(graph, ref, nodesById)
  const node = nodesById.get(id) as GraphNode
  const inbound = groupEdges(graph.edges.filter(edge => edge.target === id), 'in')
  const outbound = groupEdges(graph.edges.filter(edge => edge.source === id), 'out')
  const base: ExplainNodeResult = {
    id,
    kind: node.kind,
    label: node.label,
    inbound,
    outbound
  }
  if (node.kind === 'directory' || node.kind === 'file') base.path = node.path
  if (node.kind === 'file') {
    base.coverage = node.parse
    if (node.entryCandidate) base.entryCandidate = node.entryCandidate
  }
  if (node.kind === 'symbol') {
    base.file = node.file
    base.span = node.span
    base.symbolKind = node.symbolKind
    base.exported = node.exported
    base.coverage = fileCoverage(graph, node.file, nodesById)
  }
  if (node.kind === 'external') base.ecosystem = node.ecosystem
  if (node.kind === 'unresolved') base.unresolvedReason = node.reason
  return base
}

function fileCoverage(graph: Graph, fileId: string, nodesById: Map<string, GraphNode>): ParseInfo | undefined {
  const file = nodesById.get(fileId)
  return file?.kind === 'file' ? file.parse : undefined
}

function groupEdges(edges: GraphEdge[], direction: 'in' | 'out'): Partial<Record<EdgeType, ExplainedEdge[]>> {
  const grouped: Partial<Record<EdgeType, ExplainedEdge[]>> = {}
  for (const type of EDGE_TYPES) {
    const list = edges
      .filter(edge => edge.type === type)
      .map(edge => explainedEdge(edge, direction))
      .sort((left, right) => compareStrings(left.peer, right.peer))
    if (list.length > 0) grouped[type] = list
  }
  return grouped
}

function explainedEdge(edge: GraphEdge, direction: 'in' | 'out'): ExplainedEdge {
  const peer = direction === 'in' ? edge.source : edge.target
  const base: ExplainedEdge = { peer, direction, provenance: edge.provenance }
  if ('span' in edge) base.span = edge.span
  if ('specifier' in edge) base.specifier = edge.specifier
  if (edge.provenance === 'INFERRED') {
    base.confidence = edge.confidence
    base.reason = edge.reason
  }
  return base
}
