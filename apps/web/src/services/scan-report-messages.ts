import type { WebLocale } from './locale'
import type { AnalyserRunStatus, ReportSection, ReportSeverity } from '../api/scan-report-types'

export type ReportTabId =
  | 'history'
  | 'violations'
  | 'security'
  | 'badPractices'
  | 'improvements'
  | 'removals'
  | 'architecture'

export interface ScanReportMessages {
  panelEyebrow: string
  panelTitle: string
  panelDescription: string
  loadingReport: string
  loadReportError: string
  noReportSelected: string
  viewGraph: string
  viewReport: string
  filtersTitle: string
  filterSeverity: string
  filterSection: string
  filterPath: string
  filterPathPlaceholder: string
  exportJson: string
  exportMarkdown: string
  treeTitle: string
  treeView: string
  graphView: string
  detailTitle: string
  detailEmpty: string
  showInGraph: string
  emptySection: string
  tabHistory: string
  tabViolations: string
  tabSecurity: string
  tabBadPractices: string
  tabImprovements: string
  tabRemovals: string
  severityLabel: (severity: ReportSeverity) => string
  sectionLabel: (section: ReportSection) => string
  paginationPrevious: string
  paginationNext: string
  paginationStatus: (page: number, totalPages: number, totalItems: number) => string
  historyTimeline: string
  historyHotspots: string
  historyChurn: string
  historyAuthors: string
  historyLimited: string
  openReport: string
  analysersTitle: string
  analysersEmpty: string
  analysersRanCaption: string
  analysersSkippedHeading: string
  analysersSkippedCaption: string
  analyserColumnName: string
  analyserColumnStatus: string
  analyserColumnDuration: string
  analyserColumnDetails: string
  analyserSkippedNoReason: string
  analyserStatusLabel: (status: AnalyserRunStatus) => string
  tabArchitecture: (violations: number) => string
  architectureEmptyTitle: string
  architectureEmptyBody: string
  architectureSummary: (violations: number, unassignedFiles: number) => string
  architectureModulesTitle: string
  architectureModuleName: string
  architectureModuleFiles: string
  architectureModulePaths: string
  architectureFindingsTitle: (violations: number) => string
  architectureNoFindings: string
  architectureColumnFrom: string
  architectureColumnTo: string
  architectureColumnEdge: string
  architectureColumnLocation: string
  architectureColumnRule: string
  architectureColumnProvenance: string
  architectureGraphHint: string
}

const en: ScanReportMessages = {
  panelEyebrow: 'Scan analysis',
  panelTitle: 'Project report',
  panelDescription:
    'Browse findings by path, severity, and category. Filters apply to the tree, tabs, and exports.',
  loadingReport: 'Loading scan report…',
  loadReportError: 'Unable to load report for this scan.',
  noReportSelected: 'Select a finished scan to review the project report.',
  viewGraph: 'Graph insights',
  viewReport: 'Project report',
  filtersTitle: 'Filters',
  filterSeverity: 'Severity',
  filterSection: 'Category',
  filterPath: 'Path contains',
  filterPathPlaceholder: 'e.g. src/components',
  exportJson: 'Export JSON',
  exportMarkdown: 'Export Markdown',
  treeTitle: 'Project tree',
  treeView: 'Tree',
  graphView: 'Graph',
  detailTitle: 'Findings',
  detailEmpty: 'Select a file or folder to inspect matching findings.',
  showInGraph: 'Show in graph',
  emptySection: 'No items match the current filters in this section.',
  tabHistory: 'History',
  tabViolations: 'Code violations',
  tabSecurity: 'Security',
  tabBadPractices: 'Bad practices',
  tabImprovements: 'Improvements',
  tabRemovals: 'Removals',
  tabArchitecture(violations) {
    return violations > 0 ? `Architecture (${violations})` : 'Architecture'
  },
  architectureEmptyTitle: 'No architecture rules configured',
  architectureEmptyBody:
    'This scan graph does not include a declared architecture section. Add an architecture config to the repository to assign modules and detect drift.',
  architectureSummary(violations, unassignedFiles) {
    const parts = [`${violations} violation${violations === 1 ? '' : 's'}`]
    if (unassignedFiles > 0) parts.push(`${unassignedFiles} unassigned file${unassignedFiles === 1 ? '' : 's'}`)
    return parts.join(' · ')
  },
  architectureModulesTitle: 'Declared modules',
  architectureModuleName: 'Module',
  architectureModuleFiles: 'Files in scan',
  architectureModulePaths: 'Path patterns',
  architectureFindingsTitle(violations) {
    return violations > 0 ? `Drift findings (${violations})` : 'Drift findings'
  },
  architectureNoFindings: 'No architecture drift violations were detected.',
  architectureColumnFrom: 'From',
  architectureColumnTo: 'To',
  architectureColumnEdge: 'Edge kind',
  architectureColumnLocation: 'Location',
  architectureColumnRule: 'Rule',
  architectureColumnProvenance: 'Provenance',
  architectureGraphHint: 'Module dependencies; dashed red edges violate declared rules.',
  severityLabel(severity) {
    return (
      {
        info: 'Info',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical'
      } satisfies Record<ReportSeverity, string>
    )[severity]
  },
  sectionLabel(section) {
    return (
      {
        history: 'History',
        violations: 'Code violations',
        security: 'Security',
        badPractices: 'Bad practices',
        improvements: 'Improvements',
        removals: 'Removals'
      } satisfies Record<ReportSection, string>
    )[section]
  },
  paginationPrevious: 'Previous page',
  paginationNext: 'Next page',
  paginationStatus(page, totalPages, totalItems) {
    return `Page ${page} of ${totalPages} · ${totalItems} items`
  },
  historyTimeline: 'Recent commits',
  historyHotspots: 'Hotspots',
  historyChurn: 'File churn',
  historyAuthors: 'Authors',
  historyLimited: 'History depth was limited for this repository.',
  openReport: 'Open project report',
  analysersTitle: 'Analysers',
  analysersEmpty: 'No analyser run records were included in this report.',
  analysersRanCaption: 'Analysers that ran or stopped with an error',
  analysersSkippedHeading: 'Skipped analysers',
  analysersSkippedCaption: 'Analysers that did not run for this scan',
  analyserColumnName: 'Analyser',
  analyserColumnStatus: 'Status',
  analyserColumnDuration: 'Duration',
  analyserColumnDetails: 'Details',
  analyserSkippedNoReason: 'No reason recorded',
  analyserStatusLabel(status) {
    return (
      {
        ran: 'Ran',
        skipped: 'Skipped',
        failed: 'Failed',
        timeout: 'Timed out'
      } satisfies Record<AnalyserRunStatus, string>
    )[status]
  }
}

export function scanReportMessages(locale: WebLocale): ScanReportMessages {
  void locale
  return en
}

export function tabSectionMap(tab: ReportTabId): ReportSection | 'improvements' | 'history-bundle' | 'architecture' {
  if (tab === 'improvements') return 'improvements'
  if (tab === 'history') return 'history-bundle'
  if (tab === 'architecture') return 'architecture'
  return tab
}
