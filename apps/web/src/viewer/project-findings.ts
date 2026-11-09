import type { ReportFinding } from '../api/scan-report-types'
import type { SeverityCounts } from '../services/scan-report-tree'
import { buildReportPathSeverityMap } from '../services/scan-report-tree-display'

/**
 * Resolve findings for the graph viewer: prefer findings passed from a report page,
 * otherwise use the scan report payload fetched on the project graph route.
 * Never invents findings.
 */
export function resolveGraphFindings(input: {
  passedFindings?: ReportFinding[] | null
  fetchedFindings?: ReportFinding[] | null
}): ReportFinding[] {
  if (input.passedFindings) return input.passedFindings
  return input.fetchedFindings ?? []
}

export function resolvePathSeverityCounts(input: {
  passedCounts?: Map<string, SeverityCounts>
  findings: ReportFinding[]
}): Map<string, SeverityCounts> | undefined {
  if (input.passedCounts) return input.passedCounts
  if (input.findings.length === 0) return undefined
  return buildReportPathSeverityMap(input.findings)
}
