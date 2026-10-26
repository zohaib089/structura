import {
  GRAPH_BYTE_LIMIT,
  GRAPH_STRING_MAX,
  JSON_MAX_ERRORS,
  SEMVER,
  SUPPORTED_SCHEMA_MAJOR
} from './caps'
import { guardJson, syntaxWhere } from './json-guard'
import { pointer } from './json-pointer'
import type {
  Coverage,
  FileNode,
  GraphDocument,
  GraphEdge,
  GraphNode,
  ReadResult,
  Span
} from './graph-types'

const KNOWN_KINDS = new Set(['directory', 'file', 'symbol', 'external', 'unresolved'])
const PARSE_STATUS = new Set(['parsed', 'partial', 'failed', 'skipped'])
const EXTENSION_KEY = /^[a-z][a-z0-9-]*:[A-Za-z0-9._-]+$/

export function textExceedsLimit(text: string, limit = GRAPH_BYTE_LIMIT): boolean {
  if (text.length > limit) return true
  if (text.length * 3 <= limit) return false
  return new TextEncoder().encode(text).byteLength > limit
}

export function readGraph(text: string): ReadResult {
  if (textExceedsLimit(text)) {
    const actualBytes = text.length > GRAPH_BYTE_LIMIT
      ? text.length
      : new TextEncoder().encode(text).byteLength
    return { ok: false, error: { code: 'too-large', limitBytes: GRAPH_BYTE_LIMIT, actualBytes } }
  }

  const guarded = guardJson(text)
  if (!guarded.ok) {
    if (guarded.code === 'invalid-json') {
      return { ok: false, error: { code: 'invalid-json', where: guarded.where } }
    }
    return { ok: false, error: { code: 'invalid-graph', paths: guarded.paths } }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch (error) {
    return { ok: false, error: { code: 'invalid-json', where: syntaxWhere(text, error) } }
  }

  const version = readVersion(parsed)
  if (!version.ok) return version.result

  const paths: string[] = []
  const graph = readDocument(parsed, version.schemaVersion, paths)
  if (paths.length > 0 || !graph) {
    return { ok: false, error: { code: 'invalid-graph', paths: paths.slice(0, JSON_MAX_ERRORS) } }
  }
  return { ok: true, graph }
}

function readVersion(value: unknown): { ok: true; schemaVersion: string } | { ok: false; result: ReadResult } {
  if (!isRecord(value) || !Object.hasOwn(value, 'schemaVersion')) {
    return { ok: false, result: { ok: false, error: { code: 'unsupported-version', found: null, supportedMajor: SUPPORTED_SCHEMA_MAJOR } } }
  }
  const raw = value.schemaVersion
  if (typeof raw !== 'string' || !SEMVER.test(raw)) {
    return {
      ok: false,
      result: {
        ok: false,
        error: {
          code: 'unsupported-version',
          found: typeof raw === 'string' || typeof raw === 'number' ? String(raw) : null,
          supportedMajor: SUPPORTED_SCHEMA_MAJOR
        }
      }
    }
  }
  const major = Number(raw.split('.')[0])
  if (major !== SUPPORTED_SCHEMA_MAJOR) {
    return {
      ok: false,
      result: { ok: false, error: { code: 'unsupported-version', found: raw, supportedMajor: SUPPORTED_SCHEMA_MAJOR } }
    }
  }
  return { ok: true, schemaVersion: raw }
}

function readDocument(value: unknown, schemaVersion: string, paths: string[]): GraphDocument | null {
  if (!isRecord(value)) {
    push(paths, '')
    return null
  }
  const summary = readSummary(value.summary, paths)
  const coverage = readCoverage(value.coverage, paths)
  const nodes = readNodes(value.nodes, paths)
  const edges = readEdges(value.edges, paths)
  if (Object.hasOwn(value, 'extensions')) readExtensions(value.extensions, '/extensions', paths)
  if (!summary || !coverage || !nodes || !edges) return null

  if (summary.nodes !== nodes.length) push(paths, '/summary/nodes')
  if (summary.edges !== edges.length) push(paths, '/summary/edges')
  const fileCount = nodes.filter((node) => node.kind === 'file').length
  if (summary.files !== fileCount) push(paths, '/summary/files')

  const nodesById = new Map<string, GraphNode>()
  nodes.forEach((node, index) => {
    if (nodesById.has(node.id)) push(paths, pointer(['nodes', index, 'id']))
    else nodesById.set(node.id, node)
  })

  const lineCountByFile = new Map<string, number | null>()
  for (const node of nodes) {
    if (node.kind === 'file' && 'lineCount' in node) lineCountByFile.set(node.id, node.lineCount)
  }
  nodes.forEach((node, index) => {
    if (node.kind !== 'symbol' || !('file' in node) || !('span' in node)) return
    const owner = nodesById.get(node.file)
    if (!owner || owner.kind !== 'file' || !('path' in owner)) {
      push(paths, pointer(['nodes', index, 'file']))
      return
    }
    const lineCount = 'lineCount' in owner ? owner.lineCount : null
    checkSpanBounds(node.span, lineCount, pointer(['nodes', index, 'span']), paths)
    if (!node.id.startsWith(`sym:${owner.path}#`)) push(paths, pointer(['nodes', index, 'id']))
  })

  const edgeKeys = new Map<string, number>()
  const children = new Map<string, string[]>()
  edges.forEach((edge, index) => {
    if (!nodesById.has(edge.source)) push(paths, pointer(['edges', index, 'source']))
    if (!nodesById.has(edge.target)) push(paths, pointer(['edges', index, 'target']))
    if (edge.source === edge.target) push(paths, pointer(['edges', index, 'target']))
    const key = edgeKey(edge)
    if (edgeKeys.has(key)) push(paths, pointer(['edges', index]))
    else edgeKeys.set(key, index)
    if (edge.type === 'contains') {
      const list = children.get(edge.source) ?? []
      list.push(edge.target)
      children.set(edge.source, list)
    }
    if (edge.type !== 'contains' && 'span' in edge) {
      const lineCount = lineCountForSource(edge.source, nodesById)
      checkSpanBounds(edge.span, lineCount, pointer(['edges', index, 'span']), paths)
    }
  })

  if (containsCycle(children, nodes.map((node) => node.id))) push(paths, '/edges')
  if (paths.length > 0) return null

  return { schemaVersion, summary, coverage, nodes, edges }
}

function readSummary(value: unknown, paths: string[]): GraphDocument['summary'] | null {
  if (!isRecord(value)) {
    push(paths, '/summary')
    return null
  }
  const nodes = readCount(value.nodes, '/summary/nodes', paths)
  const edges = readCount(value.edges, '/summary/edges', paths)
  const files = readCount(value.files, '/summary/files', paths)
  if (nodes === null || edges === null || files === null) return null
  return { nodes, edges, files }
}

function readNodes(value: unknown, paths: string[]): GraphNode[] | null {
  if (!Array.isArray(value)) {
    push(paths, '/nodes')
    return null
  }
  const nodes: GraphNode[] = []
  let failed = false
  value.forEach((entry, index) => {
    const node = readNode(entry, index, paths)
    if (!node) failed = true
    else nodes.push(node)
  })
  return failed ? null : nodes
}

function readNode(value: unknown, index: number, paths: string[]): GraphNode | null {
  const base = pointer(['nodes', index])
  if (!isRecord(value)) {
    push(paths, base)
    return null
  }
  if (Object.hasOwn(value, 'extensions')) readExtensions(value.extensions, `${base}/extensions`, paths)
  const id = readBoundedString(value.id, `${base}/id`, paths)
  const kind = readBoundedString(value.kind, `${base}/kind`, paths)
  if (!id || !kind) return null
  if (!KNOWN_KINDS.has(kind)) {
    const label = typeof value.label === 'string' ? readBoundedString(value.label, `${base}/label`, paths) : id
    if (!label) return null
    return { id, kind, label }
  }
  if (kind === 'directory') return readDirectory(value, id, base, paths)
  if (kind === 'file') return readFile(value, id, base, paths)
  if (kind === 'symbol') return readSymbol(value, id, base, paths)
  if (kind === 'external') return readExternal(value, id, base, paths)
  return readUnresolved(value, id, base, paths)
}

function readDirectory(value: Record<string, unknown>, id: string, base: string, paths: string[]): GraphNode | null {
  const path = readBoundedString(value.path, `${base}/path`, paths)
  const label = readBoundedString(value.label, `${base}/label`, paths)
  if (!path || !label) return null
  if (!isRelPath(path, true) || id !== `dir:${path}`) push(paths, `${base}/id`)
  return { id, kind: 'directory', path, label }
}

function readFile(value: Record<string, unknown>, id: string, base: string, paths: string[]): FileNode | null {
  const path = readBoundedString(value.path, `${base}/path`, paths)
  const label = readBoundedString(value.label, `${base}/label`, paths)
  if (!path || !label) return null
  if (!isRelPath(path, false) || id !== `file:${path}`) push(paths, `${base}/id`)
  let language: string | null = null
  if (value.language === null) language = null
  else {
    const read = readBoundedString(value.language, `${base}/language`, paths)
    if (read === null) return null
    language = read
  }
  let lineCount: number | null = null
  if (value.lineCount === null) lineCount = null
  else if (!isCount(value.lineCount)) push(paths, `${base}/lineCount`)
  else lineCount = value.lineCount
  if (!isRecord(value.parse) || !PARSE_STATUS.has(String(value.parse.status))) {
    push(paths, `${base}/parse`)
    return null
  }
  const status = value.parse.status as FileNode['parse']['status']
  let reason: string | undefined
  if (Object.hasOwn(value.parse, 'reason')) {
    const read = readBoundedString(value.parse.reason, `${base}/parse/reason`, paths)
    if (!read) return null
    reason = read
  }
  const node: FileNode = { id, kind: 'file', path, label, language, lineCount, parse: reason ? { status, reason } : { status } }
  if (Object.hasOwn(value, 'decoding')) {
    if (value.decoding !== 'lossy') push(paths, `${base}/decoding`)
    else node.decoding = 'lossy'
  }
  return node
}

function readSymbol(value: Record<string, unknown>, id: string, base: string, paths: string[]): GraphNode | null {
  const file = readBoundedString(value.file, `${base}/file`, paths)
  const label = readBoundedString(value.label, `${base}/label`, paths)
  const symbolKind = readBoundedString(value.symbolKind, `${base}/symbolKind`, paths)
  const span = readSpan(value.span, `${base}/span`, paths)
  if (!file || !label || !symbolKind || !span) return null
  if (typeof value.exported !== 'boolean') push(paths, `${base}/exported`)
  if (!id.startsWith('sym:') || !id.includes('#')) push(paths, `${base}/id`)
  return { id, kind: 'symbol', file, label, symbolKind, exported: value.exported === true, span }
}

function readExternal(value: Record<string, unknown>, id: string, base: string, paths: string[]): GraphNode | null {
  const ecosystem = readBoundedString(value.ecosystem, `${base}/ecosystem`, paths)
  const label = readBoundedString(value.label, `${base}/label`, paths)
  if (!ecosystem || !label) return null
  if (!id.startsWith(`ext:${ecosystem}:`) || id.length <= `ext:${ecosystem}:`.length) push(paths, `${base}/id`)
  return { id, kind: 'external', ecosystem, label }
}

function readUnresolved(value: Record<string, unknown>, id: string, base: string, paths: string[]): GraphNode | null {
  const label = readBoundedString(value.label, `${base}/label`, paths)
  const reason = readBoundedString(value.reason, `${base}/reason`, paths)
  if (!label || !reason) return null
  if (!id.startsWith('unresolved:')) push(paths, `${base}/id`)
  return { id, kind: 'unresolved', label, reason }
}

function readEdges(value: unknown, paths: string[]): GraphEdge[] | null {
  if (!Array.isArray(value)) {
    push(paths, '/edges')
    return null
  }
  const edges: GraphEdge[] = []
  let failed = false
  value.forEach((entry, index) => {
    const edge = readEdge(entry, index, paths)
    if (!edge) failed = true
    else edges.push(edge)
  })
  return failed ? null : edges
}

function readEdge(value: unknown, index: number, paths: string[]): GraphEdge | null {
  const base = pointer(['edges', index])
  if (!isRecord(value)) {
    push(paths, base)
    return null
  }
  if (Object.hasOwn(value, 'extensions')) readExtensions(value.extensions, `${base}/extensions`, paths)
  const source = readBoundedString(value.source, `${base}/source`, paths)
  const type = readBoundedString(value.type, `${base}/type`, paths)
  const target = readBoundedString(value.target, `${base}/target`, paths)
  if (!source || !type || !target) return null
  if (value.provenance !== 'EXTRACTED' && value.provenance !== 'INFERRED') {
    push(paths, `${base}/provenance`)
    return null
  }
  const provenance = value.provenance
  if (type === 'contains') {
    if (provenance !== 'EXTRACTED') push(paths, `${base}/provenance`)
    if (Object.hasOwn(value, 'span')) push(paths, `${base}/span`)
    if (Object.hasOwn(value, 'confidence')) push(paths, `${base}/confidence`)
    if (Object.hasOwn(value, 'reason')) push(paths, `${base}/reason`)
    return { source, type: 'contains', target, provenance: 'EXTRACTED' }
  }
  const span = readSpan(value.span, `${base}/span`, paths)
  if (!span) return null
  if (provenance === 'INFERRED') {
    if (!isConfidence(value.confidence)) push(paths, `${base}/confidence`)
    const reason = readBoundedString(value.reason, `${base}/reason`, paths)
    if (!reason) return null
    if (type === 'imports' || type === 'reexports') {
      const specifier = readBoundedString(value.specifier, `${base}/specifier`, paths)
      if (!specifier) return null
      return { source, type, target, provenance, span, specifier, confidence: Number(value.confidence), reason }
    }
    return { source, type, target, provenance, span, confidence: Number(value.confidence), reason }
  }
  if (Object.hasOwn(value, 'confidence')) push(paths, `${base}/confidence`)
  if (Object.hasOwn(value, 'reason')) push(paths, `${base}/reason`)
  if (type === 'imports' || type === 'reexports') {
    const specifier = readBoundedString(value.specifier, `${base}/specifier`, paths)
    if (!specifier) return null
    return { source, type, target, provenance: 'EXTRACTED', span, specifier }
  }
  return { source, type, target, provenance: 'EXTRACTED', span }
}

function readCoverage(value: unknown, paths: string[]): Coverage | null {
  if (!isRecord(value)) {
    push(paths, '/coverage')
    return null
  }
  const files = readCoverageFiles(value.files, paths)
  const byLanguage = readByLanguage(value.byLanguage, paths)
  const skipped = readReasonCounts(value.skipped, '/coverage/skipped', 'reason', paths)
  const ignored = readReasonCounts(value.ignored, '/coverage/ignored', 'rule', paths)
  const unresolved = readReasonCounts(value.unresolved, '/coverage/unresolved', 'reason', paths)
  const accounting = readAccounting(value.accounting, paths)
  if (!files || !byLanguage || !skipped || !ignored || !unresolved || !accounting) return null
  const sum = files.parsed + files.partial + files.failed + files.skipped + files.ignored
  if (files.discovered !== sum) push(paths, '/coverage/files/discovered')
  if (accounting.discovered !== accounting.accounted) push(paths, '/coverage/accounting/accounted')
  if (accounting.discovered !== files.discovered) push(paths, '/coverage/accounting/discovered')
  return {
    files,
    byLanguage,
    skipped: skipped as Coverage['skipped'],
    ignored: ignored as Coverage['ignored'],
    unresolved: unresolved as Coverage['unresolved'],
    accounting
  }
}

function readCoverageFiles(value: unknown, paths: string[]): Coverage['files'] | null {
  if (!isRecord(value)) {
    push(paths, '/coverage/files')
    return null
  }
  const discovered = readCount(value.discovered, '/coverage/files/discovered', paths)
  const parsed = readCount(value.parsed, '/coverage/files/parsed', paths)
  const partial = readCount(value.partial, '/coverage/files/partial', paths)
  const failed = readCount(value.failed, '/coverage/files/failed', paths)
  const skipped = readCount(value.skipped, '/coverage/files/skipped', paths)
  const ignored = readCount(value.ignored, '/coverage/files/ignored', paths)
  if ([discovered, parsed, partial, failed, skipped, ignored].some((item) => item === null)) return null
  return {
    discovered: discovered as number,
    parsed: parsed as number,
    partial: partial as number,
    failed: failed as number,
    skipped: skipped as number,
    ignored: ignored as number
  }
}

function readByLanguage(value: unknown, paths: string[]): Coverage['byLanguage'] | null {
  if (!Array.isArray(value)) {
    push(paths, '/coverage/byLanguage')
    return null
  }
  const rows: Coverage['byLanguage'] = []
  let failed = false
  value.forEach((entry, index) => {
    const base = pointer(['coverage', 'byLanguage', index])
    if (!isRecord(entry)) {
      push(paths, base)
      failed = true
      return
    }
    let language: string | null = null
    if (entry.language === null) language = null
    else {
      const read = readBoundedString(entry.language, `${base}/language`, paths)
      if (!read) failed = true
      else language = read
    }
    const parsed = readCount(entry.parsed, `${base}/parsed`, paths)
    const partial = readCount(entry.partial, `${base}/partial`, paths)
    const failedCount = readCount(entry.failed, `${base}/failed`, paths)
    const skipped = readCount(entry.skipped, `${base}/skipped`, paths)
    if ([parsed, partial, failedCount, skipped].some((item) => item === null)) {
      failed = true
      return
    }
    rows.push({
      language,
      parsed: parsed as number,
      partial: partial as number,
      failed: failedCount as number,
      skipped: skipped as number
    })
  })
  return failed ? null : rows
}

function readReasonCounts(
  value: unknown,
  base: string,
  nameKey: 'reason' | 'rule',
  paths: string[]
): { reason: string; count: number }[] | { rule: string; count: number }[] | null {
  if (!Array.isArray(value)) {
    push(paths, base)
    return null
  }
  const rows: { reason: string; count: number }[] = []
  let failed = false
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      push(paths, `${base}/${index}`)
      failed = true
      return
    }
    const name = readBoundedString(entry[nameKey], `${base}/${index}/${nameKey}`, paths)
    const count = readCount(entry.count, `${base}/${index}/count`, paths)
    if (!name || count === null) {
      failed = true
      return
    }
    rows.push({ reason: name, count })
  })
  if (failed) return null
  if (nameKey === 'rule') return rows.map((row) => ({ rule: row.reason, count: row.count }))
  return rows
}

