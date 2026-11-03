import type { AnalyserRunStatus, AnalyserStatus } from '../api/scan-report-types'

export interface ReportAnalyserRow {
  name: string
  status: AnalyserRunStatus
  durationMs: number
  reason?: string
  inactive: boolean
}

const STATUS_RANK: Record<AnalyserRunStatus, number> = {
  ran: 0,
  failed: 1,
  timeout: 2,
  skipped: 3
}

export function isInactiveAnalyserStatus(status: AnalyserRunStatus): boolean {
  return status === 'skipped' || status === 'failed' || status === 'timeout'
}

export function analyserStatusCssVar(status: AnalyserRunStatus): string {
  if (status === 'ran') return 'var(--color-success)'
  if (status === 'skipped') return 'var(--color-text-secondary)'
  if (status === 'timeout') return 'var(--color-warning)'
  return 'var(--color-danger)'
}

export function buildAnalyserRows(
  analysers: Record<string, AnalyserStatus> | null | undefined
): ReportAnalyserRow[] {
  if (!analysers || typeof analysers !== 'object') return []

  return Object.entries(analysers)
    .map(([name, entry]) => ({
      name,
      status: entry.status,
      durationMs: entry.durationMs,
      reason: entry.reason,
      inactive: isInactiveAnalyserStatus(entry.status)
    }))
    .sort((left, right) => {
      const rankDiff = STATUS_RANK[left.status] - STATUS_RANK[right.status]
      if (rankDiff !== 0) return rankDiff
      return left.name.localeCompare(right.name)
    })
}

export function partitionAnalyserRows(rows: ReportAnalyserRow[]): {
  active: ReportAnalyserRow[]
  skipped: ReportAnalyserRow[]
} {
  const active: ReportAnalyserRow[] = []
  const skipped: ReportAnalyserRow[] = []
  for (const row of rows) {
    if (row.status === 'skipped') skipped.push(row)
    else active.push(row)
  }
  return { active, skipped }
}
