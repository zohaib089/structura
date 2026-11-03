/** Bench results schema version written to the results file. */
export const BENCH_RESULTS_SCHEMA_VERSION = '1.1.0'

export interface BenchQuestion {
  id: string
  question: string
  /** Optional human notes; also shown to the LLM judge when enabled. */
  reference?: string
  /** Expected facts or keywords for deterministic coverage scoring (optional). */
  expectedFacts?: string[]
}

export interface QuestionSetDocument {
  schemaVersion: string
  questions: BenchQuestion[]
}

export interface TokenCounts {
  promptTokens: number
  completionTokens: number
}

export type ArmQuality =
  | { status: 'unscored' }
  | { status: 'scored'; score: number; matched: string[]; missing: string[] }

export interface LlmJudgeScore {
  score: number
  rationale: string
}

export interface ArmResult {
  prompt: string
  answer: string
  tokens: TokenCounts
  quality: ArmQuality
  /** Present only when --llm-judge is enabled. */
  llmJudge?: LlmJudgeScore | null
}

export interface QuestionBenchResult {
  id: string
  withGraph: ArmResult
  withoutGraph: ArmResult
}

export interface QualityAggregate {
  meanScore: number | null
  scoredCount: number
}

export interface BenchTotals {
  withGraph: TokenCounts
  withoutGraph: TokenCounts
  quality: {
    withGraph: QualityAggregate
    withoutGraph: QualityAggregate
  }
}

export interface BenchResultsDocument {
  schemaVersion: string
  dryRun: boolean
  llmJudge: boolean
  adapter: string
  graphPath: string | null
  questionsPath: string
  questions: QuestionBenchResult[]
  totals: BenchTotals
}

export type BenchArm = 'withGraph' | 'withoutGraph'