function readAccounting(value: unknown, paths: string[]): Coverage['accounting'] | null {
  if (!isRecord(value)) {
    push(paths, '/coverage/accounting')
    return null
  }
  const discovered = readCount(value.discovered, '/coverage/accounting/discovered', paths)
  const accounted = readCount(value.accounted, '/coverage/accounting/accounted', paths)
  if (discovered === null || accounted === null) return null
  return { discovered, accounted }
}

function readExtensions(value: unknown, base: string, paths: string[]) {
  if (!isRecord(value)) {
    push(paths, base)
    return
  }
  for (const key of Object.keys(value)) {
    if (!EXTENSION_KEY.test(key)) push(paths, `${base}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`)
  }
}

function readSpan(value: unknown, base: string, paths: string[]): Span | null {
  if (!isRecord(value)) {
    push(paths, base)
    return null
  }
  const start = readPos(value.start, `${base}/start`, paths)
  const end = readPos(value.end, `${base}/end`, paths)
  if (!start || !end) return null
  if (start.line > end.line || (start.line === end.line && start.col > end.col)) push(paths, base)
  return { start, end }
}

function readPos(value: unknown, base: string, paths: string[]): { line: number; col: number } | null {
  if (!isRecord(value)) {
    push(paths, base)
    return null
  }
  if (!isPosInt(value.line)) push(paths, `${base}/line`)
  if (!isPosInt(value.col)) push(paths, `${base}/col`)
  if (!isPosInt(value.line) || !isPosInt(value.col)) return null
  return { line: value.line, col: value.col }
}

