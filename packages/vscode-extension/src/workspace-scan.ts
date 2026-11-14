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
  toGraphPayload
}
