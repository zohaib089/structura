import type { BenchQuestion } from './types.js'

const GRAPH_CONTEXT_HEADER =
  'Use the following repository architecture graph (graph.json) as context when answering.\n\n--- graph.json ---\n'

const GRAPH_CONTEXT_FOOTER = '\n--- end graph.json ---\n\n'

export function buildPromptWithoutGraph(question: BenchQuestion): string {
  return question.question.trim()
}

export function buildPromptWithGraph(question: BenchQuestion, graphJsonText: string): string {
  const trimmedGraph = graphJsonText.trim()
  return `${GRAPH_CONTEXT_HEADER}${trimmedGraph}${GRAPH_CONTEXT_FOOTER}Question:\n${question.question.trim()}`
}
