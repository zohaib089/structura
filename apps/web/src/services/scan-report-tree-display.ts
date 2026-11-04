import type { ReportFinding, ReportSeverity } from '../api/scan-report-types'
import { normalizeGraphPath } from './graph-node-focus'
import {
  buildReportFileTree,
  highestSeverity,
  type ReportTreeNode,
  type SeverityCounts
} from './scan-report-tree'

const SEVERITY_ORDER: ReportSeverity[] = ['critical', 'high', 'medium', 'low', 'info']

export interface SeverityCountChip {
  severity: ReportSeverity
  count: number
}

export function severityCountChips(counts: SeverityCounts): SeverityCountChip[] {
  return SEVERITY_ORDER.filter(severity => counts[severity] > 0).map(severity => ({
    severity,
    count: counts[severity]
  }))
}

export function folderSeverityChip(counts: SeverityCounts): SeverityCountChip | null {
  const severity = highestSeverity(counts)
  if (!severity || counts.total === 0) return null
  return { severity, count: counts.total }
}

export function fileSeverityChips(
  counts: SeverityCounts,
  maxVisible = 2
): { chips: SeverityCountChip[]; overflow: number } {
  const all = severityCountChips(counts)
  if (all.length <= maxVisible) return { chips: all, overflow: 0 }
  return { chips: all.slice(0, maxVisible), overflow: all.length - maxVisible }
}

function indexTreeSeverityPaths(node: ReportTreeNode, map: Map<string, SeverityCounts>) {
  if (node.path) map.set(normalizeGraphPath(node.path), node.counts)
  for (const child of node.children) indexTreeSeverityPaths(child, map)
}

export function buildReportPathSeverityMap(findings: ReportFinding[]): Map<string, SeverityCounts> {
  const root = buildReportFileTree(findings)
  const map = new Map<string, SeverityCounts>()
  indexTreeSeverityPaths(root, map)
  return map
}

export type PathSeverityIndex = ReadonlyMap<string, SeverityCounts> | Record<string, SeverityCounts>

export function lookupPathSeverityCounts(
  index: PathSeverityIndex | null | undefined,
  path: string
): SeverityCounts | null {
  if (!index || !path.trim()) return null
  const key = normalizeGraphPath(path)
  if (index instanceof Map) return index.get(key) ?? null
  const record = index as Record<string, SeverityCounts>
  return record[key] ?? null
}
