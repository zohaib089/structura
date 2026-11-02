import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  CLI_BIN,
  GraphNodeNotFoundError,
  GraphReadError,
  QueryUsageError,
  escapeTerminal,
  explainGraphNode,
  queryGraph,
  readGraph,
  type ExplainNodeResult,
  type QueryGraphOptions,
  type QueryGraphResult
} from '@atlasmith/engine'
import { UsageError, type RunIo } from './run.js'
import { EXIT } from './run.js'

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

function formatQueryHuman(result: QueryGraphResult): string {
  if (result.mode === 'nodes') {
    return result.nodes.map(node => `${node.id}  ${node.kind}  ${node.label}`).join('\n')
  }
  return result.edges.map(edge => `${edge.source}  ${edge.type}  ${edge.target}  ${edge.provenance}`).join('\n')
}

function formatCoverage(parse: ExplainNodeResult['coverage']): string {
  if (!parse) return ''
  if (parse.status === 'parsed') return 'parsed'
  return `${parse.status} (${parse.reason})`
}

function formatExplainHuman(result: ExplainNodeResult): string {
  const lines: string[] = [
    `id: ${result.id}`,
    `kind: ${result.kind}`,
    `label: ${result.label}`
  ]
  if (result.path !== undefined) lines.push(`path: ${result.path}`)
  if (result.file !== undefined) lines.push(`file: ${result.file}`)
  if (result.span) {
    lines.push(`span: ${result.span.start.line}:${result.span.start.col}-${result.span.end.line}:${result.span.end.col}`)
  }
  if (result.entryCandidate) {
    lines.push(`entry: ${result.entryCandidate.reason} (${result.entryCandidate.provenance})`)
  }
  if (result.entryCandidates && result.entryCandidates.length > 0) {
    lines.push('entry candidates:')
    for (const candidate of result.entryCandidates) {
      const where = candidate.evidence.pointer
        ?? (candidate.evidence.span
          ? `${candidate.evidence.source}@${candidate.evidence.span.start.line}:${candidate.evidence.span.start.col}`
          : candidate.evidence.source)
      lines.push(`  - ${candidate.reason} confidence=${candidate.confidence} evidence=${where}`)
    }
  }
  if (result.unresolvedReason) lines.push(`unresolved: ${result.unresolvedReason}`)
  if (result.coverage) lines.push(`coverage: ${formatCoverage(result.coverage)}`)
  for (const direction of ['inbound', 'outbound'] as const) {
    const groups = result[direction]
    for (const [type, edges] of Object.entries(groups)) {
      lines.push(`${direction} ${type}:`)
      for (const edge of edges ?? []) {
        const arrow = direction === 'inbound' ? '<-' : '->'
        const extra = edge.provenance === 'INFERRED'
          ? ` ${edge.provenance} confidence=${edge.confidence} reason=${edge.reason}`
          : ` ${edge.provenance}`
        const spec = edge.specifier ? ` specifier=${edge.specifier}` : ''
        lines.push(`  ${arrow} ${edge.peer}${extra}${spec}`)
      }
    }
  }
  return lines.join('\n')
}

export async function runQuery(argv: readonly string[], io: RunIo): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: {
        kind: { type: 'string' },
        type: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
        path: { type: 'string' },
        limit: { type: 'string' },
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
  if (parsed.positionals.length !== 1) throw new UsageError(`usage: ${CLI_BIN} query <graph.json> [--kind <kind>] [--type <type>] [--from <id|path>] [--to <id|path>] [--path <glob>] [--limit <n>] [--json]`)
  const graph = readGraphAt(io.cwd, parsed.positionals[0] as string)
  const result = queryGraph(graph, {
    kind: parsed.values.kind as QueryGraphOptions['kind'],
    type: parsed.values.type as QueryGraphOptions['type'],
    from: parsed.values.from,
    to: parsed.values.to,
    path: parsed.values.path,
    limit: integerFlag(parsed.values.limit, '--limit')
  })
  if (parsed.values.json) {
    io.stdout(`${JSON.stringify(result)}\n`)
  } else {
    const text = formatQueryHuman(result)
    io.stdout(text ? `${escapeTerminal(text)}\n` : '')
  }
  return EXIT.ok
}

export async function runExplain(argv: readonly string[], io: RunIo): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: {
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
  if (parsed.positionals.length !== 2) throw new UsageError(`usage: ${CLI_BIN} explain <graph.json> <id|path> [--json]`)
  const graph = readGraphAt(io.cwd, parsed.positionals[0] as string)
  const result = explainGraphNode(graph, parsed.positionals[1] as string)
  if (parsed.values.json) {
    io.stdout(`${JSON.stringify(result)}\n`)
  } else {
    const text = formatExplainHuman(result)
    io.stdout(`${escapeTerminal(text)}\n`)
  }
  return EXIT.ok
}

export function graphCommandExitCode(error: unknown): number | undefined {
  if (error instanceof GraphReadError || error instanceof GraphNodeNotFoundError || error instanceof QueryUsageError) return EXIT.usage
  return undefined
}
