import type { ScanFinding } from './types.js'
import { findingId } from './types.js'

const LARGE_FILE_LINES = 800
const LARGE_FUNCTION_LINES = 120
const HIGH_FAN_IN = 8
const GOD_MODULE_FAN_IN = 15

interface GraphFileNode {
  id: string
  kind: 'file'
  path: string
  lineCount: number | null
}

interface GraphSymbolNode {
  id: string
  kind: 'symbol'
  file: string
  label: string
  symbolKind: string
  exported: boolean
  span?: { start: { line: number }; end: { line: number } }
}

interface GraphExternalNode {
  id: string
  kind: 'external'
  label: string
}

interface GraphEdge {
  source: string
  target: string
  type: string
}

interface ParsedGraph {
  files: Map<string, GraphFileNode>
  symbols: GraphSymbolNode[]
  externals: Map<string, GraphExternalNode>
  importEdges: GraphEdge[]
  fileIdToPath: Map<string, string>
}

export interface GraphHeuristicResult {
  badPractices: ScanFinding[]
  removals: ScanFinding[]
}

export function analyseGraphHeuristics(graph: unknown): GraphHeuristicResult {
  const parsed = parseGraph(graph)
  if (!parsed) return { badPractices: [], removals: [] }

  const badPractices: ScanFinding[] = []
  const removals: ScanFinding[] = []

  for (const file of parsed.files.values()) {
    if (file.lineCount !== null && file.lineCount >= LARGE_FILE_LINES) {
      badPractices.push({
        id: findingId(['badPractices', 'large-file', file.path]),
        section: 'badPractices',
        severity: file.lineCount >= LARGE_FILE_LINES * 2 ? 'high' : 'medium',
        file: file.path,
        message: `Large file (${file.lineCount} lines).`,
        rule: 'graph/large-file',
        tool: 'graph-heuristics',
        provenance: 'INFERRED'
      })
    }
  }

  for (const symbol of parsed.symbols) {
    if (symbol.symbolKind !== 'function' && symbol.symbolKind !== 'method') continue
    const lines = spanLineCount(symbol.span)
    if (lines >= LARGE_FUNCTION_LINES) {
      const path = parsed.fileIdToPath.get(symbol.file) ?? symbol.file
      badPractices.push({
        id: findingId(['badPractices', 'large-function', symbol.id]),
        section: 'badPractices',
        severity: lines >= LARGE_FUNCTION_LINES * 2 ? 'high' : 'medium',
        file: path,
        line: symbol.span?.start.line,
        message: `Large ${symbol.symbolKind} "${symbol.label}" (~${lines} lines).`,
        rule: 'graph/large-function',
        tool: 'graph-heuristics',
        provenance: 'INFERRED'
      })
    }
  }

  const fanIn = computeFanIn(parsed)
  for (const [fileId, count] of fanIn.entries()) {
    const path = parsed.fileIdToPath.get(fileId) ?? fileId
    if (count >= GOD_MODULE_FAN_IN) {
      badPractices.push({
        id: findingId(['badPractices', 'god-module', fileId]),
        section: 'badPractices',
        severity: 'high',
        file: path,
        message: `God module: ${count} incoming import edges.`,
        rule: 'graph/god-module',
        tool: 'graph-heuristics',
        provenance: 'INFERRED'
      })
    } else if (count >= HIGH_FAN_IN) {
      badPractices.push({
        id: findingId(['badPractices', 'high-fan-in', fileId]),
        section: 'badPractices',
        severity: 'medium',
        file: path,
        message: `High fan-in module (${count} incoming imports).`,
        rule: 'graph/high-fan-in',
        tool: 'graph-heuristics',
        provenance: 'INFERRED'
      })
    }
  }

  const cycles = detectImportCycles(parsed)
  for (const cycle of cycles.slice(0, 10)) {
    badPractices.push({
      id: findingId(['badPractices', 'import-cycle', ...cycle]),
      section: 'badPractices',
      severity: 'medium',
      file: parsed.fileIdToPath.get(cycle[0]) ?? cycle[0],
      message: `Import cycle: ${cycle.map(id => parsed.fileIdToPath.get(id) ?? id).join(' → ')}`,
      rule: 'graph/import-cycle',
      tool: 'graph-heuristics',
      provenance: 'INFERRED'
    })
  }

  const referencedFiles = referencedFileIds(parsed)
  for (const file of parsed.files.values()) {
    if (referencedFiles.has(file.id)) continue
    if (file.path.endsWith('.d.ts')) continue
    removals.push({
      id: findingId(['removals', 'unused-file', file.path]),
      section: 'removals',
      severity: 'low',
      file: file.path,
      message: 'File is not imported by any other file in the graph.',
      rule: 'graph/unused-file',
      tool: 'graph-heuristics',
      provenance: 'INFERRED'
    })
  }

  const referencedExternals = referencedExternalIds(parsed)
  for (const [id, external] of parsed.externals.entries()) {
    if (referencedExternals.has(id)) continue
    removals.push({
      id: findingId(['removals', 'unused-dep', id]),
      section: 'removals',
      severity: 'low',
      file: external.label,
      message: `Dependency "${external.label}" is declared but never imported.`,
      rule: 'graph/unused-dependency',
      tool: 'graph-heuristics',
      provenance: 'INFERRED'
    })
  }

  const referencedSymbols = referencedSymbolIds(parsed)
  for (const symbol of parsed.symbols) {
    if (!symbol.exported) continue
    if (referencedSymbols.has(symbol.id)) continue
    const path = parsed.fileIdToPath.get(symbol.file) ?? symbol.file
    removals.push({
      id: findingId(['removals', 'unused-export', symbol.id]),
      section: 'removals',
      severity: 'info',
      file: path,
      line: symbol.span?.start.line,
      message: `Exported ${symbol.symbolKind} "${symbol.label}" appears unused.`,
      rule: 'graph/unused-export',
      tool: 'graph-heuristics',
      provenance: 'INFERRED'
    })
  }

  return { badPractices, removals }
}

