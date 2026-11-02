export type ReportSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type ReportProvenance = 'EXTRACTED' | 'INFERRED'
export type ReportSection =
  | 'history'
  | 'violations'
  | 'security'
  | 'badPractices'
  | 'improvements'
  | 'removals'

export type AnalyserRunStatus = 'ran' | 'skipped' | 'failed' | 'timeout'

export interface AnalyserStatus {
  status: AnalyserRunStatus
  reason?: string
  durationMs: number
}

export interface ReportFinding {
  id: string
  section: ReportSection
  severity: ReportSeverity
  file: string
  line?: number
  message: string
  rule?: string
  tool?: string
  provenance: ReportProvenance
}

export interface ReportImprovement {
  id: string
  message: string
  severity?: ReportSeverity
  relatedFindingIds: string[]
}

export interface ReportHistoryCommit {
  hash: string
  author: string
  date: string
  subject: string
}

export interface ReportHistoryAuthor {
  name: string
  email?: string
  commitCount: number
}

export interface ReportFileChurn {
  path: string
  additions: number
  deletions: number
  commits: number
}

export interface ReportHotspot {
  path: string
  score: number
}

export interface ReportHistoryPayload {
  limitedHistory: boolean
  depthRequested?: number
  depthAvailable?: number
  commits: ReportHistoryCommit[]
  authors: ReportHistoryAuthor[]
  fileChurn: ReportFileChurn[]
  hotspots: ReportHotspot[]
}

export interface ScanReportV1 {
  schemaVersion: '1.0.0'
  generatedAt: string
  analysers: Record<string, AnalyserStatus>
  history: ReportHistoryPayload | null
  findings: ReportFinding[]
  improvements: ReportImprovement[]
}

export interface FilteredScanReportExport {
  schemaVersion: '1.0.0'
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
