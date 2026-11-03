import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { CLI_BIN, GRAPH_FILE, OUT_DIR, GraphReadError, GraphVersionUnsupported, readGraph } from '@atlasmith/engine'
import { runMcpStdioServer } from './mcp/server.js'
import { EXIT, UsageError, type RunIo } from './run.js'
import { graphCommandExitCode } from './graph-commands.js'

export function defaultGraphPath(cwd: string): string {
  return join(cwd, OUT_DIR, GRAPH_FILE)
}

function loadGraph(cwd: string, graphPath: string) {
  const resolved = resolve(cwd, graphPath)
  let text: string
  try {
    text = readFileSync(resolved, 'utf8')
  } catch {
    throw new UsageError(`cannot read graph: ${graphPath}`)
  }
  try {
    return readGraph(text).graph
  } catch (error) {
    if (error instanceof GraphReadError || error instanceof GraphVersionUnsupported) throw error
    throw error
  }
}

export async function runMcp(argv: readonly string[], io: RunIo): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: false,
      strict: true,
      options: {
        graph: { type: 'string' }
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
  if (parsed.positionals.length > 0) {
    throw new UsageError(`usage: ${CLI_BIN} mcp [--graph <path>]`)
  }
  const graphPath = parsed.values.graph ?? defaultGraphPath(io.cwd)
  const graph = loadGraph(io.cwd, graphPath)
  await runMcpStdioServer(graph)
  return EXIT.ok
}

export function mcpCommandExitCode(error: unknown): number | undefined {
  return graphCommandExitCode(error)
}
