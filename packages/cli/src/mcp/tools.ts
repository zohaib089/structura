import {
  GraphNodeNotFoundError,
  compareStrings,
  fileId,
  indexNodes,
  resolveNodeRef,
  type ArchitectureFinding,
  type ArchitectureModuleDecl,
  type Graph,
  type GraphEdge,
  type GraphNode,
  type Provenance,
  type SymbolNode
} from '@atlasmith/engine'

export class McpToolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'McpToolError'
  }
}

export interface ListedModule {
  name: string
  paths: readonly string[]
  allow?: readonly string[]
  deny?: readonly string[]
  policy?: ArchitectureModuleDecl['policy']
  fileCount: number
}

export interface ListModulesResult {
  modules: ListedModule[]
  unassigned: string[]
}

export interface FileDepEdge {
  peerId: string
  peerPath?: string
  type: 'imports' | 'reexports'
  direction: 'out' | 'in'
  provenance: Provenance
  confidence?: number
  reason?: string
  specifier?: string
}

export interface FileDepsResult {
  file: string
  fileId: string
  imports: FileDepEdge[]
  importers: FileDepEdge[]
}

export interface SymbolMatch {
  id: string
  label: string
  symbolKind: string
  exported: boolean
  file: string
  filePath: string
  span: SymbolNode['span']
}

export interface ImpactFile {
  path: string
  fileId: string
  depth: number
}

export interface ImpactLiteResult {
  file: string
  fileId: string
  depthLimit: number
  limit: number
  truncated: boolean
  dependents: ImpactFile[]
}

const IMPORT_TYPES = new Set(['imports', 'reexports'])

function filePathForNode(node: GraphNode | undefined): string | undefined {
  if (node?.kind === 'file') return node.path
  if (node?.kind === 'external') return undefined
  return undefined
}

function resolveFileRef(graph: Graph, ref: string): { id: string; path: string } {
  const nodesById = indexNodes(graph)
  const id = resolveNodeRef(graph, ref, nodesById)
  const node = nodesById.get(id)
  if (node?.kind !== 'file') throw new McpToolError(`"${ref}" is not a file node`)
  return { id, path: node.path }
}

function positiveInt(value: unknown, name: string, fallback: number): number {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new McpToolError(`${name} expects a positive integer`)
  }
  return value
}

function edgeToFileDep(
  edge: GraphEdge,
  direction: 'out' | 'in',
  nodesById: Map<string, GraphNode>
): FileDepEdge | undefined {
  if (!IMPORT_TYPES.has(edge.type)) return undefined
  const peerId = direction === 'out' ? edge.target : edge.source
  const peer = nodesById.get(peerId)
  const base: FileDepEdge = {
    peerId,
    peerPath: filePathForNode(peer),
    type: edge.type as 'imports' | 'reexports',
    direction,
    provenance: edge.provenance
  }
  if (edge.provenance === 'INFERRED') {
    base.confidence = edge.confidence
    base.reason = edge.reason
  }
  if ('specifier' in edge) base.specifier = edge.specifier
  return base
}

export function listModules(graph: Graph): ListModulesResult {
  const architecture = graph.architecture
  if (!architecture) return { modules: [], unassigned: [] }
  const counts = new Map<string, number>()
  for (const node of graph.nodes) {
    if (node.kind !== 'file' || !node.module) continue
    counts.set(node.module, (counts.get(node.module) ?? 0) + 1)
  }
  const modules = architecture.modules.map(mod => ({
    name: mod.name,
    paths: mod.paths,
    ...(mod.allow ? { allow: mod.allow } : {}),
    ...(mod.deny ? { deny: mod.deny } : {}),
    ...(mod.policy ? { policy: mod.policy } : {}),
    fileCount: counts.get(mod.name) ?? 0
  }))
  return { modules, unassigned: [...architecture.unassigned] }
}

