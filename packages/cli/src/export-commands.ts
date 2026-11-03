import { mkdir, stat, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  CLI_BIN,
  ExportFormatError,
  GRAPH_FILE,
  OUT_DIR,
  exportGraph,
  isExportFormat,
  readGraph
} from '@atlasmith/engine'
import { UsageError, type RunIo } from './run.js'
import { EXIT } from './run.js'

function defaultGraphPath(cwd: string): string {
  return resolve(cwd, OUT_DIR, GRAPH_FILE)
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

export async function runExport(argv: readonly string[], io: RunIo): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: false,
      strict: true,
      options: {
        format: { type: 'string' },
        graph: { type: 'string' },
        out: { type: 'string' }
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

  const formatRaw = parsed.values.format
  if (formatRaw === undefined) {
    throw new UsageError(`usage: ${CLI_BIN} export --format <${['mermaid', 'structurizr', 'likec4', 'obsidian', 'svg'].join('|')}> [--graph <path>] [--out <path>]`)
  }
  if (!isExportFormat(formatRaw)) throw new ExportFormatError(formatRaw)

  const graphPath = parsed.values.graph ?? defaultGraphPath(io.cwd)
  const graph = readGraphAt(io.cwd, graphPath)

  if (formatRaw === 'obsidian') {
    if (parsed.values.out === undefined) {
      throw new UsageError(`${CLI_BIN} export --format obsidian requires --out <directory>`)
    }
    const outDir = resolve(io.cwd, parsed.values.out)
    try {
      const info = await stat(outDir)
      if (!info.isDirectory()) throw new UsageError('--out must be a directory for obsidian export')
    } catch (error) {
      if (error instanceof UsageError) throw error
      await mkdir(outDir, { recursive: true })
    }
    const result = exportGraph(graph, 'obsidian')
    for (const note of result.notes) {
      const target = resolve(outDir, note.path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, note.content, 'utf8')
    }
    return EXIT.ok
  }

  const result = exportGraph(graph, formatRaw)
  if (parsed.values.out === undefined) {
    io.stdout(result.text)
    return EXIT.ok
  }

  const outPath = resolve(io.cwd, parsed.values.out)
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, result.text, 'utf8')
  return EXIT.ok
}

export function exportCommandExitCode(error: unknown): number | undefined {
  if (error instanceof ExportFormatError) return EXIT.usage
  return undefined
}
