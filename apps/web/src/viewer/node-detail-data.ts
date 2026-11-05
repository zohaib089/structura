import type { ViewerReportFinding } from './report-types'
import { severityRank } from '../services/scan-report-severity'
import { normalizeGraphPath } from '../services/graph-node-focus'
import type { SeverityCounts } from '../services/scan-report-tree'
import {
  fileSeverityChips,
  folderSeverityChip,
  lookupPathSeverityCounts
} from '../services/scan-report-tree-display'
import type { GraphDocument, GraphEdge, GraphNode } from './graph-types'
import type { GraphIndex } from './overview'

export interface DirectoryChildRow {
  id: string
  label: string
  path: string
  kind: string
}

export interface SymbolRow {
  id: string
  label: string
  symbolKind: string
  exported: boolean
  span: string
}

export interface RelatedNodeRow {
  id: string
  label: string
  path: string
  edgeType: 'imports' | 'reexports'
  provenance: string
}

export interface NodeDetailStats {
  depth: number
  depsOut: number
  depsIn: number
  provenance: string
}

export interface NodeDetailSections {
  stats: NodeDetailStats
  summary: string | null
  summarySource: 'api' | 'exports' | 'none'
  symbols: SymbolRow[]
  imports: RelatedNodeRow[]
  importers: RelatedNodeRow[]
  contents: DirectoryChildRow[]
  findings: ViewerReportFinding[]
  severityChip: ReturnType<typeof folderSeverityChip>
  severityChips: ReturnType<typeof fileSeverityChips> | null
}

function pathOfNode(node: GraphNode | undefined): string {
  if (!node) return ''
  if ((node.kind === 'directory' || node.kind === 'file') && 'path' in node) return node.path
  if (node.kind === 'symbol' && 'file' in node) {
    return node.file.startsWith('file:') ? node.file.slice('file:'.length) : node.file
  }
  return ''
}

function labelOfNode(node: GraphNode | undefined, fallbackId: string): string {
  if (!node) return fallbackId
  return node.label || pathOfNode(node) || fallbackId
}

function fileIdForPath(index: GraphIndex, path: string): string | null {
  const normalized = normalizeGraphPath(path)
  for (const node of index.document.nodes) {
    if (node.kind === 'file' && 'path' in node && normalizeGraphPath(node.path) === normalized) {
      return node.id
    }
  }
  return null
}

export function resolveFileKey(index: GraphIndex, nodeId: string): string | null {
  const node = index.nodesById.get(nodeId)
  if (!node) return null
  if (node.kind === 'file' && 'path' in node) return normalizeGraphPath(node.path)
  if (node.kind === 'directory' && 'path' in node) return normalizeGraphPath(node.path)
  return null
}

export function dependencyCounts(index: GraphIndex, nodeId: string): { out: number; in: number } {
  const outTargets = new Set((index.outgoing.get(nodeId) ?? []).map(link => link.other))
  const inSources = new Set((index.incoming.get(nodeId) ?? []).map(link => link.other))
  return { out: outTargets.size, in: inSources.size }
}

export function importProvenanceLabel(document: GraphDocument, nodeId: string): string {
  let extracted = 0
  let inferred = 0
  for (const edge of document.edges) {
    if (edge.type !== 'imports' && edge.type !== 'reexports') continue
    if (edge.source !== nodeId && edge.target !== nodeId) continue
    if (edge.provenance === 'INFERRED') inferred += 1
    else extracted += 1
  }
  if (extracted === 0 && inferred === 0) return ''
  if (inferred === 0) return 'Found in source'
  if (extracted === 0) return 'Guessed from context'
  return `${extracted} found in source · ${inferred} guessed from context`
}

function isImportEdge(edge: GraphEdge): edge is GraphEdge & { type: 'imports' | 'reexports' } {
  return edge.type === 'imports' || edge.type === 'reexports'
}

function relatedRows(
  index: GraphIndex,
  nodeId: string,
  direction: 'out' | 'in'
): RelatedNodeRow[] {
  const rows: RelatedNodeRow[] = []
  const seen = new Set<string>()
  for (const edge of index.document.edges) {
    if (!isImportEdge(edge)) continue
    const otherId = direction === 'out' ? edge.target : edge.source
    if (direction === 'out' ? edge.source !== nodeId : edge.target !== nodeId) continue
    const key = `${edge.type}\u0000${otherId}`
    if (seen.has(key)) continue
    seen.add(key)
    const other = index.nodesById.get(otherId)
    rows.push({
      id: otherId,
      label: labelOfNode(other, otherId),
      path: pathOfNode(other),
      edgeType: edge.type,
      provenance: edge.provenance
    })
  }
  rows.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
  return rows
}

