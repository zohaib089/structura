import type { ReportFinding, ReportSeverity } from '../api/scan-report-types'

/**
 * Each severity has its own rank. `critical` must always outrank `high`
 * (an earlier version of the report collapsed the two into one bucket).
 */
const SEVERITY_RANK: Record<ReportSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
}

/** Most serious first. */
export const SEVERITY_DESCENDING: readonly ReportSeverity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info'
]

export function severityRank(severity: ReportSeverity): number {
  return SEVERITY_RANK[severity]
}

export function severityCssVar(severity: ReportSeverity): string {
  return `var(--sev-${severity}-fg)`
}

/** Compare for `Array.prototype.sort`: most serious first, then by path and line for a stable order. */
export function compareFindingsBySeverity(a: ReportFinding, b: ReportFinding): number {
  const rankDiff = severityRank(b.severity) - severityRank(a.severity)
  if (rankDiff !== 0) return rankDiff
  const fileDiff = a.file.localeCompare(b.file)
  if (fileDiff !== 0) return fileDiff
  return (a.line ?? 0) - (b.line ?? 0)
}

export type SeverityTally = Record<ReportSeverity, number>

export function emptySeverityTally(): SeverityTally {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
}

/** Count findings per severity; critical and high are always separate buckets. */
export function tallySeverities(findings: readonly Pick<ReportFinding, 'severity'>[]): SeverityTally {
  const tally = emptySeverityTally()
  for (const finding of findings) tally[finding.severity] += 1
  return tally
}
