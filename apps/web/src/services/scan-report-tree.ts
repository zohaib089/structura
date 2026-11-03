import type { ReportFinding, ReportSeverity } from '../api/scan-report-types'

export interface SeverityCounts {
  info: number
  low: number
  medium: number
  high: number
  critical: number
  total: number
}

export function emptySeverityCounts(): SeverityCounts {
  return { info: 0, low: 0, medium: 0, high: 0, critical: 0, total: 0 }
}

export function addSeverityCount(counts: SeverityCounts, severity: ReportSeverity): SeverityCounts {
  const next = { ...counts, [severity]: counts[severity] + 1, total: counts.total + 1 }
  return next
}

export function mergeSeverityCounts(a: SeverityCounts, b: SeverityCounts): SeverityCounts {
  return {
    info: a.info + b.info,
    low: a.low + b.low,
    medium: a.medium + b.medium,
    high: a.high + b.high,
    critical: a.critical + b.critical,
    total: a.total + b.total
  }
}

export interface ReportTreeNode {
  id: string
  name: string
  path: string
  kind: 'folder' | 'file'
  counts: SeverityCounts
  findings: ReportFinding[]
  children: ReportTreeNode[]
}

function splitPath(filePath: string): string[] {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return normalized.split('/').filter(Boolean)
}

function compareNodes(a: ReportTreeNode, b: ReportTreeNode): number {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
  return a.name.localeCompare(b.name)
}

export function buildReportFileTree(findings: ReportFinding[]): ReportTreeNode {
  const root: ReportTreeNode = {
    id: '/',
    name: '/',
    path: '',
    kind: 'folder',
    counts: emptySeverityCounts(),
    findings: [],
    children: []
  }

  const folderIndex = new Map<string, ReportTreeNode>([[root.path, root]])

  function ensureFolder(pathParts: string[]): ReportTreeNode {
    const path = pathParts.join('/')
    const existing = folderIndex.get(path)
    if (existing) return existing
    const parentParts = pathParts.slice(0, -1)
    const parent = parentParts.length === 0 ? root : ensureFolder(parentParts)
    const node: ReportTreeNode = {
      id: path || '/',
      name: pathParts[pathParts.length - 1] ?? '/',
      path,
      kind: 'folder',
      counts: emptySeverityCounts(),
      findings: [],
      children: []
    }
    parent.children.push(node)
    folderIndex.set(path, node)
    return node
  }

  for (const finding of findings) {
    const parts = splitPath(finding.file)
    if (parts.length === 0) continue
    const fileName = parts[parts.length - 1] ?? finding.file
    const folderParts = parts.slice(0, -1)
    const parent = folderParts.length === 0 ? root : ensureFolder(folderParts)
    const filePath = parts.join('/')
    let fileNode = parent.children.find(child => child.kind === 'file' && child.path === filePath)
    if (!fileNode) {
      fileNode = {
        id: filePath,
        name: fileName,
        path: filePath,
        kind: 'file',
        counts: emptySeverityCounts(),
        findings: [],
        children: []
      }
      parent.children.push(fileNode)
    }
    fileNode.findings.push(finding)
    fileNode.counts = addSeverityCount(fileNode.counts, finding.severity)
  }

  function aggregate(node: ReportTreeNode): SeverityCounts {
    if (node.kind === 'file') {
      node.counts = node.findings.reduce(
        (acc, row) => addSeverityCount(acc, row.severity),
        emptySeverityCounts()
      )
      return node.counts
    }
    let counts = emptySeverityCounts()
    for (const child of node.children) {
      counts = mergeSeverityCounts(counts, aggregate(child))
    }
    node.counts = counts
    node.children.sort(compareNodes)
    return counts
  }

  aggregate(root)
  return root
}

export function flattenTreeNodes(root: ReportTreeNode): ReportTreeNode[] {
  const rows: ReportTreeNode[] = []
  function walk(node: ReportTreeNode, depth: number) {
    if (node.path !== '') rows.push(node)
    if (node.kind === 'folder') {
      for (const child of node.children) walk(child, depth + 1)
    }
  }
  walk(root, 0)
  return rows
}

export function highestSeverity(counts: SeverityCounts): ReportSeverity | null {
  if (counts.total === 0) return null
  const order: ReportSeverity[] = ['critical', 'high', 'medium', 'low', 'info']
  for (const severity of order) {
    if (counts[severity] > 0) return severity
  }
  return null
}
