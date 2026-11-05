import type { ReportFinding, ScanReportV1 } from '../api/scan-report-types'
import type { GraphDocument } from '../viewer/graph-types'
import { buildAnalyserRows, partitionAnalyserRows, type ReportAnalyserRow } from './scan-report-analysers'
import {
  compareFindingsBySeverity,
  tallySeverities,
  type SeverityTally
} from './scan-report-severity'

export interface ReportCoverage {
  /** Whole percent, 0-100. */
  percent: number
  analysed: number
  total: number
  /** Where the number comes from: the file graph, or (fallback) how many analysis checks ran. */
  basis: 'files' | 'checks'
}

export interface UnresolvedReason {
  reason: string
  count: number
}

export interface ReportSummary {
  coverage: ReportCoverage | null
  severity: SeverityTally
  totalFindings: number
  topFindings: ReportFinding[]
  skippedAnalysers: ReportAnalyserRow[]
  /** Analysers that failed or timed out. These need attention, unlike the quietly skipped ones. */
  problemAnalysers: ReportAnalyserRow[]
  problemAnalysersCount: number
  unresolved: UnresolvedReason[]
  unresolvedTotal: number
}

export const TOP_FINDINGS_LIMIT = 5

/**
 * Coverage is "files we could read / files we should have read". Ignored files (vendor folders,
 * build output, ...) are not counted against us. Without a graph we fall back to the analyser
 * run records, so a scan always gets an honest number or none at all.
 */
export function computeCoverage(
  report: ScanReportV1,
  graph: GraphDocument | null | undefined
): ReportCoverage | null {
  const files = graph?.coverage?.files
  if (files) {
    const total = Math.max(0, files.discovered - files.ignored)
    if (total > 0) {
      const analysed = Math.min(total, files.parsed + files.partial)
      return { percent: Math.round((analysed / total) * 100), analysed, total, basis: 'files' }
    }
  }
  const rows = buildAnalyserRows(report.analysers)
  const considered = rows.filter(row => row.status !== 'skipped')
  if (considered.length === 0) return null
  const ran = considered.filter(row => row.status === 'ran').length
  return {
    percent: Math.round((ran / considered.length) * 100),
    analysed: ran,
    total: considered.length,
    basis: 'checks'
  }
}

export function buildReportSummary(
  report: ScanReportV1,
  graph: GraphDocument | null | undefined
): ReportSummary {
  const rows = buildAnalyserRows(report.analysers)
  const { active, skipped } = partitionAnalyserRows(rows)
  const unresolved = (graph?.coverage?.unresolved ?? [])
    .filter(entry => entry.count > 0)
    .map(entry => ({ reason: entry.reason, count: entry.count }))
    .sort((a, b) => b.count - a.count)

  const problemAnalysers = active.filter(row => row.status === 'failed' || row.status === 'timeout')

  return {
    coverage: computeCoverage(report, graph),
    severity: tallySeverities(report.findings),
    totalFindings: report.findings.length,
    topFindings: [...report.findings].sort(compareFindingsBySeverity).slice(0, TOP_FINDINGS_LIMIT),
    skippedAnalysers: skipped,
    problemAnalysers,
    problemAnalysersCount: problemAnalysers.length,
    unresolved,
    unresolvedTotal: unresolved.reduce((sum, entry) => sum + entry.count, 0)
  }
}
