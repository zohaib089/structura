import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { BenchQuestion, QuestionSetDocument } from './types.js'

export class QuestionSetError extends Error {
  readonly issues: readonly { path: string; message: string }[]

  constructor(message: string, issues: readonly { path: string; message: string }[]) {
    super(message)
    this.name = 'QuestionSetError'
    this.issues = issues
  }
}

const SUPPORTED_SCHEMA = '1.0.0'

function pushIssue(issues: { path: string; message: string }[], path: string, message: string): void {
  issues.push({ path, message })
}

function validateQuestion(value: unknown, index: number, issues: { path: string; message: string }[]): BenchQuestion | undefined {
  const base = `questions[${index}]`
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    pushIssue(issues, base, 'expected an object')
    return undefined
  }
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string' || record.id.trim() === '') {
    pushIssue(issues, `${base}.id`, 'required non-empty string')
  }
  if (typeof record.question !== 'string' || record.question.trim() === '') {
    pushIssue(issues, `${base}.question`, 'required non-empty string')
  }
  if (record.reference !== undefined && typeof record.reference !== 'string') {
    pushIssue(issues, `${base}.reference`, 'must be a string when present')
  }
  let expectedFacts: string[] | undefined
  if (record.expectedFacts !== undefined) {
    if (!Array.isArray(record.expectedFacts)) {
      pushIssue(issues, `${base}.expectedFacts`, 'must be an array of strings when present')
    } else {
      expectedFacts = []
      for (let factIndex = 0; factIndex < record.expectedFacts.length; factIndex++) {
        const fact = record.expectedFacts[factIndex]
        if (typeof fact !== 'string' || fact.trim() === '') {
          pushIssue(issues, `${base}.expectedFacts[${factIndex}]`, 'must be a non-empty string')
        } else {
          expectedFacts.push(fact.trim())
        }
      }
    }
  }
  if (issues.some(issue => issue.path.startsWith(base))) return undefined
  const id = (record.id as string).trim()
  return {
    id,
    question: record.question as string,
    reference: typeof record.reference === 'string' ? record.reference : undefined,
    expectedFacts: expectedFacts && expectedFacts.length > 0 ? expectedFacts : undefined
  }
}

export function parseQuestionSetJson(text: string, sourceLabel = 'question set'): QuestionSetDocument {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new QuestionSetError(`invalid JSON in ${sourceLabel}`, [{ path: '', message: 'JSON parse error' }])
  }
  const issues: { path: string; message: string }[] = []
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    pushIssue(issues, '', 'expected a JSON object')
    throw new QuestionSetError(`invalid ${sourceLabel}`, issues)
  }
  const doc = parsed as Record<string, unknown>
  if (doc.schemaVersion !== SUPPORTED_SCHEMA) {
    pushIssue(issues, 'schemaVersion', `expected "${SUPPORTED_SCHEMA}"`)
  }
  if (!Array.isArray(doc.questions)) {
    pushIssue(issues, 'questions', 'required array')
  }
  if (issues.length > 0) throw new QuestionSetError(`invalid ${sourceLabel}`, issues)

  const questions: BenchQuestion[] = []
  const seenIds = new Set<string>()
  for (let index = 0; index < (doc.questions as unknown[]).length; index++) {
    const item = validateQuestion((doc.questions as unknown[])[index], index, issues)
    if (item) {
      if (seenIds.has(item.id)) {
        pushIssue(issues, `questions[${index}].id`, `duplicate id "${item.id}"`)
      } else {
        seenIds.add(item.id)
        questions.push(item)
      }
    }
  }
  if (questions.length === 0) {
    pushIssue(issues, 'questions', 'at least one question is required')
  }
  if (issues.length > 0) throw new QuestionSetError(`invalid ${sourceLabel}`, issues)
  return { schemaVersion: SUPPORTED_SCHEMA, questions }
}

export async function loadQuestionSet(cwd: string, questionsPath: string): Promise<QuestionSetDocument> {
  const absolute = resolve(cwd, questionsPath)
  let text: string
  try {
    text = await readFile(absolute, 'utf8')
  } catch {
    throw new QuestionSetError(`cannot read question set: ${questionsPath}`, [{ path: '', message: 'file not found or unreadable' }])
  }
  return parseQuestionSetJson(text, questionsPath)
}

export function formatQuestionSetErrors(error: QuestionSetError): string {
  const lines = [error.message]
  for (const issue of error.issues) {
    lines.push(issue.path ? `  ${issue.path}: ${issue.message}` : `  ${issue.message}`)
  }
  return lines.join('\n')
}
