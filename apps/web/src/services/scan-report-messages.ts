import type { WebLocale } from './locale'
import type { AnalyserRunStatus, ReportSection, ReportSeverity } from '../api/scan-report-types'

export type ReportTabId =
  | 'summary'
  | 'findings'
  | 'history'
  | 'violations'
  | 'security'
  | 'badPractices'
  | 'improvements'
  | 'removals'
  | 'architecture'
  | 'graph'

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
  tabGraph: string
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

  // --- D4: summary-first report ---
  tabSummary: string
  tabFindings: string
  /** One-line "what you're seeing" shown under the tabs, in plain language. */
  tabHint: (tab: ReportTabId) => string
  /** Longer tooltip on the tab itself (explains jargon). */
  tabTooltip: (tab: ReportTabId) => string
  tabsAriaLabel: string

  reportTitle: string
  backToScans: string
  scanMeta: (shortId: string, branch: string | null, when: string) => string
  openGraph: string
  openGraphTooltip: string

  coverageTitle: string
  coverageHint: string
  coverageOfFiles: (analysed: number, total: number) => string
  coverageOfChecks: (ran: number, total: number) => string
  coverageUnavailable: string
  severityTitle: string
  severityHint: string
  severityTooltip: (severity: ReportSeverity) => string
  severityCount: (label: string, count: number) => string
  topFindingsTitle: string
  topFindingsHint: string
  seeAllFindings: (total: number) => string
  summaryAllClearTitle: string
  summaryAllClearBody: string
  nextStepsTitle: string
  nextStepCritical: (count: number) => string
  nextStepReview: string
  nextStepGraph: string
  secondaryTitle: string
  secondaryHint: string
  problemAnalysersTitle: string
  problemAnalysersHint: string
  unresolvedTitle: string
  unresolvedHint: string
  unresolvedColumnReason: string
  unresolvedColumnCount: string
  skippedHint: string
  nothingSkipped: string

  filtersShowing: (shown: number, total: number) => string
  filterClear: string
  filterSeverityHint: string
  filterCategoryHint: string
  filterPathHint: string
  filterToggleTooltip: (label: string, description: string, active: boolean) => string

  tableCaption: (tabLabel: string) => string
  columnSeverity: string
  columnFinding: string
  columnWhere: string
  columnFoundBy: string
  columnActions: string
  emptyTabTitle: (tabLabel: string) => string
  emptyTabBody: string
  emptyFilteredTitle: string
  emptyFilteredBody: string
  emptyTabAction: string
  clearFilters: string
  treeScope: (path: string) => string
  clearTreeScope: string
  treeToggleShow: string
  treeToggleHide: string
  ruleLabel: string
  provenanceTooltip: (value: 'EXTRACTED' | 'INFERRED') => string

  improvementsRelated: (count: number) => string

  exportMenu: string
  exportMenuTooltip: string
  exportScope: (count: number) => string
  exportJsonLabel: string
  exportJsonHint: string
  exportMarkdownLabel: string
  exportMarkdownHint: string
  exportSuccessTitle: string
  exportSuccessBody: (filename: string) => string
  exportErrorTitle: string
  exportErrorBody: string
  exportRetry: string

  graphLoadingLabel: string
  graphUnavailableTitle: string
  graphUnavailableBody: string
  graphRetry: string
  graphHint: string
  architectureNeedsGraphTitle: string
  architectureNeedsGraphBody: string
  historyEmptyTitle: string
  historyEmptyBody: string
  reportNotReadyTitle: string
  reportNotReadyBody: string
}

