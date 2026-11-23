export const TS_FOLDER_NAMES: readonly string[]
export const PY_PACKAGE_NAMES: readonly string[]
export const DEFAULT_QA_QUESTIONS: readonly string[]

export interface SyntheticFilePlan {
  path: string
  language: 'typescript' | 'python'
  index: number
  total: number
  isEntry: boolean
  isShared: boolean
  isLarge: boolean
  hasDuplicate: boolean
}

export interface SyntheticRepoPlan {
  fileCount: number
  tsCount: number
  pythonCount: number
  tsFolders: string[]
  pyPackages: string[]
  files: SyntheticFilePlan[]
}

export interface GeneratedSyntheticRepo extends SyntheticRepoPlan {
  root: string
}

export interface HostInfo {
  platform: string
  release: string
  arch: string
  cpu: string
  cpuCount: number
  totalMemBytes: number
  node: string
}

export interface ScaleBenchmarkQa {
  question: string
  intent: string
  ms: number
  citations: number
  suggestions: number
}

export interface ScaleBenchmarkReport {
  fileCount: number
  generatedFiles: number
  tsCount: number
  pythonCount: number
  generateMs: number
  scanMs: number
  scanElapsedMs: number
  qaMs: number
  qaCount: number
  qa: ScaleBenchmarkQa[]
  peakRssBytes: number
  graphJsonBytes: number
  graphPath: string
  tempDir: string
  cleaned: boolean
  host: HostInfo
  graph: {
    schemaVersion: string
    files: number
    nodes: number
    edges: number
    languages: { language: string; parsed: number; partial: number }[]
    hotspots: { count: number; top: { path: string; score: number }[] }
    quality: { score: number; grade: string; folders: number; worstFolder: { path: string; score: number; grade: string } | null } | null
    duplicates: { groups: number; listed: number; duplicatedLines: number; percentage: number } | null
  }
  coverage: { discovered: number; parsed: number; partial: number; failed: number; skipped: number } | null
}

export interface RunScaleBenchmarkOptions {
  fileCount: number
  questions?: readonly string[]
  keepTemp?: boolean
  tempPrefix?: string
  tempDir?: string
  rssIntervalMs?: number
}

export function planSyntheticRepo(fileCount: number): SyntheticRepoPlan
export function generateSyntheticRepo(root: string, fileCount: number): Promise<GeneratedSyntheticRepo>
export function hostInfo(): HostInfo
export function formatBytes(bytes: number): string
export function formatMs(ms: number): string
export function runScaleBenchmark(options: RunScaleBenchmarkOptions): Promise<ScaleBenchmarkReport>
export function formatBenchmarkReport(report: ScaleBenchmarkReport): string
