import { compareEdges, compareNodes } from './canonical.js'
import { GRAPH_SCHEMA_VERSION, type Coverage, type Graph, type GraphEdge, type GraphNode } from './types.js'

/**
 * Collects nodes and edges, enforces uniqueness (first writer wins for nodes; an identical
 * edge key is ignored) and produces a sorted Graph with a correct `summary`.
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

  /** @returns false when an edge with the same (source, type, target, start line, start col) exists. */
  addEdge(edge: GraphEdge): boolean {
    const start = 'span' in edge ? edge.span.start : { line: 0, col: 0 }
    const key = `${edge.source}\u0000${edge.type}\u0000${edge.target}\u0000${start.line}\u0000${start.col}`
    if (this.edges.has(key)) return false
    this.edges.set(key, edge)
    return true
  }

  build(coverage: Coverage): Graph {
    const nodes = [...this.nodes.values()].sort(compareNodes)
    const edges = [...this.edges.values()].sort(compareEdges)
    return {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      summary: { nodes: nodes.length, edges: edges.length, files: nodes.filter(node => node.kind === 'file').length },
      coverage,
      nodes,
      edges
    }
  }
}
