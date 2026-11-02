import type {
  FilteredScanReportExport,
  ReportFinding,
  ReportImprovement,
  ReportSection,
  ReportSeverity,
  ScanReportV1
} from '../api/scan-report-types'

export interface ReportViewFilters {
  severities: Set<ReportSeverity>
  sections: Set<ReportSection>
  pathQuery: string
}

export const ALL_REPORT_SEVERITIES: ReportSeverity[] = ['critical', 'high', 'medium', 'low', 'info']

export const ALL_FINDING_SECTIONS: ReportSection[] = [
  'history',
  'violations',
  'security',
  'badPractices',
  'removals'
]

export function defaultReportFilters(): ReportViewFilters {
  return {
    severities: new Set(ALL_REPORT_SEVERITIES),
    sections: new Set(ALL_FINDING_SECTIONS),
    pathQuery: ''
  }
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').toLowerCase()
}

export function matchesPathFilter(filePath: string, pathQuery: string): boolean {
  const query = pathQuery.trim().toLowerCase()
  if (!query) return true
  return normalizePath(filePath).includes(query)
}

export function filterFindings(
  findings: ReportFinding[],
  filters: ReportViewFilters
): ReportFinding[] {
  return findings.filter(finding => {
    if (!filters.severities.has(finding.severity)) return false
    if (!filters.sections.has(finding.section)) return false
    if (!matchesPathFilter(finding.file, filters.pathQuery)) return false
    return true
  })
}

export function filterImprovements(
  report: ScanReportV1,
  filteredFindings: ReportFinding[]
): ReportImprovement[] {
  const visibleIds = new Set(filteredFindings.map(row => row.id))
  return report.improvements.filter(improvement =>
    improvement.relatedFindingIds.some(id => visibleIds.has(id))
  )
}

export function buildFilteredReportExport(
  report: ScanReportV1,
  filters: ReportViewFilters
): FilteredScanReportExport {
  const findings = filterFindings(report.findings, filters)
  const improvements = filterImprovements(report, findings)
  return {
    schemaVersion: report.schemaVersion,
    generatedAt: report.generatedAt,
    filters: {
      severities: [...filters.severities],
      sections: [...filters.sections],
      pathQuery: filters.pathQuery.trim()
    },
    findings,
    improvements,
    history: report.history
  }
}

export function findingsForSection(findings: ReportFinding[], section: ReportSection): ReportFinding[] {
  return findings.filter(row => row.section === section)
}
