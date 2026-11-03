import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { CANARY_GRAPH_PATH } from '@atlasmith/engine'
import { EchoModelAdapter } from './adapters/echo.js'
import type { ModelAdapter, ModelCompletion } from './adapters/types.js'
import { OllamaModelAdapter } from './adapters/ollama.js'
import { BENCH_API_KEY_ENV, OpenAiCompatibleModelAdapter } from './adapters/openai-compatible.js'
import { normalizeForMatch, scoreAnswerFacts } from './fact-scorer.js'
import { parseJudgeResponse } from './llm-judge.js'
import { runBenchHarness } from './harness.js'
import {
  QuestionSetError,
  formatQuestionSetErrors,
  loadQuestionSet,
  parseQuestionSetJson
} from './question-set.js'
import { buildPromptWithGraph, buildPromptWithoutGraph } from './prompts.js'
import { ApproxTokenCounter } from './token-counter.js'
import { EXIT, run } from '../run.js'

const EXAMPLE_QUESTIONS = join(import.meta.dirname, '../../fixtures/bench/example-questions.json')

class StaticAdapter implements ModelAdapter {
  readonly name = 'static'
  constructor(private readonly text: string) {}
  async complete(): Promise<ModelCompletion> {
    return { text: this.text }
  }
}

function capture(): {
  stdout: string
  stderr: string
  io: { stdout: (text: string) => void; stderr: (text: string) => void; cwd: string }
} {
  const chunks = { stdout: '', stderr: '' }
  return {
    get stdout() {
      return chunks.stdout
    },
    get stderr() {
      return chunks.stderr
    },
    io: {
      stdout: text => {
        chunks.stdout += text
      },
      stderr: text => {
        chunks.stderr += text
      },
      cwd: process.cwd()
    }
  }
}

test('normalizeForMatch lowercases and collapses whitespace', () => {
  assert.equal(normalizeForMatch('  Hello   World \n'), 'hello world')
})

test('scoreAnswerFacts covers expected facts deterministically', () => {
  const question = {
    id: 'q',
    question: 'Q',
    expectedFacts: ['TypeScript', '  graph.json  ', 'missing']
  }
  const scored = scoreAnswerFacts(question, 'This mentions typescript and graph.json in the answer.')
  assert.equal(scored.status, 'scored')
  if (scored.status !== 'scored') return
  assert.equal(scored.score, 2 / 3)
  assert.deepEqual(scored.matched, ['TypeScript', '  graph.json  '])
  assert.deepEqual(scored.missing, ['missing'])
})

test('scoreAnswerFacts marks questions without expectedFacts as unscored', () => {
  assert.equal(scoreAnswerFacts({ id: 'q', question: 'Q' }, 'anything').status, 'unscored')
  assert.equal(scoreAnswerFacts({ id: 'q', question: 'Q', expectedFacts: [] }, 'x').status, 'unscored')
})

test('parseQuestionSetJson validates expectedFacts', () => {
  assert.throws(
    () =>
      parseQuestionSetJson(
        JSON.stringify({
          schemaVersion: '1.0.0',
          questions: [{ id: 'a', question: 'Q?', expectedFacts: ['ok', ''] }]
        })
      ),
    error => error instanceof QuestionSetError && /expectedFacts\[1\]/.test(formatQuestionSetErrors(error))
  )
  const doc = parseQuestionSetJson(
    JSON.stringify({
      schemaVersion: '1.0.0',
      questions: [{ id: 'a', question: 'Q?', expectedFacts: ['  fact  '] }]
    })
  )
  assert.deepEqual(doc.questions[0]?.expectedFacts, ['fact'])
})

test('parseQuestionSetJson validates schema and fields', () => {
  const valid = parseQuestionSetJson(
    JSON.stringify({
      schemaVersion: '1.0.0',
      questions: [{ id: 'a', question: 'Q?' }]
    })
  )
  assert.equal(valid.questions.length, 1)
  assert.throws(
    () => parseQuestionSetJson('{'),
    error => error instanceof QuestionSetError && error.issues[0]?.message === 'JSON parse error'
  )
})

test('loadQuestionSet reads fixture example', async () => {
  const doc = await loadQuestionSet(join(import.meta.dirname, '../..'), 'fixtures/bench/example-questions.json')
  assert.equal(doc.questions[0]?.id, 'entry-points')
  assert.ok(doc.questions[0]?.expectedFacts?.length)
})

test('ApproxTokenCounter approximates by length', () => {
  const counter = new ApproxTokenCounter()
  assert.equal(counter.count(''), 0)
  assert.equal(counter.count('abcd'), 1)
})

test('prompt builders differ when graph context is present', () => {
  const question = { id: 'q1', question: 'What connects to main?' }
  const without = buildPromptWithoutGraph(question)
  assert.equal(without, 'What connects to main?')
  const withGraph = buildPromptWithGraph(question, '{"nodes":[]}')
  assert.ok(withGraph.length > without.length)
})

test('parseJudgeResponse reads JSON score payloads', () => {
  assert.deepEqual(parseJudgeResponse('prefix {"score":0.75,"rationale":"good"} suffix'), {
    score: 0.75,
    rationale: 'good'
  })
  assert.equal(parseJudgeResponse('not json'), null)
})