function checkSpanBounds(span: Span, lineCount: number | null, base: string, paths: string[]) {
  if (lineCount === null) return
  if (span.start.line > lineCount || span.end.line > lineCount) push(paths, base)
}

function lineCountForSource(source: string, nodesById: Map<string, GraphNode>): number | null {
  const node = nodesById.get(source)
  if (!node) return null
  if (node.kind === 'file' && 'lineCount' in node) return node.lineCount
  if (node.kind === 'symbol' && 'file' in node) {
    const file = nodesById.get(node.file)
    if (file && file.kind === 'file' && 'lineCount' in file) return file.lineCount
  }
  return null
}

function containsCycle(children: Map<string, string[]>, ids: string[]): boolean {
  const color = new Map<string, number>()
  for (const start of ids) {
    if (color.get(start)) continue
    const stack: { id: string; index: number }[] = [{ id: start, index: 0 }]
    color.set(start, 1)
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!
      const kids = children.get(frame.id) ?? []
      if (frame.index >= kids.length) {
        color.set(frame.id, 2)
        stack.pop()
        continue
      }
      const next = kids[frame.index]!
      frame.index += 1
      const state = color.get(next) ?? 0
      if (state === 1) return true
      if (state === 0) {
        color.set(next, 1)
        stack.push({ id: next, index: 0 })
      }
    }
  }
  return false
}

