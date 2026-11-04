import type { ReportSeverity } from '../api/scan-report-types'

export function severityRank(severity: ReportSeverity): number {
  return ({ critical: 5, high: 4, medium: 3, low: 2, info: 1 })[severity]
}

export function severityCssVar(severity: ReportSeverity): string {
  return `var(--sev-${severity}-fg)`
}