function parseGraph(graph: unknown): ParsedGraph | null {
  if (!graph || typeof graph !== 'object') return null
  const record = graph as { nodes?: unknown[]; edges?: unknown[] }
  if (!Array.isArray(record.nodes) || !Array.isArray(record.edges)) return null

  const files = new Map<string, GraphFileNode>()
  const fileIdToPath = new Map<string, string>()
  const symbols: GraphSymbolNode[] = []
  const externals = new Map<string, GraphExternalNode>()

  for (const node of record.nodes) {
    if (!node || typeof node !== 'object') continue
    const kind = (node as { kind?: string }).kind
    if (kind === 'file') {
      const fileNode = node as GraphFileNode
      files.set(fileNode.id, fileNode)
      fileIdToPath.set(fileNode.id, fileNode.path)
    } else if (kind === 'symbol') {
      symbols.push(node as GraphSymbolNode)
    } else if (kind === 'external') {
      const ext = node as GraphExternalNode
      externals.set(ext.id, ext)
    }
  }

  const importEdges = record.edges.filter(edge => {
    if (!edge || typeof edge !== 'object') return false
    const typed = edge as GraphEdge
    return typed.type === 'imports' || typed.type === 'reexports'
  }) as GraphEdge[]

  return { files, symbols, externals, importEdges, fileIdToPath }
}

function spanLineCount(span: GraphSymbolNode['span']): number {
  if (!span) return 0
  return Math.max(1, span.end.line - span.start.line + 1)
}

function computeFanIn(parsed: ParsedGraph): Map<string, number> {
  const counts = new Map<string, number>()
  for (const edge of parsed.importEdges) {
    if (!edge.target.startsWith('file:')) continue
    counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1)
  }
  return counts
}

function detectImportCycles(parsed: ParsedGraph): string[][] {
  const adjacency = new Map<string, string[]>()
  for (const edge of parsed.importEdges) {
    if (!edge.source.startsWith('file:') || !edge.target.startsWith('file:')) continue
    const list = adjacency.get(edge.source) ?? []
    list.push(edge.target)
    adjacency.set(edge.source, list)
  }

  const cycles: string[][] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const stack: string[] = []

  const dfs = (node: string) => {
    if (visiting.has(node)) {
      const start = stack.indexOf(node)
      if (start >= 0) cycles.push(stack.slice(start).concat(node))
      return
    }
    if (visited.has(node)) return
    visiting.add(node)
    stack.push(node)
    for (const next of adjacency.get(node) ?? []) dfs(next)
    stack.pop()
    visiting.delete(node)
    visited.add(node)
  }

  for (const node of adjacency.keys()) dfs(node)
  return cycles
}

function referencedFileIds(parsed: ParsedGraph): Set<string> {
  const referenced = new Set<string>()
  for (const edge of parsed.importEdges) {
    if (edge.target.startsWith('file:')) referenced.add(edge.target)
  }
  return referenced
}

function referencedExternalIds(parsed: ParsedGraph): Set<string> {
  const referenced = new Set<string>()
  for (const edge of parsed.importEdges) {
    if (edge.target.startsWith('ext:')) referenced.add(edge.target)
  }
  return referenced
}

function referencedSymbolIds(parsed: ParsedGraph): Set<string> {
  const referenced = new Set<string>()
  for (const edge of parsed.importEdges) {
    if (edge.target.startsWith('sym:')) referenced.add(edge.target)
  }
  for (const edge of parsed.importEdges) {
    if (edge.source.startsWith('sym:')) referenced.add(edge.source)
  }
  return referenced
}