const en: ScanReportMessages = {
  panelEyebrow: 'Scan analysis',
  panelTitle: 'Scan report',
  panelDescription:
    'Browse findings by file, severity and category. Filters apply to the findings lists and to exports.',
  loadingReport: 'Loading scan report…',
  loadReportError: 'We could not load this report. Check your connection and try again.',
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
  emptySection: 'Nothing to show here for the current filters.',
  tabHistory: 'History',
  tabViolations: 'Code violations',
  tabSecurity: 'Security',
  tabBadPractices: 'Bad practices',
  tabImprovements: 'Improvements',
  tabRemovals: 'Removals',
  tabGraph: 'Graph',
  tabArchitecture(violations) {
    return violations > 0 ? `Architecture (${violations})` : 'Architecture'
  },
  architectureEmptyTitle: 'No architecture rules configured',
  architectureEmptyBody:
    'Architecture checks compare your code against the structure you declare (which parts may depend on which). Add an architecture config file to your repository, then scan again.',
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
  architectureNoFindings: 'All clear: no part of your code crosses the lines you declared.',
  architectureColumnFrom: 'From',
  architectureColumnTo: 'To',
  architectureColumnEdge: 'Link type',
  architectureColumnLocation: 'Location',
  architectureColumnRule: 'Rule',
  architectureColumnProvenance: 'Certainty',
  architectureGraphHint: 'Dependencies between modules; dashed red lines break the rules you declared.',
  tabSummary: 'Summary',
  tabFindings: 'All findings',
  tabsAriaLabel: 'Report sections',
  tabHint(tab) {
    return (
      {
        summary:
          'A quick health check of this scan: how much of your project we could read, how serious the problems are, and what to look at first.',
        findings:
          'Every problem we found, most serious first. Use the filters to narrow it down, then pick a folder on the left to focus on one area.',
        violations:
          'Places where the code breaks a quality rule (for example, things that are too long or too tangled). Each one is a suggestion, not a crash.',
        security:
          'Possible security weaknesses, such as risky code patterns or leaked secrets. Start with the Critical and High ones.',
        badPractices:
          'Habits that make code harder to maintain over time. These rarely break anything today, but they add up.',
        improvements:
          'Suggested clean-ups. Each one groups several findings that a single change could fix.',
        removals:
          'Code that looks unused and may be safe to delete. Check before removing anything.',
        architecture:
          'Whether your code follows the structure you declared (which parts may depend on which). Anything that crosses a line is drift.',
        graph:
          'A map of how your files connect to each other. Click a file to see its problems and what it depends on.',
        history:
          'Who changed what, and when. Files that change a lot (hotspots) are often where problems hide.'
      } satisfies Record<ReportTabId, string>
    )[tab]
  },
  tabTooltip(tab) {
    return (
      {
        summary: 'Start here: coverage, severity and the most important findings',
        findings: 'All findings from every category in one list',
        violations: 'Code that breaks a quality rule (also called lint or analysis violations)',
        security: 'Possible security problems',
        badPractices: 'Patterns that make code harder to maintain',
        improvements: 'Suggested clean-ups that fix several findings at once',
        removals: 'Code that looks unused',
        architecture: 'Checks your code against the structure you declared',
        graph: 'Interactive map of how files depend on each other',
        history: 'Commit history, hotspots and authors'
      } satisfies Record<ReportTabId, string>
    )[tab]
  },
  reportTitle: 'Scan report',
  backToScans: 'All scans',
  scanMeta(shortId, branch, when) {
    return [`Scan ${shortId}`, branch, when].filter(Boolean).join(' · ')
  },
  openGraph: 'Open graph',
  openGraphTooltip: 'See how your files connect to each other',

  coverageTitle: 'Coverage',
  coverageHint: 'How much of your project we were able to read and check.',
  coverageOfFiles(analysed, total) {
    return `of files analysed · ${analysed.toLocaleString('en')} / ${total.toLocaleString('en')}`
  },
  coverageOfChecks(ran, total) {
    return `of checks completed · ${ran} / ${total}`
  },
  coverageUnavailable: 'Coverage is not available for this scan.',
  severityTitle: 'Severity',
  severityHint: 'How serious the problems are. Select one to see just those findings.',
  severityTooltip(severity) {
    return (
      {
        critical: 'Critical: fix first. Likely a security hole or something that can break the app.',
        high: 'High: serious. Plan to fix soon.',
        medium: 'Medium: worth fixing when you are in the area.',
        low: 'Low: minor, cosmetic or easy to live with.',
        info: 'Info: for your information, no action needed.'
      } satisfies Record<ReportSeverity, string>
    )[severity]
  },
  severityCount(label, count) {
    return `${label}: ${count}`
  },
  topFindingsTitle: 'Top findings',
  topFindingsHint: 'The most serious problems first.',
  seeAllFindings(total) {
    return total === 1 ? 'See the finding' : `See all ${total.toLocaleString('en')} findings`
  },
  summaryAllClearTitle: 'No problems found',
  summaryAllClearBody:
    'The checks that ran did not report anything. Open the graph to explore how your project fits together, or scan again after your next change.',
  nextStepsTitle: 'What to do next',
  nextStepCritical(count) {
    return count === 1 ? 'Review the 1 critical finding first' : `Review the ${count} critical findings first`
  },
  nextStepReview: 'Work through All findings, most serious first',
  nextStepGraph: 'Open the graph to see where problems cluster',
  secondaryTitle: 'What we could not check',
  secondaryHint:
    'Analysers are the individual checks we run (security, code quality and so on). Some did not run or could not read everything. This does not change the findings above, but it limits what we can tell you.',
  problemAnalysersTitle: 'Checks that did not finish',
  problemAnalysersHint: 'These checks started but failed or timed out. Scan again to retry them.',
  unresolvedTitle: 'Unresolved imports',
  unresolvedHint:
    'Places where one file refers to another that we could not locate. The graph may be missing some connections because of them.',
  unresolvedColumnReason: 'Why',
  unresolvedColumnCount: 'How many',
  skippedHint: 'Checks that did not apply to this project, for example because it has no code in that language.',
  nothingSkipped: 'Everything that could run did run, and every import was resolved.',

  filtersShowing(shown, total) {
    return shown === total
      ? `Showing all ${total.toLocaleString('en')} findings`
      : `Showing ${shown.toLocaleString('en')} of ${total.toLocaleString('en')} findings`
  },
  filterClear: 'Clear filters',
  filterSeverityHint: 'Show only these severities',
  filterCategoryHint: 'Show only these kinds of finding',
  filterPathHint: 'Only files whose path contains this text',
  filterToggleTooltip(label, description, active) {
    return `${active ? 'Hide' : 'Show'} ${label} findings. ${description}`
  },

  tableCaption(tabLabel) {
    return `${tabLabel} findings`
  },
  columnSeverity: 'Severity',
  columnFinding: 'What we found',
  columnWhere: 'Where',
  columnFoundBy: 'Found by',
  columnActions: 'Actions',
  emptyTabTitle(tabLabel) {
    return `No ${tabLabel.toLowerCase()} findings in this scan`
  },
  emptyTabBody:
    'Nothing to fix here. Check All findings for anything else, or open the graph to explore your project.',
  emptyFilteredTitle: 'No findings match your filters',
  emptyFilteredBody: 'Try removing a filter or searching for a shorter path.',
  emptyTabAction: 'See all findings',
  clearFilters: 'Clear filters',
  treeScope(path) {
    return `Showing findings in ${path}`
  },
  clearTreeScope: 'Show everything',
  treeToggleShow: 'Show folders',
  treeToggleHide: 'Hide folders',
  ruleLabel: 'Rule',
  provenanceTooltip(value) {
    return value === 'EXTRACTED'
      ? 'Read directly from your code'
      : 'Inferred: our best guess from patterns, not read directly'
  },

  improvementsRelated(count) {
    return count === 1 ? 'Fixes 1 finding' : `Fixes ${count} findings`
  },

  exportMenu: 'Export',
  exportMenuTooltip: 'Download this report',
  exportScope(count) {
    return `Includes the ${count.toLocaleString('en')} finding${count === 1 ? '' : 's'} matching your current filters.`
  },
  exportJsonLabel: 'JSON file',
  exportJsonHint: 'For tools and scripts',
  exportMarkdownLabel: 'Markdown file',
  exportMarkdownHint: 'For reading or pasting into a ticket',
  exportSuccessTitle: 'Report downloaded',
  exportSuccessBody(filename) {
    return `Saved as ${filename}. Check your downloads folder.`
  },
  exportErrorTitle: 'Could not download the report',
  exportErrorBody: 'Something went wrong while preparing the file. Try again, or pick the other format.',
  exportRetry: 'Try again',

  graphLoadingLabel: 'Loading the graph…',
  graphUnavailableTitle: 'The graph is not available right now',
  graphUnavailableBody:
    'We could not load the map for this scan. The rest of the report still works. Try again in a moment.',
  graphRetry: 'Try again',
  graphHint: 'Open the graph',
  architectureNeedsGraphTitle: 'Architecture checks need the graph',
  architectureNeedsGraphBody:
    'We could not load the graph for this scan, so there is nothing to compare against yet. Try again in a moment.',
  historyEmptyTitle: 'No history in this scan',
  historyEmptyBody:
    'History needs a project connected through Git. Scan a Git link instead of an upload to see who changed what.',
  reportNotReadyTitle: 'This report is not ready yet',
  reportNotReadyBody: 'Pick a scan that has finished, or start a new one.',

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
  analysersTitle: 'Checks',
  analysersEmpty: 'This report does not list which checks ran.',
  analysersRanCaption: 'Checks that ran or stopped with an error',
  analysersSkippedHeading: 'Skipped checks',
  analysersSkippedCaption: 'Checks that did not run for this scan',
  analyserColumnName: 'Check',
  analyserColumnStatus: 'Status',
  analyserColumnDuration: 'Duration',
  analyserColumnDetails: 'Details',
  analyserSkippedNoReason: 'No reason given',
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
