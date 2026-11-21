import {
  IMPACT_DEFAULT_DEPTH,
  compareStrings,
  fileId,
  indexNodes,
  walkFileImpact,
  type Graph
} from '@atlasmith/engine'

/** One file that depends on the target, as impact_lite reports it. */
export interface ImpactDependent {
  path: string
  fileId: string
  depth: number
}

/** Downstream dependents of a file, ready to send to the graph webview. */
export interface ImpactAlert {
  targetPath: string
  targetFileId: string
  dependents: ImpactDependent[]
  truncated: boolean
  depthLimit: number
}

const DEFAULT_RESULT_LIMIT = 50

/** Resolve a repo-relative path to a file node id, or undefined if it is not in the graph. */
export function fileIdForPath(graph: Graph, relativePath: string): string | undefined {
  const path = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!path) return undefined
  const nodesById = indexNodes(graph)
  const direct = fileId(path)
  const directNode = nodesById.get(direct)
  if (directNode?.kind === 'file') return direct
  for (const node of graph.nodes) {
    if (node.kind === 'file' && node.path === path) return node.id
  }
  return undefined
}

/**
 * Same walk as the CLI's impact_lite tool: files that import (or re-export) the target,
 * up to the default depth of 3, capped at 50 rows.
 */
export function buildImpactAlert(
  graph: Graph,
  relativePath: string,
  options?: { depthLimit?: number; resultLimit?: number }
): ImpactAlert | null {
  const startId = fileIdForPath(graph, relativePath)
  if (!startId) return null
  const node = indexNodes(graph).get(startId)
  if (node?.kind !== 'file') return null
  const depthLimit = options?.depthLimit ?? IMPACT_DEFAULT_DEPTH
  const resultLimit = options?.resultLimit ?? DEFAULT_RESULT_LIMIT
  const walk = walkFileImpact(graph, startId, 'downstream', { depthLimit, resultLimit })
  const nodesById = indexNodes(graph)
  const dependents: ImpactDependent[] = []
  for (const entry of walk.paths) {
    const leafId = entry.nodes.at(-1)
    if (!leafId) continue
    const leaf = nodesById.get(leafId)
    if (leaf?.kind !== 'file') continue
    dependents.push({ path: leaf.path, fileId: leafId, depth: entry.depth })
  }
  dependents.sort((left, right) => left.depth - right.depth || compareStrings(left.path, right.path))
  return {
    targetPath: node.path,
    targetFileId: startId,
    dependents,
    truncated: walk.truncated,
    depthLimit
  }
}
