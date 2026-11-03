import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  CLI_BIN,
  GRAPH_FILE,
  OUT_DIR,
  ImpactTargetAmbiguousError,
  ImpactTargetNotFoundError,
  ImpactUsageError,
  escapeTerminal,
  graphImpact,
  impactNodeLabel,
  readGraph,
  type Graph,
  type GraphImpactResult,
  type ImpactPath
} from '@atlasmith/engine'
import { EXIT, UsageError, type RunIo } from './run.js'

function defaultGraphPath(cwd: string): string {
  return join(cwd, OUT_DIR, GRAPH_FILE)
}

function readGraphAt(cwd: string, graphPath: string) {
  let text: string
  try {
    text = readFileSync(resolve(cwd, graphPath), 'utf8')
  } catch {
    throw new UsageError(`cannot read graph: ${graphPath}`)
  }
  return readGraph(text).graph
}

function integerFlag(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined
  if (!/^[0-9]+$/.test(value) || value === '0') throw new UsageError(`${flag} expects a positive integer`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw new UsageError(`${flag} is out of range`)
  return parsed
}

function formatPathLine(graph: Graph, path: ImpactPath): string {
  const labels = path.nodes.map(nodeId => impactNodeLabel(graph, nodeId))
  return `  depth ${path.depth} ${path.status}: ${labels.join(' -> ')}`
}

function formatImpactHuman(graph: Graph, result: GraphImpactResult): string {
  const targetLine = result.target.kind === 'symbol'
    ? `target: ${result.target.id} (symbol ${result.target.label}, ${result.target.filePath ?? result.target.file})`
    : `target: ${result.target.id} (${result.target.path})`
  const lines = [
    targetLine,
    `depth limit: ${result.depthLimit}`,
    '',
    'upstream (depends on):',
    ...(result.upstream.length > 0
      ? result.upstream.map(path => formatPathLine(graph, path))
      : ['  (none)']),
    '',
    'downstream (used by):',
    ...(result.downstream.length > 0
      ? result.downstream.map(path => formatPathLine(graph, path))
      : ['  (none)'])
  ]
  return lines.join('\n')
}

export async function runImpact(argv: readonly string[], io: RunIo): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: {
        depth: { type: 'string' },
        graph: { type: 'string' },
        json: { type: 'boolean', default: false }
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
  if (parsed.positionals.length !== 1) {
    throw new UsageError(`usage: ${CLI_BIN} impact <file|symbol> [--depth <n>] [--graph <path>] [--json]`)
  }
  const graphPath = parsed.values.graph ?? defaultGraphPath(io.cwd)
  const graph = readGraphAt(io.cwd, graphPath)
  const result = graphImpact(graph, parsed.positionals[0] as string, {
    depth: integerFlag(parsed.values.depth, '--depth')
  })
  if (parsed.values.json) {
    io.stdout(`${JSON.stringify(result)}\n`)
  } else {
    io.stdout(`${escapeTerminal(formatImpactHuman(graph, result))}\n`)
  }
  return EXIT.ok
}

export function impactCommandExitCode(error: unknown): number | undefined {
  if (
    error instanceof ImpactTargetNotFoundError
    || error instanceof ImpactTargetAmbiguousError
    || error instanceof ImpactUsageError
  ) {
    return EXIT.usage
  }
  return undefined
}
