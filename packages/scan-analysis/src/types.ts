import { createHash } from 'node:crypto'

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

export interface ScanAnalysisLimits {
  toolTimeoutMs: number
  maxToolOutputBytes: number
  historyDepth: number
  allowNetwork: boolean
}

export const DEFAULT_SCAN_ANALYSIS_LIMITS: ScanAnalysisLimits = {
  toolTimeoutMs: 120_000,
  maxToolOutputBytes: 2 * 1024 * 1024,
  historyDepth: 200,
  allowNetwork: false
}

export interface ScanAnalysisOptions {
  rootDir: string
  graph: unknown
  hasGit: boolean
  limits?: Partial<ScanAnalysisLimits>
  now?: () => Date
  runCommand?: RunCommandFn
}

export type RunCommandFn = (
  command: string,
  args: string[],
  options: {
    cwd: string
    timeoutMs: number
    maxOutputBytes: number
    env: NodeJS.ProcessEnv
  }
) => Promise<{ stdout: string; stderr: string; code: number | null; timedOut: boolean; spawnError?: string }>

export function findingId(parts: string[]): string {
  return createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 16)
}

export function improvementId(parts: string[]): string {
  return `imp-${findingId(parts)}`
}
