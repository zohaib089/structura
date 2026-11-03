import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { CANARY_GRAPH_PATH } from '@atlasmith/engine'
import { EchoModelAdapter } from './adapters/echo.js'
import { OllamaModelAdapter } from './adapters/ollama.js'
import { OpenAiCompatibleModelAdapter } from './adapters/openai-compatible.js'
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
  assert.throws(
    () =>
      parseQuestionSetJson(
        JSON.stringify({ schemaVersion: '9.9.9', questions: [{ id: 'x', question: 'y' }] })
      ),
    error => error instanceof QuestionSetError && /schemaVersion/.test(formatQuestionSetErrors(error))
  )
  assert.throws(
    () =>
      parseQuestionSetJson(
        JSON.stringify({
          schemaVersion: '1.0.0',
          questions: [
            { id: 'dup', question: 'one' },
            { id: 'dup', question: 'two' }
          ]
        })
      ),
    error => error instanceof QuestionSetError && /duplicate id/.test(formatQuestionSetErrors(error))
  )
})

test('loadQuestionSet reads fixture example', async () => {
  const doc = await loadQuestionSet(join(import.meta.dirname, '../..'), 'fixtures/bench/example-questions.json')
  assert.equal(doc.questions[0]?.id, 'entry-points')
})

test('ApproxTokenCounter approximates by length', () => {
  const counter = new ApproxTokenCounter()
  assert.equal(counter.count(''), 0)
  assert.equal(counter.count('abcd'), 1)
  assert.equal(counter.count('abcdefgh'), 2)
})

test('prompt builders differ when graph context is present', () => {
  const question = { id: 'q1', question: 'What connects to main?' }
  const without = buildPromptWithoutGraph(question)
  assert.equal(without, 'What connects to main?')
  const graphSnippet = '{"nodes":[]}'
  const withGraph = buildPromptWithGraph(question, graphSnippet)
  assert.match(withGraph, /graph\.json/)
  assert.match(withGraph, /What connects to main\?/)
  assert.ok(withGraph.length > without.length)
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
    assert.equal(results.questions.length, 1)
    assert.ok(results.questions[0]!.withGraph.tokens.promptTokens > results.questions[0]!.withoutGraph.tokens.promptTokens)
    assert.equal(results.questions[0]!.quality, null)
    assert.ok(results.totals.withGraph.promptTokens >= results.totals.withoutGraph.promptTokens)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('Ollama adapter uses injected fetch without global network', async () => {
  let calledUrl = ''
  const adapter = new OllamaModelAdapter({
    fetchImpl: async (url, init) => {
      calledUrl = String(url)
      assert.equal(init?.method, 'POST')
      return new Response(JSON.stringify({ response: 'from-ollama' }), { status: 200 })
    }
  })
  const result = await adapter.complete('hello')
  assert.match(calledUrl, /11434\/api\/generate/)
  assert.equal(result.text, 'from-ollama')
})

test('OpenAI-compatible adapter sends bearer token via injected fetch', async () => {
  const previous = process.env.ATLASMITH_BENCH_API_KEY
  process.env.ATLASMITH_BENCH_API_KEY = 'test-secret-key'
  try {
    let authHeader = ''
    const adapter = new OpenAiCompatibleModelAdapter({
      apiKeyEnvVar: 'ATLASMITH_BENCH_API_KEY',
      fetchImpl: async (_url, init) => {
        authHeader = String((init?.headers as Record<string, string>).authorization)
        return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })
      }
    })
    const result = await adapter.complete('prompt')
    assert.equal(authHeader, 'Bearer test-secret-key')
    assert.equal(result.text, 'ok')
  } finally {
    if (previous === undefined) delete process.env.ATLASMITH_BENCH_API_KEY
    else process.env.ATLASMITH_BENCH_API_KEY = previous
  }
})

test('bench CLI dry-run end-to-end writes results file', async () => {
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
    assert.match(cap.stdout, /wrote/)
    const written = JSON.parse(readFileSync(out, 'utf8')) as { dryRun: boolean; totals: { withGraph: { promptTokens: number } } }
    assert.equal(written.dryRun, true)
    assert.ok(written.totals.withGraph.promptTokens > 0)
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
    const code = await run(['bench', '--questions', bad, '--dry-run'], cap.io)
    assert.equal(code, EXIT.usage)
    assert.match(cap.stderr, /at least one question/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
