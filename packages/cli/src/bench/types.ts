/** Bench results schema version written to the results file. */
export const BENCH_RESULTS_SCHEMA_VERSION = '1.0.0'

export interface BenchQuestion {
  id: string
  question: string
  /** Optional reference answer or grading notes (quality scoring not implemented yet). */
  reference?: string
}

export interface QuestionSetDocument {
  schemaVersion: string
  questions: BenchQuestion[]
}

export interface TokenCounts {
  promptTokens: number
  completionTokens: number
}

export interface ArmResult {
  prompt: string
  answer: string
  tokens: TokenCounts
}

export interface QuestionBenchResult {
  id: string
  withGraph: ArmResult
  withoutGraph: ArmResult
  /** Reserved for future answer-quality scoring; always null in this slice. */
  quality: QualityScore | null
}

export interface QualityScore {
  withGraph: number | null
  withoutGraph: number | null
  notes?: string
}

export interface BenchTotals {
  withGraph: TokenCounts
  withoutGraph: TokenCounts
}

export interface BenchResultsDocument {
  schemaVersion: string
  dryRun: boolean
  adapter: string
  graphPath: string | null
  questionsPath: string
  questions: QuestionBenchResult[]
  totals: BenchTotals
}

export type BenchArm = 'withGraph' | 'withoutGraph'