export function fileDeps(graph: Graph, fileRef: string): FileDepsResult {
  const { id, path } = resolveFileRef(graph, fileRef)
  const nodesById = indexNodes(graph)
  const imports: FileDepEdge[] = []
  const importers: FileDepEdge[] = []
  for (const edge of graph.edges) {
    if (!IMPORT_TYPES.has(edge.type)) continue
    if (edge.source === id) {
      const mapped = edgeToFileDep(edge, 'out', nodesById)
      if (mapped) imports.push(mapped)
    }
    if (edge.target === id) {
      const mapped = edgeToFileDep(edge, 'in', nodesById)
      if (mapped) importers.push(mapped)
    }
  }
  imports.sort((left, right) => compareStrings(left.peerId, right.peerId))
  importers.sort((left, right) => compareStrings(left.peerId, right.peerId))
  return { file: path, fileId: id, imports, importers }
}

export function symbolLookup(graph: Graph, name: string, limit?: number): SymbolMatch[] {
  if (typeof name !== 'string' || name.length === 0) throw new McpToolError('name is required')
  const max = positiveInt(limit, 'limit', 50)
  const nodesById = indexNodes(graph)
  const matches: SymbolMatch[] = []
  for (const node of graph.nodes) {
    if (node.kind !== 'symbol') continue
    if (node.label !== name) continue
    const fileNode = nodesById.get(node.file)
    const filePath = fileNode?.kind === 'file' ? fileNode.path : node.file
    matches.push({
      id: node.id,
      label: node.label,
      symbolKind: node.symbolKind,
      exported: node.exported,
      file: node.file,
      filePath,
      span: node.span
    })
    if (matches.length >= max) break
  }
  matches.sort((left, right) => compareStrings(left.id, right.id))
  return matches
}

export function architectureFindings(graph: Graph): ArchitectureFinding[] {
  return graph.architecture?.findings ? [...graph.architecture.findings] : []
}

export function impactLite(
  graph: Graph,
  fileRef: string,
  depthLimit?: number,
  limit?: number
): ImpactLiteResult {
  const { id, path } = resolveFileRef(graph, fileRef)
  const depthMax = positiveInt(depthLimit, 'depth', 3)
  const resultLimit = positiveInt(limit, 'limit', 50)
  const nodesById = indexNodes(graph)
  const importersOf = new Map<string, string[]>()
  for (const edge of graph.edges) {
    if (!IMPORT_TYPES.has(edge.type)) continue
    const source = nodesById.get(edge.source)
    const target = nodesById.get(edge.target)
    if (source?.kind !== 'file' || target?.kind !== 'file') continue
    const list = importersOf.get(edge.target) ?? []
    list.push(edge.source)
    importersOf.set(edge.target, list)
  }
  const seen = new Set<string>([id])
  const dependents: ImpactFile[] = []
  let frontier = [id]
  let truncated = false
  for (let depth = 1; depth <= depthMax && frontier.length > 0; depth += 1) {
    const next: string[] = []
    const layer = [...frontier].sort(compareStrings)
    for (const fileNodeId of layer) {
      const sources = (importersOf.get(fileNodeId) ?? []).slice().sort(compareStrings)
      for (const importerId of sources) {
        if (seen.has(importerId)) continue
        seen.add(importerId)
        const node = nodesById.get(importerId)
        if (node?.kind !== 'file') continue
        dependents.push({ path: node.path, fileId: importerId, depth })
        if (dependents.length >= resultLimit) {
          truncated = true
          break
        }
        next.push(importerId)
      }
      if (truncated) break
    }
    if (truncated) break
    frontier = next
  }
  dependents.sort((left, right) =>
    left.depth - right.depth || compareStrings(left.path, right.path)
  )
  return {
    file: path,
    fileId: id,
    depthLimit: depthMax,
    limit: resultLimit,
    truncated,
    dependents
  }
}

export function toolErrorFromUnknown(error: unknown): McpToolError {
  if (error instanceof McpToolError) return error
  if (error instanceof GraphNodeNotFoundError) return new McpToolError(error.message)
  if (error instanceof Error) return new McpToolError(error.message)
  return new McpToolError(String(error))
}

/** Resolve a repo-relative path to a file id when present (for tests and tooling). */
export function fileIdForPath(graph: Graph, repoPath: string): string | undefined {
  const id = fileId(repoPath)
  return indexNodes(graph).has(id) ? id : undefined
}
