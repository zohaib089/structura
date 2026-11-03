import { createHash } from 'node:crypto'

export {
  REPORT_SCHEMA_VERSION,
  type AnalyserRunStatus,
  type FindingSection,
  type Severity,
  type FindingProvenance,
  type AnalyserStatus,
  type ScanFinding,
  type ScanImprovement,
  type HistoryCommit,
  type HistoryAuthor,
  type HistoryFileChurn,
  type HistoryHotspot,
  type HistoryPayload,
  type ScanReport
} from './report.v1.types.js'

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
