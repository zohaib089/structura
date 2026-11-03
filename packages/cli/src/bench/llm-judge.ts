import type { ModelAdapter } from './adapters/types.js'
import type { BenchQuestion, LlmJudgeScore } from './types.js'

export function buildJudgePrompt(question: BenchQuestion, answer: string): string {
  const reference =
    question.reference !== undefined && question.reference.trim() !== ''
      ? `\nReference notes: ${question.reference.trim()}`
      : ''
  const facts =
    question.expectedFacts && question.expectedFacts.length > 0
      ? `\nExpected facts: ${question.expectedFacts.join('; ')}`
      : ''
  return [
    'You are grading how well an answer addresses a question.',
    'Reply with a single JSON object only: {"score":<number between 0 and 1>,"rationale":<string>}.',
    '',
    `Question: ${question.question.trim()}${reference}${facts}`,
    '',
    `Answer:\n${answer.trim()}`
  ].join('\n')
}

export function parseJudgeResponse(text: string): LlmJudgeScore | null {
  const trimmed = text.trim()
  const jsonStart = trimmed.indexOf('{')
  const jsonEnd = trimmed.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd <= jsonStart) return null
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as { score?: unknown; rationale?: unknown }
    if (typeof parsed.score !== 'number' || Number.isNaN(parsed.score)) return null
    const score = Math.min(1, Math.max(0, parsed.score))
    const rationale = typeof parsed.rationale === 'string' ? parsed.rationale : ''
    return { score, rationale }
  } catch {
    return null
  }
}

export async function runLlmJudge(
  adapter: ModelAdapter,
  question: BenchQuestion,
  answer: string
): Promise<LlmJudgeScore | null> {
  const completion = await adapter.complete(buildJudgePrompt(question, answer))
  return parseJudgeResponse(completion.text)
}
