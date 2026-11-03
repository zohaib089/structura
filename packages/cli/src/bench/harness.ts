import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ModelAdapter } from './adapters/types.js'
import { buildPromptWithGraph, buildPromptWithoutGraph } from './prompts.js'
import type { QuestionSetDocument } from './types.js'
import {
  BENCH_RESULTS_SCHEMA_VERSION,
  type ArmQuality,
  type ArmResult,
  type BenchResultsDocument,
  type BenchTotals,
  type QualityAggregate,
  type QuestionBenchResult,
  type TokenCounts
} from './types.js'
import { ApproxTokenCounter, type TokenCounter } from './token-counter.js'
import { scoreArm, type BenchQualityOptions } from './quality.js'

export interface RunBenchOptions {
  cwd: string
  questions: QuestionSetDocument
  questionsPath: string
  graphPath: string | null
  adapter: ModelAdapter
  dryRun: boolean
  llmJudge?: boolean
  tokenCounter?: TokenCounter
  qualityOptions?: BenchQualityOptions
}

function sumTokens(results: QuestionBenchResult[]): Pick<BenchTotals, 'withGraph' | 'withoutGraph'> {
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

function aggregateQuality(arms: ArmResult[], pick: (row: ArmResult) => ArmQuality): QualityAggregate {
  let sum = 0
  let scoredCount = 0
  for (const arm of arms) {
    const quality = pick(arm)
    if (quality.status === 'scored') {
      sum += quality.score
      scoredCount++
    }
  }
  return {
    meanScore: scoredCount > 0 ? sum / scoredCount : null,
    scoredCount
  }
}

async function runArm(
  adapter: ModelAdapter,
  counter: TokenCounter,
  prompt: string,
  question: QuestionSetDocument['questions'][number],
  qualityOptions: BenchQualityOptions
): Promise<ArmResult> {
  const completion = await adapter.complete(prompt)
  const answer = completion.text
  const scored = await scoreArm(question, answer, adapter, qualityOptions)
  const arm: ArmResult = {
    prompt,
    answer,
    tokens: {
      promptTokens: counter.count(prompt),
      completionTokens: counter.count(answer)
    },
    quality: scored.quality
  }
  if (qualityOptions.llmJudge) {
    arm.llmJudge = scored.llmJudge ?? null
  }
  return arm
}

export async function runBenchHarness(options: RunBenchOptions): Promise<BenchResultsDocument> {
  const counter = options.tokenCounter ?? new ApproxTokenCounter()
  const qualityOptions: BenchQualityOptions = options.qualityOptions ?? {
    llmJudge: options.llmJudge ?? false
  }
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

    const withoutGraph = await runArm(options.adapter, counter, withoutPrompt, question, qualityOptions)
    const withGraph = await runArm(options.adapter, counter, withPrompt, question, qualityOptions)

    questionResults.push({
      id: question.id,
      withGraph,
      withoutGraph
    })
  }

  const tokenTotals = sumTokens(questionResults)
  return {
    schemaVersion: BENCH_RESULTS_SCHEMA_VERSION,
    dryRun: options.dryRun,
    llmJudge: qualityOptions.llmJudge,
    adapter: options.adapter.name,
    graphPath: options.graphPath,
    questionsPath: options.questionsPath,
    questions: questionResults,
    totals: {
      ...tokenTotals,
      quality: {
        withGraph: aggregateQuality(
          questionResults.map(row => row.withGraph),
          arm => arm.quality
        ),
        withoutGraph: aggregateQuality(
          questionResults.map(row => row.withoutGraph),
          arm => arm.quality
        )
      }
    }
  }
}
