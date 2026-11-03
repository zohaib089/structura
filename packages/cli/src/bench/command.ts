import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { CLI_BIN } from '@atlasmith/engine'
import { UsageError, type RunIo } from '../run.js'
import { EXIT } from '../run.js'
import { EchoModelAdapter } from './adapters/echo.js'
import { OllamaModelAdapter } from './adapters/ollama.js'
import { OpenAiCompatibleModelAdapter, defaultOpenAiKeyEnvVar } from './adapters/openai-compatible.js'
import type { ModelAdapter } from './adapters/types.js'
import { runBenchHarness } from './harness.js'
import { QuestionSetError, formatQuestionSetErrors, loadQuestionSet } from './question-set.js'
import { escapeTerminal } from '@atlasmith/engine'

export function benchHelpText(): string {
  return [
    `Usage: ${CLI_BIN} bench --questions <file.json> [--graph <graph.json>] [--out <results.json>]`,
    '       [--dry-run] [--adapter echo|ollama|openai] [--llm-judge]',
    '',
    'Runs each question twice: with graph.json context and without, recording token counts and answer quality.',
    'Use --dry-run for offline runs (echo adapter, no network).',
    '',
    'Options:',
    '  --questions <path>   Question set JSON (required)',
    '  --graph <path>       graph.json for the with-context arm (optional)',
    '  --out <path>         Results JSON (default: bench-results.json in cwd)',
    '  --dry-run            Use the echo adapter; no network calls',
    '  --adapter <name>     echo (default with --dry-run), ollama, or openai',
    '  --ollama-url <url>   Ollama base URL (default: http://127.0.0.1:11434)',
    '  --ollama-model <id>  Ollama model name',
    '  --openai-url <url>   OpenAI-compatible base URL',
    '  --openai-model <id>  Model name for openai adapter',
    '  --llm-judge           Also score answers with an LLM judge via the model adapter',
    '  -h, --help           Show bench help'
  ].join('\n')
}

function resolveAdapter(
  dryRun: boolean,
  adapterName: string | undefined,
  values: {
    'ollama-url'?: string
    'ollama-model'?: string
    'openai-url'?: string
    'openai-model'?: string
  }
): ModelAdapter {
  const name = dryRun ? 'echo' : (adapterName ?? 'ollama')
  if (dryRun && adapterName && adapterName !== 'echo') {
    throw new UsageError('--dry-run only supports the echo adapter')
  }
  if (name === 'echo') return new EchoModelAdapter()
  if (name === 'ollama') {
    return new OllamaModelAdapter({
      baseUrl: values['ollama-url'],
      model: values['ollama-model']
    })
  }
  if (name === 'openai') {
    return new OpenAiCompatibleModelAdapter({
      baseUrl: values['openai-url'],
      model: values['openai-model'],
      apiKeyEnvVar: defaultOpenAiKeyEnvVar()
    })
  }
  throw new UsageError(`unknown bench adapter "${name}". Expected: echo, ollama, openai`)
}

export async function runBench(argv: readonly string[], io: RunIo): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout(`${benchHelpText()}\n`)
    return EXIT.ok
  }

  let parsed
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: false,
      strict: true,
      options: {
        questions: { type: 'string' },
        graph: { type: 'string' },
        out: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        adapter: { type: 'string' },
        'ollama-url': { type: 'string' },
        'ollama-model': { type: 'string' },
        'openai-url': { type: 'string' },
        'openai-model': { type: 'string' },
        'llm-judge': { type: 'boolean', default: false }
      }
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      const message =
        'message' in error && typeof (error as { message: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'unknown option'
      throw new UsageError(message)
    }
    throw error
  }

  if (!parsed.values.questions) {
    throw new UsageError('--questions is required')
  }

  const dryRun = parsed.values['dry-run'] ?? false
  const llmJudge = parsed.values['llm-judge'] ?? false
  const outPath = resolve(io.cwd, parsed.values.out ?? 'bench-results.json')
  const questionsPath = parsed.values.questions
  const graphPath = parsed.values.graph ?? null

  let questionSet
  try {
    questionSet = await loadQuestionSet(io.cwd, questionsPath)
  } catch (error) {
    if (error instanceof QuestionSetError) {
      throw new UsageError(formatQuestionSetErrors(error))
    }
    throw error
  }

  const adapter = resolveAdapter(dryRun, parsed.values.adapter, parsed.values)
  const results = await runBenchHarness({
    cwd: io.cwd,
    questions: questionSet,
    questionsPath,
    graphPath,
    adapter,
    dryRun,
    llmJudge
  })

  await writeFile(outPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8')
  io.stdout(
    `${escapeTerminal(`bench: ${results.questions.length} question(s); wrote ${outPath}`)}\n`
  )
  return EXIT.ok
}
