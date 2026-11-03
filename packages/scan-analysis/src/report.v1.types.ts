export const REPORT_SCHEMA_VERSION = '1.0.0' as const

export type AnalyserRunStatus = 'ran' | 'skipped' | 'failed' | 'timeout'
export type FindingSection =
  | 'history'
  | 'violations'
  | 'security'
  | 'badPractices'
  | 'improvements'
  | 'removals'
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type FindingProvenance = 'EXTRACTED' | 'INFERRED'

export interface AnalyserStatus {
  status: AnalyserRunStatus
  reason?: string
  durationMs: number
}

export interface ScanFinding {
  id: string
  section: FindingSection
  severity: Severity
  file: string
  line?: number
  message: string
  rule?: string
  tool?: string
  provenance: FindingProvenance
}

export interface ScanImprovement {
  id: string
  message: string
  severity?: Severity
  relatedFindingIds: string[]
}

export interface HistoryCommit {
  hash: string
  author: string
  date: string
  subject: string
}

export interface HistoryAuthor {
  name: string
  email?: string
  commitCount: number
}

export interface HistoryFileChurn {
  path: string
  additions: number
  deletions: number
  commits: number
}

export interface HistoryHotspot {
  path: string
  score: number
}

export interface HistoryPayload {
  limitedHistory: boolean
  depthRequested?: number
  depthAvailable?: number
  commits: HistoryCommit[]
  authors: HistoryAuthor[]
  fileChurn: HistoryFileChurn[]
  hotspots: HistoryHotspot[]
}

export interface ScanReport {
  schemaVersion: typeof REPORT_SCHEMA_VERSION
  generatedAt: string
  analysers: Record<string, AnalyserStatus>
  history: HistoryPayload | null
  findings: ScanFinding[]
  improvements: ScanImprovement[]
}
