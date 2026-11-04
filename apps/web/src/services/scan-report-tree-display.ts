import type { ReportSeverity } from '../api/scan-report-types'
import { highestSeverity, type SeverityCounts } from './scan-report-tree'

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
