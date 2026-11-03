import type { ReportSeverity } from '../api/scan-report-types'

export function severityRank(severity: ReportSeverity): number {
  return ({ critical: 5, high: 4, medium: 3, low: 2, info: 1 })[severity]
}

export function severityCssVar(severity: ReportSeverity): string {
  if (severity === 'critical' || severity === 'high') return 'var(--color-danger)'
  if (severity === 'medium') return 'var(--color-warning)'
  if (severity === 'low') return 'var(--color-info, var(--color-accent-primary))'
  return 'var(--color-text-secondary)'
}
