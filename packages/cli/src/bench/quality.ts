import type { BenchQuestion, QualityScore } from './types.js'

/**
 * Answer-quality scoring is not implemented in this slice.
 * Future work: compare model answers to optional reference notes or run an LLM judge.
 */
export interface QualityScorer {
  score(question: BenchQuestion, withGraphAnswer: string, withoutGraphAnswer: string): Promise<QualityScore | null>
}

export const qualityScorerStub: QualityScorer = {
  async score() {
    return null
  }
}
