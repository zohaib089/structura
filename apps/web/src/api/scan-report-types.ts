/**
 * report.json v1 types for the web app.
 * Canonical JSON Schema: `packages/scan-analysis/schema/report.v1.schema.json`
 * TypeScript mirror: `packages/scan-analysis/src/report.v1.types.ts`
 */
export type {
  AnalyserRunStatus,
  AnalyserStatus,
  FindingProvenance,
  FindingSection,
  HistoryAuthor,
  HistoryCommit,
  HistoryFileChurn,
  HistoryHotspot,
  HistoryPayload,
  ScanFinding,
  ScanImprovement,
  ScanReport,
  Severity
} from '../../../../packages/scan-analysis/src/report.v1.types.ts'

export { REPORT_SCHEMA_VERSION } from '../../../../packages/scan-analysis/src/report.v1.types.ts'

/** Alias used across dashboard report UI */
export type ScanReportV1 =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').ScanReport

export type ReportSeverity =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').Severity
export type ReportSection =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').FindingSection
export type ReportProvenance =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').FindingProvenance
export type ReportFinding =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').ScanFinding
export type ReportImprovement =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').ScanImprovement
export type ReportHistoryPayload =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').HistoryPayload
export type ReportHistoryCommit =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').HistoryCommit
export type ReportHistoryAuthor =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').HistoryAuthor
export type ReportFileChurn =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').HistoryFileChurn
export type ReportHotspot =
  import('../../../../packages/scan-analysis/src/report.v1.types.ts').HistoryHotspot

/** Client-side export payload (not part of report.json v1). */
export interface FilteredScanReportExport {
  schemaVersion: typeof import('../../../../packages/scan-analysis/src/report.v1.types.ts').REPORT_SCHEMA_VERSION
  generatedAt: string
  filters: {
    severities: ReportSeverity[]
    sections: ReportSection[]
    pathQuery: string
  }
  findings: ReportFinding[]
  improvements: ReportImprovement[]
  history: ReportHistoryPayload | null
}
