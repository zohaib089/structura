import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { queryGraph, scanRepository, type Graph, type ScanOutput } from '@atlasmith/engine'
import type { GraphPayload } from './protocol.js'

export interface ScanRequest {
  root: string
  outDir?: string
  signal?: AbortSignal
}

export interface FileLookup {
  found: boolean
  path: string
}

export interface Scanner {
  scan(request: ScanRequest): Promise<ScanOutput>
  fileInGraph(graph: Graph, relativePath: string): FileLookup
  toGraphPayload(graph: Graph): GraphPayload
  chooseProjectFocus(graph: Graph): string | null
}

export function toGraphPayload(graph: Graph): GraphPayload {
  return {
    schemaVersion: graph.schemaVersion,
    summary: {
      nodes: graph.summary.nodes,
      edges: graph.summary.edges,
      files: graph.summary.files
    },
    coverage: graph.coverage,
    nodes: graph.nodes,
    edges: graph.edges,
    architecture: graph.architecture
  }
}

export function fileInGraph(graph: Graph, relativePath: string): FileLookup {
  const path = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!path) return { found: false, path }
  try {
    const result = queryGraph(graph, { kind: 'file', path })
    if (result.mode === 'nodes' && result.nodes.length > 0) return { found: true, path }
  } catch {
    // queryGraph throws on bad options; treat as not found.
  }
  const exact = graph.nodes.some(
    (node) => node.kind === 'file' && 'path' in node && node.path === path
  )
  return { found: exact, path }
}

export async function createScanOutDir(preferred?: string): Promise<string> {
  if (preferred) {
    await mkdir(preferred, { recursive: true })
    return preferred
  }
  return mkdtemp(join(tmpdir(), 'atlasmith-scan-'))
}

/**
 * Pick a file to nucleate the whole-project graph: the file with the most
 * non-contains edges (imports and similar). This is a local heuristic so the
 * first official "entry candidate" is not a tiny package-script.
 */
export function chooseProjectFocus(graph: Graph): string | null {
  const filePathById = new Map<string, string>()
  for (const node of graph.nodes) {
    if (node.kind === 'file' && 'path' in node) filePathById.set(node.id, node.path)
    else if (node.kind === 'symbol' && 'file' in node) filePathById.set(node.id, node.file)
  }
  const degree = new Map<string, number>()
  for (const edge of graph.edges) {
    if (edge.type === 'contains') continue
    for (const end of [edge.source, edge.target] as const) {
      const path = filePathById.get(end)
      if (!path) continue
      degree.set(path, (degree.get(path) ?? 0) + 1)
    }
  }
  let best: string | null = null
  let bestScore = -1
  for (const [path, score] of degree) {
    if (score > bestScore || (score === bestScore && best !== null && path < best)) {
      best = path
      bestScore = score
    }
  }
  if (best) return best
  const firstFile = graph.nodes.find((node) => node.kind === 'file' && 'path' in node)
  return firstFile && 'path' in firstFile ? firstFile.path : null
}

export const engineScanner: Scanner = {
  async scan(request: ScanRequest): Promise<ScanOutput> {
    const outDir = await createScanOutDir(request.outDir)
    return scanRepository(request.root, {
      outDir,
      metaPath: null,
      signal: request.signal
    })
  },
  fileInGraph,
  toGraphPayload,
  chooseProjectFocus
}