test('runBenchHarness leaves llmJudge off by default', async () => {
  const results = await runBenchHarness({
    cwd: process.cwd(),
    questions: parseQuestionSetJson(
      JSON.stringify({
        schemaVersion: '1.0.0',
        questions: [{ id: 'q', question: 'Q?', expectedFacts: ['echo'] }]
      })
    ),
    questionsPath: 'inline.json',
    graphPath: null,
    adapter: new EchoModelAdapter(),
    dryRun: true
  })
  assert.equal(results.llmJudge, false)
  assert.equal(results.questions[0]!.withGraph.llmJudge, undefined)
})

test('runBenchHarness aggregates fact scores and enables optional llm judge', async () => {
  const judgeAdapter = new StaticAdapter('{"score":1,"rationale":"perfect"}')
  const answerAdapter = new StaticAdapter('answer mentions entry and main')
  const results = await runBenchHarness({
    cwd: process.cwd(),
    questions: parseQuestionSetJson(readFileSync(EXAMPLE_QUESTIONS, 'utf8')),
    questionsPath: EXAMPLE_QUESTIONS,
    graphPath: null,
    adapter: answerAdapter,
    dryRun: false,
    qualityOptions: { llmJudge: true, judgeAdapter }
  })
  assert.equal(results.llmJudge, true)
  const arm = results.questions[0]!.withoutGraph
  assert.equal(arm.quality.status, 'scored')
  if (arm.quality.status === 'scored') assert.equal(arm.quality.score, 1)
  assert.deepEqual(arm.llmJudge, { score: 1, rationale: 'perfect' })
  assert.equal(results.totals.quality.withoutGraph.scoredCount, 1)
  assert.equal(results.totals.quality.withoutGraph.meanScore, 1)
})

test('runBenchHarness dry-run records tokens for both arms', async () => {
  const graphText = readFileSync(CANARY_GRAPH_PATH, 'utf8')
  const tmp = mkdtempSync(join(tmpdir(), 'bench-harness-'))
  const graphPath = join(tmp, 'graph.json')
  writeFileSync(graphPath, graphText)
  try {
    const results = await runBenchHarness({
      cwd: tmp,
      questions: parseQuestionSetJson(readFileSync(EXAMPLE_QUESTIONS, 'utf8')),
      questionsPath: EXAMPLE_QUESTIONS,
      graphPath: 'graph.json',
      adapter: new EchoModelAdapter(),
      dryRun: true
    })
    assert.equal(results.dryRun, true)
    assert.equal(results.questions[0]!.withGraph.quality.status, 'scored')
    assert.ok(results.totals.withGraph.promptTokens >= results.totals.withoutGraph.promptTokens)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('Ollama adapter uses injected fetch without global network', async () => {
  const adapter = new OllamaModelAdapter({
    fetchImpl: async () => new Response(JSON.stringify({ response: 'from-ollama' }), { status: 200 })
  })
  assert.equal((await adapter.complete('hello')).text, 'from-ollama')
})

test('OpenAI-compatible adapter sends bearer token via injected fetch', async () => {
  const previous = process.env[BENCH_API_KEY_ENV]
  process.env[BENCH_API_KEY_ENV] = 'test-secret-key'
  try {
    let authHeader = ''
    const adapter = new OpenAiCompatibleModelAdapter({
      apiKeyEnvVar: BENCH_API_KEY_ENV,
      fetchImpl: async (_url, init) => {
        authHeader = String((init?.headers as Record<string, string>).authorization)
        return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })
      }
    })
    await adapter.complete('prompt')
    assert.equal(authHeader, 'Bearer test-secret-key')
  } finally {
    if (previous === undefined) delete process.env[BENCH_API_KEY_ENV]
    else process.env[BENCH_API_KEY_ENV] = previous
  }
})

test('bench CLI dry-run end-to-end writes results file with scores', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bench-cli-'))
  const out = join(dir, 'out.json')
  const cap = capture()
  cap.io.cwd = dir
  try {
    const code = await run(
      [
        'bench',
        '--questions',
        EXAMPLE_QUESTIONS,
        '--graph',
        CANARY_GRAPH_PATH,
        '--dry-run',
        '--out',
        out
      ],
      cap.io
    )
    assert.equal(code, EXIT.ok)
    const written = JSON.parse(readFileSync(out, 'utf8')) as {
      dryRun: boolean
      llmJudge: boolean
      totals: { quality: { withGraph: { scoredCount: number } } }
      questions: { withGraph: { quality: { status: string } } }[]
    }
    assert.equal(written.dryRun, true)
    assert.equal(written.llmJudge, false)
    assert.equal(written.totals.quality.withGraph.scoredCount, 1)
    assert.equal(written.questions[0]?.withGraph.quality.status, 'scored')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('bench CLI rejects invalid question set with usage exit', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bench-bad-'))
  const bad = join(dir, 'bad.json')
  writeFileSync(bad, '{"schemaVersion":"1.0.0","questions":[]}')
  const cap = capture()
  cap.io.cwd = dir
  try {
    assert.equal(await run(['bench', '--questions', bad, '--dry-run'], cap.io), EXIT.usage)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
