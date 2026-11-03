import { assignModule, buildModuleMap } from '../architecture/assign-modules.js'
import { compareStrings } from '../graph/ids.js'
import type { ArchitectureFinding, ArchitectureModuleDecl } from '../architecture/types.js'
import type { Graph, GraphEdge, GraphNode } from '../graph/types.js'

export const EXTERNAL_MODULE = 'external'
export const UNASSIGNED_MODULE = 'unassigned'
export const ROOT_MODULE = 'root'

export interface ExportModule {
  name: string
  files: readonly string[]
}

export interface ExportModuleEdge {
  from: string
  to: string
  type: 'imports' | 'reexports'
  provenance: 'EXTRACTED' | 'INFERRED'
  confidence?: number
  reason?: string
}

export interface ExportFileEdge {
  from: string
  to: string
  type: 'imports' | 'reexports'
  provenance: 'EXTRACTED' | 'INFERRED'
  specifier?: string
  confidence?: number
  reason?: string
}

export interface ExportView {
  modules: ExportModule[]
  moduleEdges: ExportModuleEdge[]
  fileEdges: ExportFileEdge[]
  findings: ArchitectureFinding[]
}

function filePaths(graph: Graph): string[] {
  return graph.nodes.filter(node => node.kind === 'file').map(node => node.path).sort(compareStrings)
}

function syntheticModules(filePathsList: readonly string[]): ArchitectureModuleDecl[] {
  const names = new Set<string>()
  for (const path of filePathsList) {
    const slash = path.indexOf('/')
    names.add(slash === -1 ? ROOT_MODULE : path.slice(0, slash))
  }
  return [...names].sort(compareStrings).map(name => ({
    name,
    paths: name === ROOT_MODULE ? ['*'] : [`${name}/**`]
  }))
}

function moduleDecls(graph: Graph, paths: readonly string[]): ArchitectureModuleDecl[] {
  if (graph.architecture?.modules?.length) return graph.architecture.modules
  return syntheticModules(paths)
}

function targetLabel(edge: GraphEdge, nodes: Map<string, GraphNode>): string | undefined {
  const target = nodes.get(edge.target)
  if (!target) return undefined
  if (target.kind === 'file') return target.path
  if (target.kind === 'external') return `${target.ecosystem}:${target.label}`
  if (target.kind === 'unresolved') return `unresolved:${target.label}`
  return undefined
}

function moduleForPath(path: string, moduleByPath: Map<string, string | undefined>): string {
  return moduleByPath.get(path) ?? UNASSIGNED_MODULE
}

function moduleForTarget(
  edge: GraphEdge,
  nodes: Map<string, GraphNode>,
  moduleByPath: Map<string, string | undefined>
): string | undefined {
  const target = nodes.get(edge.target)
  if (!target) return undefined
  if (target.kind === 'file') return moduleForPath(target.path, moduleByPath)
  if (target.kind === 'external') return EXTERNAL_MODULE
  if (target.kind === 'unresolved') return UNASSIGNED_MODULE
  return undefined
}

function edgeKey(from: string, to: string, type: string, provenance: string): string {
  return `${from}\0${to}\0${type}\0${provenance}`
}

export function buildExportView(graph: Graph): ExportView {
  const paths = filePaths(graph)
  const modules = moduleDecls(graph, paths)
  const { byPath } = buildModuleMap(paths, modules)
  const nodes = new Map(graph.nodes.map(node => [node.id, node]))

  const filesByModule = new Map<string, string[]>()
  for (const path of paths) {
    const mod = moduleForPath(path, byPath)
    const list = filesByModule.get(mod) ?? []
    list.push(path)
    filesByModule.set(mod, list)
  }
  if (!filesByModule.has(EXTERNAL_MODULE)) filesByModule.set(EXTERNAL_MODULE, [])

  const exportModules: ExportModule[] = [...filesByModule.entries()]
    .filter(([, files]) => files.length > 0)
    .map(([name, files]) => ({ name, files: [...files].sort(compareStrings) }))
    .sort((a, b) => compareStrings(a.name, b.name))

  const moduleNames = new Set(exportModules.map(mod => mod.name))
  if (graph.edges.some(edge => {
    if (edge.type !== 'imports' && edge.type !== 'reexports') return false
    const target = nodes.get(edge.target)
    return target?.kind === 'external'
  })) {
    if (!moduleNames.has(EXTERNAL_MODULE)) {
      exportModules.push({ name: EXTERNAL_MODULE, files: [] })
      exportModules.sort((a, b) => compareStrings(a.name, b.name))
      moduleNames.add(EXTERNAL_MODULE)
    }
  }

  const fileEdges: ExportFileEdge[] = []
  const moduleEdgeMap = new Map<string, ExportModuleEdge>()

  for (const edge of graph.edges) {
    if (edge.type !== 'imports' && edge.type !== 'reexports') continue
    const sourcePath = edge.source.startsWith('file:') ? edge.source.slice('file:'.length) : undefined
    if (!sourcePath) continue
    const toLabel = targetLabel(edge, nodes)
    if (!toLabel) continue

    const fileEdge: ExportFileEdge = {
      from: sourcePath,
      to: toLabel,
      type: edge.type,
      provenance: edge.provenance
    }
    if ('specifier' in edge && edge.specifier) fileEdge.specifier = edge.specifier
    if (edge.provenance === 'INFERRED') {
      fileEdge.confidence = edge.confidence
      fileEdge.reason = edge.reason
    }
    fileEdges.push(fileEdge)

    const fromMod = moduleForPath(sourcePath, byPath)
    const toMod = moduleForTarget(edge, nodes, byPath)
    if (toMod === undefined || !moduleNames.has(fromMod) || !moduleNames.has(toMod)) continue
    if (fromMod === toMod) continue

    const key = edgeKey(fromMod, toMod, edge.type, edge.provenance)
    if (!moduleEdgeMap.has(key)) {
      const moduleEdge: ExportModuleEdge = {
        from: fromMod,
        to: toMod,
        type: edge.type,
        provenance: edge.provenance
      }
      if (edge.provenance === 'INFERRED') {
        moduleEdge.confidence = edge.confidence
        moduleEdge.reason = edge.reason
      }
      moduleEdgeMap.set(key, moduleEdge)
    }
  }

  fileEdges.sort((a, b) =>
    compareStrings(a.from, b.from) ||
    compareStrings(a.to, b.to) ||
    compareStrings(a.type, b.type) ||
    compareStrings(a.provenance, b.provenance) ||
    compareStrings(a.specifier ?? '', b.specifier ?? ''))

  const moduleEdges = [...moduleEdgeMap.values()].sort((a, b) =>
    compareStrings(a.from, b.from) ||
    compareStrings(a.to, b.to) ||
    compareStrings(a.type, b.type) ||
    compareStrings(a.provenance, b.provenance))

  const findings = [...(graph.architecture?.findings ?? [])].sort((a, b) =>
    compareStrings(a.file, b.file) ||
    a.line - b.line ||
    compareStrings(a.from, b.from) ||
    compareStrings(a.to, b.to) ||
    compareStrings(a.rule, b.rule))

  return { modules: exportModules, moduleEdges, fileEdges, findings }
}
