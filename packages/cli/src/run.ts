import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { CLI_BIN, CONFIG_FILE, GRAPH_FILE, OUT_DIR, PRODUCT_NAME, RUN_FILE } from '@atlasmith/engine'
import {
  AccountingError,
  GraphVersionUnsupported,
  InterruptedError,
  OutputRefusedError,
  StrictCoverageError,
  scanRepository,
  type LimitOverrides,
  type ScanOptions
} from '@atlasmith/engine'

export const EXIT = { ok: 0, runtime: 1, usage: 2, accounting: 3, strict: 4, interrupted: 130 } as const

export class UsageError extends Error {
  readonly exitCode = EXIT.usage
  constructor(message: string) {
    super(message)
    this.name = 'UsageError'
  }
}

export function exitCodeFor(error: unknown): number {
  if (error instanceof GraphVersionUnsupported) return EXIT.usage
  if (error instanceof UsageError || error instanceof OutputRefusedError) return EXIT.usage
  if (error instanceof AccountingError) return EXIT.accounting
  if (error instanceof StrictCoverageError) return EXIT.strict
  if (error instanceof InterruptedError) return EXIT.interrupted
  if (error && typeof error === 'object' && 'exitCode' in error && typeof (error as { exitCode: unknown }).exitCode === 'number') {
    return (error as { exitCode: number }).exitCode
  }
  return EXIT.runtime
}

export interface RunIo {
  stdout: (text: string) => void
  stderr: (text: string) => void
  cwd: string
}

function helpText(): string {
  return [
    `${PRODUCT_NAME} — local repository graph`,
    '',
    `Usage: ${CLI_BIN} scan [path]`,
    '',
    'Options:',
    '  --out <dir>           Directory for graph.json (default: <root>/' + OUT_DIR + ')',
    '  --meta <path>         Write run metadata to this path',
    '  --no-meta             Do not write ' + RUN_FILE,
    '  --json                Print run metadata to stdout',
    '  --strict              Exit ' + String(EXIT.strict) + ' when coverage thresholds fail',
    '  --include <glob>      Re-include files ignored by defaults or gitignore (repeatable)',
    '  --cache-dir <path>    Read and write the content cache here (default: OS cache, outside the root)',
    '  --no-cache            Do not read or write the cache',
    '  --max-file-size <n>   Max file size in bytes',
    '  --parse-timeout <n>   Per-file parse timeout in milliseconds',
    '  --max-files <n>       Max discovered entries',
    '  --max-depth <n>       Max directory depth',
    '  --jobs <n>            Parser worker count',
    '  -h, --help            Show this help',
    '',
    `Exit codes: 0 ok, 1 runtime, 2 usage or unsupported graph, 3 accounting failure, 4 --strict, 130 interrupted.`,
    `Repo config ${CONFIG_FILE} may only lower limits. graph.json is ${GRAPH_FILE}.`
  ].join('\n')
}

function integerFlag(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined
  if (!/^[0-9]+$/.test(value) || value === '0') throw new UsageError(`${flag} expects a positive integer`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw new UsageError(`${flag} is out of range`)
  return parsed
}

export async function run(argv: readonly string[], io: RunIo = {
  stdout: text => process.stdout.write(text),
  stderr: text => process.stderr.write(text),
  cwd: process.cwd()
}): Promise<number> {
  try {
    if (argv.length === 0) {
      io.stderr(`${helpText()}\n`)
      return EXIT.usage
    }
    if (argv.includes('--help') || argv.includes('-h') || argv[0] === 'help') {
      io.stdout(`${helpText()}\n`)
      return EXIT.ok
    }
    const [command, ...rest] = argv
    if (command !== 'scan') throw new UsageError(`unknown command "${command}". Expected: scan`)
    const parsed = parseArgs({
      args: [...rest],
      allowPositionals: true,
      strict: true,
      options: {
        out: { type: 'string' },
        meta: { type: 'string' },
        'no-meta': { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        strict: { type: 'boolean', default: false },
        include: { type: 'string', multiple: true },
        'cache-dir': { type: 'string' },
        'no-cache': { type: 'boolean', default: false },
        'max-file-size': { type: 'string' },
        'parse-timeout': { type: 'string' },
        'max-files': { type: 'string' },
        'max-depth': { type: 'string' },
        jobs: { type: 'string' }
      }
    })
    if (parsed.values.meta !== undefined && parsed.values['no-meta']) throw new UsageError('--meta and --no-meta cannot be combined')
    if (parsed.positionals.length > 1) throw new UsageError('scan accepts at most one path')
    const limits: LimitOverrides = {}
    const maxFileSizeBytes = integerFlag(parsed.values['max-file-size'], '--max-file-size')
    const parseTimeoutMs = integerFlag(parsed.values['parse-timeout'], '--parse-timeout')
    const maxFiles = integerFlag(parsed.values['max-files'], '--max-files')
    const maxDepth = integerFlag(parsed.values['max-depth'], '--max-depth')
    const jobs = integerFlag(parsed.values.jobs, '--jobs')
    if (maxFileSizeBytes !== undefined) limits.maxFileSizeBytes = maxFileSizeBytes
    if (parseTimeoutMs !== undefined) limits.parseTimeoutMs = parseTimeoutMs
    if (maxFiles !== undefined) limits.maxFiles = maxFiles
    if (maxDepth !== undefined) limits.maxDepth = maxDepth
    if (jobs !== undefined) limits.jobs = jobs
    const target = resolve(io.cwd, parsed.positionals[0] ?? '.')
    const scanOptions: ScanOptions = {
      outDir: parsed.values.out ? resolve(io.cwd, parsed.values.out) : undefined,
      metaPath: parsed.values['no-meta'] ? null : (parsed.values.meta ? resolve(io.cwd, parsed.values.meta) : undefined),
      include: parsed.values.include,
      cacheDir: parsed.values['cache-dir'] ? resolve(io.cwd, parsed.values['cache-dir']) : undefined,
      noCache: parsed.values['no-cache'],
      strict: parsed.values.strict,
      limits
    }
    const output = await scanRepository(target, scanOptions)
    const summary = output.run.redactions > 0 ? `${output.summary}\nredactions: ${output.run.redactions}` : output.summary
    if (parsed.values.json) {
      io.stdout(`${JSON.stringify(output.run)}\n`)
      io.stderr(`${summary}\n`)
    } else {
      io.stdout(`${summary}\n`)
      io.stdout(`wrote ${output.graphPath}\n`)
    }
    if (output.strictFailures.length > 0) {
      io.stderr(`${output.strictFailures.join('\n')}\n`)
      return EXIT.strict
    }
    return EXIT.ok
  } catch (error) {
    const code = exitCodeFor(error)
    const message = error instanceof Error ? error.message : String(error)
    io.stderr(`${message}\n`)
    return code
  }
}