function edgeKey(edge: GraphEdge): string {
  if (edge.type === 'contains' || !('span' in edge)) return `${edge.source}\u0000${edge.type}\u0000${edge.target}`
  return `${edge.source}\u0000${edge.type}\u0000${edge.target}\u0000${edge.span.start.line}\u0000${edge.span.start.col}`
}

function isRelPath(path: string, allowDot: boolean): boolean {
  if (path.normalize('NFC') !== path) return false
  if (path.includes('\\') || path.startsWith('/')) return false
  if (/[\u0000-\u001f\u007f]/.test(path)) return false
  if (allowDot && path === '.') return true
  if (path.length === 0 || path.endsWith('/')) return false
  return path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
}

function readBoundedString(value: unknown, path: string, paths: string[]): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > GRAPH_STRING_MAX) {
    push(paths, path)
    return null
  }
  return value
}

function readCount(value: unknown, path: string, paths: string[]): number | null {
  if (!isCount(value)) {
    push(paths, path)
    return null
  }
  return value
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && !Object.is(value, -0) && value <= Number.MAX_SAFE_INTEGER
}

function isPosInt(value: unknown): value is number {
  return isCount(value) && value >= 1
}

function isConfidence(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function push(paths: string[], path: string) {
  if (paths.length >= JSON_MAX_ERRORS) return
  if (!paths.includes(path)) paths.push(path)
}
