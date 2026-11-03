import type {
  ArchitectureFinding,
  ArchitectureModuleDecl,
  FileNode,
  GraphArchitecture,
  GraphDocument,
  GraphEdge,
  GraphNode,
  ImportEdge
} from '../viewer/graph-types'

function isFileNode(node: GraphNode): node is FileNode {
  return node.kind === 'file' && 'path' in node
}

export interface ModuleRow {
  module: ArchitectureModuleDecl
  fileCount: number
}

export interface ModuleGraphEdge {
  id: string
  sourceModule: string
  targetModule: string
  edgeKind: ArchitectureFinding['edgeKind']
  violating: boolean
  label: string
  ariaLabel: string
}

const EXTERNAL_MODULE = 'external'

export function graphHasArchitectureConfig(graph: GraphDocument | null | undefined): graph is GraphDocument & {
  architecture: GraphArchitecture
} {
  return graph?.architecture !== undefined
}

export function countFilesByModule(graph: GraphDocument): Map<string, number> {
  const counts = new Map<string, number>()
  for (const node of graph.nodes) {
    if (!isFileNode(node)) continue
    const moduleName = node.module
    if (!moduleName) continue
    counts.set(moduleName, (counts.get(moduleName) ?? 0) + 1)
  }
  return counts
}

export function buildModuleRows(graph: GraphDocument, architecture: GraphArchitecture): ModuleRow[] {
  const counts = countFilesByModule(graph)
  return architecture.modules.map(module => ({
    module,
    fileCount: counts.get(module.name) ?? 0
  }))
}

export function architectureViolationCount(architecture: GraphArchitecture | undefined): number {
  if (!architecture) return 0
  return architecture.summary?.violations ?? architecture.findings?.length ?? 0
}

function filePathFromId(id: string): string | undefined {
  return id.startsWith('file:') ? id.slice('file:'.length) : undefined
}

function targetModule(
  edge: GraphEdge,
  nodes: Map<string, GraphNode>,
  moduleByPath: Map<string, string | undefined>
): string | undefined {
  const target = nodes.get(edge.target)
  if (!target) return undefined
  if (target.kind === 'file' && isFileNode(target)) return moduleByPath.get(target.path) ?? 'unassigned'
  if (target.kind === 'external') return EXTERNAL_MODULE
  return undefined
}

function isImportLikeEdge(edge: GraphEdge): edge is ImportEdge {
  return (edge.type === 'imports' || edge.type === 'reexports') && 'span' in edge
}

function findingKey(finding: ArchitectureFinding): string {
  return `${finding.file}\u0000${finding.line}\u0000${finding.edgeKind}\u0000${finding.from}\u0000${finding.to}`
}

export function indexArchitectureFindings(findings: ArchitectureFinding[] | undefined): Set<string> {
  const keys = new Set<string>()
  for (const finding of findings ?? []) keys.add(findingKey(finding))
  return keys
}

export function buildModuleDependencyEdges(graph: GraphDocument, architecture: GraphArchitecture): ModuleGraphEdge[] {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]))
  const moduleByPath = new Map<string, string | undefined>()
  for (const node of graph.nodes) {
    if (isFileNode(node)) moduleByPath.set(node.path, node.module)
  }
  const findingKeys = indexArchitectureFindings(architecture.findings)
  const aggregated = new Map<string, ModuleGraphEdge>()

  for (const edge of graph.edges) {
    if (!isImportLikeEdge(edge) || edge.provenance !== 'EXTRACTED') continue
    const sourcePath = filePathFromId(edge.source)
    if (!sourcePath) continue
    const fromModule = moduleByPath.get(sourcePath) ?? 'unassigned'
    const toModule = targetModule(edge, nodes, moduleByPath)
    if (toModule === undefined || toModule === EXTERNAL_MODULE) continue
    const edgeKind = edge.type
    const id = `${fromModule}->${toModule}:${edgeKind}`
    const candidate: ArchitectureFinding = {
      from: fromModule,
      to: toModule,
      edgeKind,
      file: sourcePath,
      line: edge.span.start.line,
      rule: '',
      provenance: 'EXTRACTED'
    }
    const violating = findingKeys.has(findingKey(candidate))
    const label = `${fromModule} → ${toModule} (${edgeKind})`
    const ariaLabel = violating
      ? `Architecture violation: ${label}`
      : `Dependency: ${label}`
    const existing = aggregated.get(id)
    if (existing) {
      if (violating) {
        existing.violating = true
        existing.ariaLabel = `Architecture violation: ${label}`
      }
      continue
    }
    aggregated.set(id, {
      id,
      sourceModule: fromModule,
      targetModule: toModule,
      edgeKind,
      violating,
      label,
      ariaLabel
    })
  }

  return [...aggregated.values()].sort((a, b) =>
    a.sourceModule.localeCompare(b.sourceModule) ||
    a.targetModule.localeCompare(b.targetModule) ||
    a.edgeKind.localeCompare(b.edgeKind)
  )
}
