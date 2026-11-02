import type { GraphDocument, GraphNode } from '../viewer/graph-types'
import { indexGraph, type GraphIndex } from '../viewer/overview'

export interface RankedModule {
  id: string
  label: string
  count: number
}

export interface DashboardGraphStats {
  files: number
  modules: number
  edges: number
  extractedEdges: number
  inferredEdges: number
  topFanIn: RankedModule[]
  topFanOut: RankedModule[]
  languages: GraphDocument['coverage']['byLanguage']
  entryPoints: Array<{ path: string; reason: string; provenance: string }>
}

const TOP_MODULE_LIMIT = 10

export function computeDashboardGraphStats(document: GraphDocument): DashboardGraphStats {
  const index = indexGraph(document)
  const dependencyEdges = document.edges.filter((edge) => edge.type !== 'contains')
  let extractedEdges = 0
  let inferredEdges = 0
  for (const edge of dependencyEdges) {
    if (edge.provenance === 'INFERRED') inferredEdges += 1
    else extractedEdges += 1
  }

  const fanIn = new Map<string, number>()
  const fanOut = new Map<string, number>()
  for (const edge of dependencyEdges) {
    const sourceModule = moduleForNode(index, edge.source)
    const targetModule = moduleForNode(index, edge.target)
    if (sourceModule && targetModule && sourceModule !== targetModule) {
      fanOut.set(sourceModule, (fanOut.get(sourceModule) ?? 0) + 1)
      fanIn.set(targetModule, (fanIn.get(targetModule) ?? 0) + 1)
    }
  }

  const modules = document.nodes.filter(
    (node) => node.kind === 'directory' && node.id !== 'dir:.'
  ).length

  const entryPoints = document.nodes.flatMap((node) => {
    if (node.kind !== 'file' || !('entryCandidate' in node) || !node.entryCandidate || !('path' in node)) return []
    return [{
      path: node.path,
      reason: node.entryCandidate.reason,
      provenance: node.entryCandidate.provenance
    }]
  })

  return {
    files: document.summary.files,
    modules,
    edges: dependencyEdges.length,
    extractedEdges,
    inferredEdges,
    topFanIn: topModules(fanIn, index),
    topFanOut: topModules(fanOut, index),
    languages: document.coverage.byLanguage,
    entryPoints
  }
}

function moduleForNode(index: GraphIndex, nodeId: string): string | null {
  let current: string | undefined = nodeId
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    const node = index.nodesById.get(current)
    if (node?.kind === 'directory' && node.id !== 'dir:.') return node.id
    current = index.parentOf.get(current)
  }
  return null
}

function topModules(counts: Map<string, number>, index: GraphIndex): RankedModule[] {
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: moduleLabel(index.nodesById.get(id)), count }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
    .slice(0, TOP_MODULE_LIMIT)
}

function moduleLabel(node: GraphNode | undefined): string {
  if (!node) return ''
  if (node.kind === 'directory' && 'path' in node) return node.path
  return node.label
}
