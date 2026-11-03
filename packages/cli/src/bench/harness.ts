import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ModelAdapter } from './adapters/types.js'
import { buildPromptWithGraph, buildPromptWithoutGraph } from './prompts.js'
import type { QuestionSetDocument } from './types.js'
import {
  BENCH_RESULTS_SCHEMA_VERSION,
  type BenchResultsDocument,
  type BenchTotals,
  type QuestionBenchResult,
  type TokenCounts
} from './types.js'
import { ApproxTokenCounter, type TokenCounter } from './token-counter.js'
import { qualityScorerStub, type QualityScorer } from './quality.js'

export interface RunBenchOptions {
  cwd: string
  questions: QuestionSetDocument
  questionsPath: string
  graphPath: string | null
  adapter: ModelAdapter
  dryRun: boolean
  tokenCounter?: TokenCounter
  qualityScorer?: QualityScorer
}

function sumTokens(results: QuestionBenchResult[]): BenchTotals {
  const empty = (): TokenCounts => ({ promptTokens: 0, completionTokens: 0 })
  const totals = { withGraph: empty(), withoutGraph: empty() }
  for (const row of results) {
    totals.withGraph.promptTokens += row.withGraph.tokens.promptTokens
    totals.withGraph.completionTokens += row.withGraph.tokens.completionTokens
    totals.withoutGraph.promptTokens += row.withoutGraph.tokens.promptTokens
    totals.withoutGraph.completionTokens += row.withoutGraph.tokens.completionTokens
  }
  return totals
}

async function runArm(
  adapter: ModelAdapter,
  counter: TokenCounter,
  prompt: string
): Promise<{ prompt: string; answer: string; tokens: TokenCounts }> {
  const completion = await adapter.complete(prompt)
  return {
    prompt,
    answer: completion.text,
    tokens: {
      promptTokens: counter.count(prompt),
      completionTokens: counter.count(completion.text)
    }
  }
}

export async function runBenchHarness(options: RunBenchOptions): Promise<BenchResultsDocument> {
  const counter = options.tokenCounter ?? new ApproxTokenCounter()
  const scorer = options.qualityScorer ?? qualityScorerStub
  let graphText: string | null = null
  if (options.graphPath) {
    const absoluteGraph = resolve(options.cwd, options.graphPath)
    graphText = await readFile(absoluteGraph, 'utf8')
  }

  const questionResults: QuestionBenchResult[] = []
  for (const question of options.questions.questions) {
    const withoutPrompt = buildPromptWithoutGraph(question)
    const withPrompt =
      graphText !== null ? buildPromptWithGraph(question, graphText) : withoutPrompt

    const withoutGraph = await runArm(options.adapter, counter, withoutPrompt)
    const withGraph = await runArm(options.adapter, counter, withPrompt)
    const quality = await scorer.score(question, withGraph.answer, withoutGraph.answer)

    questionResults.push({
      id: question.id,
      withGraph,
      withoutGraph,
      quality
    })
  }

  return {
    schemaVersion: BENCH_RESULTS_SCHEMA_VERSION,
    dryRun: options.dryRun,
    adapter: options.adapter.name,
    graphPath: options.graphPath,
    questionsPath: options.questionsPath,
    questions: questionResults,
    totals: sumTokens(questionResults)
  }
}
