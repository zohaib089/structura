import { compareEdges, compareNodes } from './canonical.js'
import { GRAPH_SCHEMA_VERSION, type Coverage, type Graph, type GraphEdge, type GraphNode, type SummaryEntryCandidates } from './types.js'

const IMPORT_KIND_RANK: Record<'static' | 'require' | 'dynamic', number> = { static: 0, require: 1, dynamic: 2 }

function edgeKey(edge: GraphEdge): string {
  const start = 'span' in edge ? edge.span.start : { line: 0, col: 0 }
  return `${edge.source}\u0000${edge.type}\u0000${edge.target}\u0000${start.line}\u0000${start.col}`
}

function mergeRefFlags(existing: GraphEdge, incoming: GraphEdge): GraphEdge {
  if (existing.type === 'contains') return existing
  const merged: GraphEdge = { ...existing }
  const existingKind = ('importKind' in existing && existing.importKind) ? existing.importKind : 'static'
  const incomingKind = ('importKind' in incoming && incoming.importKind) ? incoming.importKind : 'static'
  const kind = IMPORT_KIND_RANK[incomingKind] > IMPORT_KIND_RANK[existingKind] ? incomingKind : existingKind
  if (kind === 'static') delete (merged as { importKind?: string }).importKind
  else merged.importKind = kind
  const existingTypeOnly = 'typeOnly' in existing && existing.typeOnly === true
  const incomingTypeOnly = 'typeOnly' in incoming && incoming.typeOnly === true
  if (existingTypeOnly && incomingTypeOnly) merged.typeOnly = true
  else delete (merged as { typeOnly?: boolean }).typeOnly
  return merged
}

/**
 * Collects nodes and edges, enforces uniqueness (first writer wins for nodes; colliding
 * import/reexport keys merge `typeOnly` and `importKind`) and produces a sorted Graph with a correct `summary`.
 */
export class GraphBuilder {
  private readonly nodes = new Map<string, GraphNode>()
  private readonly edges = new Map<string, GraphEdge>()

  hasNode(id: string): boolean {
    return this.nodes.has(id)
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id)
  }

  /** @returns false when a node with that id already exists (the existing one is kept). */
  addNode(node: GraphNode): boolean {
    if (this.nodes.has(node.id)) return false
    this.nodes.set(node.id, node)
    return true
  }

  /** @returns false when an edge with the same key already exists (flags are merged onto the existing edge). */
  addEdge(edge: GraphEdge): boolean {
    const key = edgeKey(edge)
    const existing = this.edges.get(key)
    if (!existing) {
      this.edges.set(key, edge)
      return true
    }
    this.edges.set(key, mergeRefFlags(existing, edge))
    return false
  }

  build(coverage: Coverage, entryCandidates?: SummaryEntryCandidates): Graph {
    const nodes = [...this.nodes.values()].sort(compareNodes)
    const edges = [...this.edges.values()].sort(compareEdges)
    return {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      summary: {
        nodes: nodes.length,
        edges: edges.length,
        files: nodes.filter(node => node.kind === 'file').length,
        ...(entryCandidates ? { entryCandidates } : {})
      },
      coverage,
      nodes,
      edges
    }
  }
}
