import type { ModelAdapter } from './adapters/types.js'
import { scoreAnswerFacts } from './fact-scorer.js'
import { runLlmJudge } from './llm-judge.js'
import type { ArmQuality, BenchQuestion, LlmJudgeScore } from './types.js'

export interface BenchQualityOptions {
  llmJudge: boolean
  /** When set, used for judge calls instead of the bench completion adapter. */
  judgeAdapter?: ModelAdapter
}

export interface ArmQualityResult {
  quality: ArmQuality
  llmJudge?: LlmJudgeScore | null
}

export async function scoreArm(
  question: BenchQuestion,
  answer: string,
  benchAdapter: ModelAdapter,
  options: BenchQualityOptions
): Promise<ArmQualityResult> {
  const quality = scoreAnswerFacts(question, answer)
  if (!options.llmJudge) {
    return { quality }
  }
  const judgeAdapter = options.judgeAdapter ?? benchAdapter
  const llmJudge = await runLlmJudge(judgeAdapter, question, answer)
  return { quality, llmJudge }
}
