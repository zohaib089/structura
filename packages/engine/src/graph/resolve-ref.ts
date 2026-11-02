import { compareStrings, dirId, fileId, isRepresentablePath, symbolId } from './ids.js'
import type { Graph, GraphNode } from './types.js'

export class GraphNodeNotFoundError extends Error {
  readonly exitCode = 2
  constructor(readonly ref: string) {
    super(`unknown node "${ref}"`)
    this.name = 'GraphNodeNotFoundError'
  }
}

export function indexNodes(graph: Graph): Map<string, GraphNode> {
  return new Map(graph.nodes.map(node => [node.id, node]))
}

/**
 * Resolves a CLI reference (node id or repo-relative path) to a graph node id.
 */
export function resolveNodeRef(graph: Graph, ref: string, nodesById = indexNodes(graph)): string {
  if (nodesById.has(ref)) return ref
  const candidates: string[] = []
  if (ref.includes('#')) {
    const hash = ref.indexOf('#')
    const filePath = ref.slice(0, hash)
    const name = ref.slice(hash + 1)
    if (isRepresentablePath(filePath) && name.length > 0) candidates.push(symbolId(filePath, name))
  }
  if (isRepresentablePath(ref, ref === '.')) candidates.push(dirId(ref))
  if (isRepresentablePath(ref)) candidates.push(fileId(ref))
  for (const id of candidates.sort(compareStrings)) {
    if (nodesById.has(id)) return id
  }
  throw new GraphNodeNotFoundError(ref)
}