export function directoryContents(index: GraphIndex, directoryId: string): DirectoryChildRow[] {
  const childIds = index.children.get(directoryId) ?? []
  const rows: DirectoryChildRow[] = []
  for (const id of childIds) {
    const node = index.nodesById.get(id)
    if (!node) continue
    if (node.kind !== 'directory' && node.kind !== 'file') continue
    rows.push({
      id,
      label: labelOfNode(node, id),
      path: pathOfNode(node),
      kind: node.kind
    })
  }
  return rows
}

export function symbolsForFile(index: GraphIndex, fileNodeId: string): SymbolRow[] {
  const fileNode = index.nodesById.get(fileNodeId)
  const filePath = fileNode?.kind === 'file' && 'path' in fileNode ? fileNode.path : ''
  const rows: SymbolRow[] = []
  for (const node of index.document.nodes) {
    if (node.kind !== 'symbol' || !('file' in node)) continue
    const matches =
      node.file === fileNodeId ||
      (filePath.length > 0 &&
        (node.file === filePath || node.file === `file:${filePath}` || node.file.endsWith(`/${filePath}`)))
    if (!matches) continue
    rows.push({
      id: node.id,
      label: node.label,
      symbolKind: node.symbolKind,
      exported: node.exported,
      span: `${node.span.start.line}:${node.span.start.col}`
    })
  }
  rows.sort((a, b) => a.label.localeCompare(b.label))
  return rows
}

export function exportedSymbolFallback(index: GraphIndex, fileNodeId: string): string | null {
  const exported = symbolsForFile(index, fileNodeId)
    .filter(row => row.exported)
    .map(row => row.label)
  if (exported.length === 0) return null
  return `Exports: ${exported.join(', ')}`
}

export function findingsForPath(findings: ViewerReportFinding[], path: string | null): ViewerReportFinding[] {
  if (!path) return []
  const normalized = normalizeGraphPath(path)
  return findings
    .filter(finding => normalizeGraphPath(finding.file) === normalized)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.message.localeCompare(b.message))
}

export function buildNodeDetailSections(input: {
  index: GraphIndex
  nodeId: string
  depth: number
  findings: ViewerReportFinding[]
  pathSeverityCounts?: Map<string, SeverityCounts>
  apiSummary?: string | null
}): NodeDetailSections {
  const node = input.index.nodesById.get(input.nodeId)
  const pathKey = resolveFileKey(input.index, input.nodeId)
  const counts = pathKey ? lookupPathSeverityCounts(input.pathSeverityCounts, pathKey) : null
  const isFile = node?.kind === 'file'
  const isDirectory = node?.kind === 'directory'

  let summarySource: NodeDetailSections['summarySource'] = 'none'
  let summary: string | null = null
  if (isFile) {
    if (input.apiSummary && input.apiSummary.trim().length > 0) {
      summary = input.apiSummary.trim()
      summarySource = 'api'
    } else {
      const fallback = exportedSymbolFallback(input.index, input.nodeId)
      if (fallback) {
        summary = fallback
        summarySource = 'exports'
      }
    }
  }

  const deps = dependencyCounts(input.index, input.nodeId)
  return {
    stats: {
      depth: input.depth,
      depsOut: deps.out,
      depsIn: deps.in,
      provenance: importProvenanceLabel(input.index.document, input.nodeId)
    },
    summary,
    summarySource,
    symbols: isFile ? symbolsForFile(input.index, input.nodeId) : [],
    imports: isFile ? relatedRows(input.index, input.nodeId, 'out') : [],
    importers: isFile ? relatedRows(input.index, input.nodeId, 'in') : [],
    contents: isDirectory ? directoryContents(input.index, input.nodeId) : [],
    findings: findingsForPath(input.findings, pathKey),
    severityChip: counts ? folderSeverityChip(counts) : null,
    severityChips: isFile && counts ? fileSeverityChips(counts) : null
  }
}

export function resolveNavigateTargetId(index: GraphIndex, row: RelatedNodeRow): string {
  if (index.nodesById.has(row.id)) return row.id
  if (row.path) {
    const fileId = fileIdForPath(index, row.path)
    if (fileId) return fileId
  }
  return row.id
}
