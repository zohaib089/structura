import type { GraphDocument, GraphNode, StateKind, StateScope, SymbolNode } from './graph-types'

/**
 * File insights (graph.json 1.1): the functions a file defines with their calls in both directions,
 * and the state it keeps. Pure data; the panel turns it into plain words.
 */

export interface CallRef {
  /** The symbol on the other end (the callee for "Calls", the caller for "Called by"); null = file top level. */
  symbolId: string | null
  label: string
  /** File node id and repo path of the jump target. */
  fileId: string
  path: string
  /** Jump line: the callee's declaration for "Calls", the call site for "Called by". */
  line: number
  sameFile: boolean
  /** INFERRED call (the engine guessed the target, e.g. through a build-output mapping). */
  likely: boolean
  /** Call sites folded into this row. */
  count: number
}

export interface FunctionInsight {
  id: string
  label: string
  line: number
  paramCount: number | null
  docSummary: string | null
  exported: boolean
  /** Label of the enclosing class / function when nested (methods, inner functions). */
  parentLabel: string | null
  calls: CallRef[]
  calledBy: CallRef[]
}

export interface StateInsight {
  id: string
  label: string
  line: number
  scope: StateScope
  /** true = can be reassigned (let / var); false = fixed binding (const). */
  mutable: boolean
  stateKind: StateKind
  parentLabel: string | null
}

export interface StateGroups {
  /** Belongs to a class or to each object made from it. */
  local: StateInsight[]
  /** Module level: shared by everything in this file (and importers, if exported). */
  module: StateInsight[]
  /** Global: visible to the whole program. */
  global: StateInsight[]
}

export interface FileInsights {
  functions: FunctionInsight[]
  /** Calls made from the file's top-level code (outside any function). */
  topLevelCalls: CallRef[]
  state: StateGroups
  /** True when the graph carries 1.1 data at all (calls edges or state / param fields). */
  hasInsightData: boolean
}

const FUNCTION_KINDS = new Set(['function'])

function isSymbol(node: GraphNode | undefined): node is SymbolNode {
  return Boolean(node && node.kind === 'symbol' && 'file' in node && 'span' in node)
}

function isFunction(node: SymbolNode): boolean {
  return FUNCTION_KINDS.has(node.symbolKind) || (node.symbolKind === 'default' && typeof node.paramCount === 'number')
}

function filePathOf(nodes: Map<string, GraphNode>, fileId: string): string {
  const node = nodes.get(fileId)
  if (node && node.kind === 'file' && 'path' in node) return node.path
  return fileId.startsWith('file:') ? fileId.slice(5) : fileId
}

function fileLabelOf(nodes: Map<string, GraphNode>, fileId: string): string {
  const node = nodes.get(fileId)
  return node?.label ?? filePathOf(nodes, fileId).split('/').pop() ?? fileId
}

/** Folds repeated call sites to one row per (other end, provenance); first site wins the line. */
function fold(rows: CallRef[]): CallRef[] {
  const byKey = new Map<string, CallRef>()
  for (const row of rows) {
    const key = `${row.symbolId ?? row.fileId}\u0000${row.likely ? 'i' : 'e'}`
    const seen = byKey.get(key)
    if (seen) {
      seen.count += 1
      if (row.line < seen.line) seen.line = row.line
    } else byKey.set(key, { ...row })
  }
  // Same-file first (reads top-down), then other files by path; confirmed before likely.
  return [...byKey.values()].sort(
    (a, b) =>
      Number(b.sameFile) - Number(a.sameFile) ||
      a.path.localeCompare(b.path) ||
      Number(a.likely) - Number(b.likely) ||
      a.line - b.line ||
      a.label.localeCompare(b.label)
  )
}

export function buildFileInsights(
  document: GraphDocument,
  fileId: string,
  nodesById?: Map<string, GraphNode>
): FileInsights {
  const nodes = nodesById ?? new Map(document.nodes.map((node) => [node.id, node]))
  const own: SymbolNode[] = []
  let hasInsightData = false
  for (const node of document.nodes) {
    if (!isSymbol(node)) continue
    if (!hasInsightData && (node.paramCount !== undefined || node.scope !== undefined)) hasInsightData = true
    if (node.file === fileId) own.push(node)
  }
  const ownIds = new Set(own.map((node) => node.id))
  const calls = new Map<string, CallRef[]>()
  const calledBy = new Map<string, CallRef[]>()
  const topLevel: CallRef[] = []

  for (const edge of document.edges) {
    if (edge.type !== 'calls' || !('span' in edge)) continue
    hasInsightData = true
    const fromOwn = ownIds.has(edge.source) || edge.source === fileId
    const toOwn = ownIds.has(edge.target)
    if (!fromOwn && !toOwn) continue
    const likely = edge.provenance === 'INFERRED'
    if (fromOwn) {
      const target = nodes.get(edge.target)
      if (isSymbol(target)) {
        const row: CallRef = {
          symbolId: target.id,
          label: target.label,
          fileId: target.file,
          path: filePathOf(nodes, target.file),
          line: target.span.start.line,
          sameFile: target.file === fileId,
          likely,
          count: 1
        }
        if (edge.source === fileId) topLevel.push(row)
        else {
          const list = calls.get(edge.source) ?? []
          list.push(row)
          calls.set(edge.source, list)
        }
      }
    }
    if (toOwn) {
      const source = nodes.get(edge.source)
      const callerFile = isSymbol(source) ? source.file : edge.source
      const row: CallRef = {
        symbolId: isSymbol(source) ? source.id : null,
        label: isSymbol(source) ? source.label : fileLabelOf(nodes, callerFile),
        fileId: callerFile,
        path: filePathOf(nodes, callerFile),
        line: edge.span.start.line,
        sameFile: callerFile === fileId,
        likely,
        count: 1
      }
      const list = calledBy.get(edge.target) ?? []
      list.push(row)
      calledBy.set(edge.target, list)
    }
  }

  const parentLabel = (node: SymbolNode) => (node.parent ? nodes.get(node.parent)?.label ?? null : null)
  const bySource = (a: SymbolNode, b: SymbolNode) =>
    a.span.start.line - b.span.start.line || a.span.start.col - b.span.start.col || a.label.localeCompare(b.label)

  const functions = own
    .filter(isFunction)
    .sort(bySource)
    .map<FunctionInsight>((node) => ({
      id: node.id,
      label: node.label,
      line: node.span.start.line,
      paramCount: typeof node.paramCount === 'number' ? node.paramCount : null,
      docSummary: node.docSummary ?? null,
      exported: node.exported,
      parentLabel: parentLabel(node),
      calls: fold(calls.get(node.id) ?? []),
      calledBy: fold(calledBy.get(node.id) ?? [])
    }))

  const state: StateGroups = { local: [], module: [], global: [] }
  for (const node of own.filter((item) => item.scope !== undefined).sort(bySource)) {
    const row: StateInsight = {
      id: node.id,
      label: node.label,
      line: node.span.start.line,
      scope: node.scope as StateScope,
      mutable: node.mutable === true,
      stateKind: node.stateKind ?? 'binding',
      parentLabel: parentLabel(node)
    }
    if (row.scope === 'global') state.global.push(row)
    else if (row.scope === 'module') state.module.push(row)
    else state.local.push(row)
  }

  return { functions, topLevelCalls: fold(topLevel), state, hasInsightData }
}
