import type { ReportTabId, ScanReportMessages } from './scan-report-messages'
import { REPORT_TAB_IDS } from './scan-report-url-state'

export function reportTabBreadcrumbLabel(tab: string, messages: ScanReportMessages): string {
  const labels: Record<ReportTabId, string> = {
    summary: messages.tabSummary,
    findings: messages.tabFindings,
    violations: messages.tabViolations,
    security: messages.tabSecurity,
    badPractices: messages.tabBadPractices,
    improvements: messages.tabImprovements,
    removals: messages.tabRemovals,
    architecture: messages.tabArchitecture(0),
    graph: messages.tabGraph,
    history: messages.tabHistory
  }
  return (REPORT_TAB_IDS as readonly string[]).includes(tab) ? labels[tab as ReportTabId] : tab
}
