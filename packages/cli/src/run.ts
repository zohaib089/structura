import { dirname, resolve, join } from 'node:path'
import { access, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { CLI_BIN, CONFIG_FILE, GRAPH_FILE, OUT_DIR, PRODUCT_NAME, RUN_FILE } from '@atlasmith/engine'
import { runScanAnalysis } from '@atlasmith/scan-analysis'
import {
  AccountingError,
  ArchitectureConfigError,
  GraphReadError,
  GraphVersionUnsupported,
  InterruptedError,
  MaxFilesExceeded,
  OutputRefusedError,
  ScanRootError,
  StrictCoverageError,
  escapeTerminal,
  scanRepository,
  type LimitOverrides,
  type ScanOptions
} from '@atlasmith/engine'
import { graphCommandExitCode, runExplain, runQuery } from './graph-commands.js'
import { exportCommandExitCode, runExport } from './export-commands.js'
import { resolveScanTarget } from './scan-target.js'

export const EXIT = { ok: 0, runtime: 1, usage: 2, accounting: 3, strict: 4, interrupted: 130 } as const

export class UsageError extends Error {
  readonly exitCode = EXIT.usage
  constructor(message: string) {
    super(message)
    this.name = 'UsageError'
  }
}

export function exitCodeFor(error: unknown): number {
  const exportCode = exportCommandExitCode(error)
  if (exportCode !== undefined) return exportCode
  const graphCode = graphCommandExitCode(error)
  if (graphCode !== undefined) return graphCode
  if (error instanceof GraphReadError || error instanceof GraphVersionUnsupported) return EXIT.usage
  if (error instanceof UsageError || error instanceof OutputRefusedError) return EXIT.usage
  if (error instanceof MaxFilesExceeded || error instanceof ScanRootError) return EXIT.usage
  if (error instanceof ArchitectureConfigError) return EXIT.usage
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
    `Usage: ${CLI_BIN} scan [path|git-url]`,
    `       ${CLI_BIN} query <graph.json> [--kind <kind>] [--type <type>] [--from <id|path>] [--to <id|path>] [--path <glob>] [--limit <n>] [--json]`,
    `       ${CLI_BIN} explain <graph.json> <id|path> [--json]`,
    `       ${CLI_BIN} export --format <mermaid|structurizr|likec4|obsidian|svg> [--graph <path>] [--out <path>]`,
    '',
    'Options:',
    '  --out <path>          Output directory, or a .json file path (default: <root>/' + OUT_DIR + ')',
    '  --meta <path>         Write run metadata to this path',
    '  --no-meta             Do not write ' + RUN_FILE,
    '  --json                Print run metadata to stdout',
    '  --strict              Exit ' + String(EXIT.strict) + ' when coverage thresholds fail',
    '  --strict-architecture Exit ' + String(EXIT.strict) + ' when declared architecture rules fail',
    '  --config <path>       Declared architecture config (default: <root>/' + CONFIG_FILE + ')',
    '  --include <glob>      Re-include files ignored by defaults or gitignore (repeatable)',
    '  --cache-dir <path>    Read and write the content cache here (default: OS cache, outside the root)',
    '  --cache <path>        Incremental rescan manifest (default: <out>/cache.json)',
    '  --no-cache            Do not read or write caches',
    '  --verbose             Include cache hit/miss/removed counts in the summary',
    '  --max-file-size <n>   Max file size in bytes',
    '  --parse-timeout <n>   Per-file parse timeout in milliseconds',
    '  --max-files <n>       Max discovered entries',
    '  --max-depth <n>       Max directory depth',
    '  --jobs <n>            Parser worker count',
    '  --branch <name>       Git branch to clone when scanning an https GitHub/GitLab URL',
    '  --report              Write report.json next to graph.json (offline analysis)',
    '  -h, --help            Show this help',
    '',
    'Query reads an existing graph.json (nodes by default; edges when --type, --from, or --to is set).',
    'Explain prints one node: kind, label, span, provenance, edges by type, and file coverage.',
    'Export converts graph.json into mermaid, Structurizr DSL, LikeC4, Obsidian notes, or SVG.',
    `Default export graph path: <cwd>/${OUT_DIR}/${GRAPH_FILE}. Obsidian requires --out directory.`,
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
    if (command === 'query') return await runQuery(rest, io)
    if (command === 'explain') return await runExplain(rest, io)
    if (command === 'export') return await runExport(rest, io)
    if (command !== 'scan') throw new UsageError(`unknown command "${command}". Expected: scan, query, explain, export`)
    let parsed
    try {
      parsed = parseArgs({
      args: [...rest],
      allowPositionals: true,
      strict: true,
      options: {
        out: { type: 'string' },
        meta: { type: 'string' },
        'no-meta': { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        strict: { type: 'boolean', default: false },
        'strict-architecture': { type: 'boolean', default: false },
        config: { type: 'string' },
        include: { type: 'string', multiple: true },
        'cache-dir': { type: 'string' },
        cache: { type: 'string' },
        'no-cache': { type: 'boolean', default: false },
        verbose: { type: 'boolean', default: false },
        'max-file-size': { type: 'string' },
        'parse-timeout': { type: 'string' },
        'max-files': { type: 'string' },
        'max-depth': { type: 'string' },
        jobs: { type: 'string' },
        branch: { type: 'string' },
        report: { type: 'boolean', default: false }
      }
    })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
        const message = 'message' in error && typeof (error as { message: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'unknown option'
        throw new UsageError(message)
      }
      throw error
    }
    if (parsed.values.meta !== undefined && parsed.values['no-meta']) throw new UsageError('--meta and --no-meta cannot be combined')
    if (parsed.values['cache-dir'] && parsed.values['no-cache']) throw new UsageError('--cache-dir and --no-cache cannot be combined')
    if (parsed.values.cache && parsed.values['no-cache']) throw new UsageError('--cache and --no-cache cannot be combined')
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
    const targetArg = parsed.positionals[0] ?? '.'
    let outDir: string | undefined
    let graphPath: string | undefined
    if (parsed.values.out) {
      const resolvedOut = resolve(io.cwd, parsed.values.out)
      if (resolvedOut.endsWith('.json')) {
        graphPath = resolvedOut
        outDir = dirname(resolvedOut)
      } else {
        outDir = resolvedOut
      }
    }
    const scanOptions: ScanOptions = {
      outDir,
      graphPath,
      metaPath: parsed.values['no-meta'] ? null : (parsed.values.meta ? resolve(io.cwd, parsed.values.meta) : undefined),
      include: parsed.values.include,
      cacheDir: parsed.values['cache-dir'] ? resolve(io.cwd, parsed.values['cache-dir']) : undefined,
      cachePath: parsed.values.cache ? resolve(io.cwd, parsed.values.cache) : undefined,
      noCache: parsed.values['no-cache'],
      verbose: parsed.values.verbose,
      strict: parsed.values.strict,
      strictArchitecture: parsed.values['strict-architecture'],
      configPath: parsed.values.config,
      limits
    }
    const resolved = await resolveScanTarget(targetArg, {
      branch: parsed.values.branch,
      cwd: io.cwd
    })
    let cleanupClone = resolved.cleanup
    const onInterrupt = () => {
      void cleanupClone().finally(() => process.exit(EXIT.interrupted))
    }
    process.once('SIGINT', onInterrupt)
    let output
    try {
      output = await scanRepository(resolved.path, scanOptions)
    } finally {
      process.off('SIGINT', onInterrupt)
      await cleanupClone()
      cleanupClone = async () => undefined
    }
    const summary = output.run.redactions > 0 ? `${output.summary}\nredactions: ${output.run.redactions}` : output.summary
    if (parsed.values.json) {
      io.stdout(`${JSON.stringify({ ...output.run, coverage: output.graph.coverage })}\n`)
      io.stderr(`${escapeTerminal(summary)}\n`)
    } else {
      io.stdout(`${escapeTerminal(summary)}\n`)
      io.stdout(`${escapeTerminal(`wrote ${output.graphPath}`)}\n`)
    }
    if (output.strictFailures.length > 0) {
      io.stderr(`${escapeTerminal(output.strictFailures.join('\n'))}\n`)
      return EXIT.strict
    }
    if (parsed.values.report) {
      const hasGit = await access(join(resolved.path, '.git')).then(() => true).catch(() => false)
      const report = await runScanAnalysis({
        rootDir: resolved.path,
        graph: output.graph,
        hasGit
      })
      const reportPath = join(dirname(output.graphPath), 'report.json')
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
      if (!parsed.values.json) {
        io.stdout(`${escapeTerminal(`wrote ${reportPath}`)}\n`)
      }
    }
    return EXIT.ok
  } catch (error) {
    const code = exitCodeFor(error)
    const message = error instanceof Error ? error.message : String(error)
    io.stderr(`${escapeTerminal(message)}\n`)
    return code
  }
}
