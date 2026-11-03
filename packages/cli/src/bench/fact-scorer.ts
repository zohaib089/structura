import type { ArmQuality, BenchQuestion } from './types.js'

/** Lowercase and collapse whitespace for substring matching. */
export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Coverage of expected facts in an answer (0–1), or unscored when no facts are listed. */
export function scoreAnswerFacts(question: BenchQuestion, answer: string): ArmQuality {
  const facts = question.expectedFacts
  if (!facts || facts.length === 0) {
    return { status: 'unscored' }
  }
  const normalizedAnswer = normalizeForMatch(answer)
  const matched: string[] = []
  const missing: string[] = []
  for (const fact of facts) {
    const needle = normalizeForMatch(fact)
    if (needle.length === 0) continue
    if (normalizedAnswer.includes(needle)) matched.push(fact)
    else missing.push(fact)
  }
  const score = facts.length === 0 ? 0 : matched.length / facts.length
  return { status: 'scored', score, matched, missing }
}
