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
  ArchitectureEdgeKind,
  ArchitectureFinding,
  ArchitectureModuleDecl,
  ArchitecturePolicy,
  ArchitectureSummary,
  Coverage,
  EntryCandidate,
  EntryReason,
  FileNode,
  GraphArchitecture,
  GraphDocument,
  GraphEdge,
  GraphHotspot,
  GraphNode,
  FolderQualityScore,
  GraphQuality,
  DuplicateGroup,
  DuplicateOccurrence,
  DuplicatesSummary,
  GraphDuplicates,
  ImportKind,
  QualityBreakdownItem,
  QualityCategory,
  QualityGrade,
  QualityScore,
  QualityTip,
  ReadResult,
  Span,
  StateKind,
  StateScope,
  SymbolNode
} from './graph-types'
import { QUALITY_CATEGORIES, QUALITY_GRADES } from './graph-types'
import { readMessageFields } from './message-fields'

const KNOWN_KINDS = new Set(['directory', 'file', 'symbol', 'external', 'unresolved'])
const STATE_SCOPES = new Set<string>(['module', 'class', 'instance', 'global', 'local'])
const STATE_KINDS = new Set<string>(['binding', 'ref', 'reactive', 'computed', 'prop', 'store', 'provide', 'inject'])
const PARSE_STATUS = new Set(['parsed', 'partial', 'failed', 'skipped'])
const ENTRY_REASONS = new Set<EntryReason>(['conventional-name', 'package-bin', 'package-exports', 'package-main', 'package-script'])
const EXTENSION_KEY = /^[a-z][a-z0-9-]*:[A-Za-z0-9._-]+$/
const MODULE_NAME = /^[a-z][a-z0-9-]*$/
const ARCHITECTURE_EDGE_KIND = new Set<ArchitectureEdgeKind>(['imports', 'reexports', 'calls'])
const ARCHITECTURE_POLICY = new Set<ArchitecturePolicy>(['deny-undeclared', 'allow-undeclared'])

export function textExceedsLimit(text: string, limit = GRAPH_BYTE_LIMIT): boolean {
  if (text.length > limit) return true
  if (text.length * 3 <= limit) return false
  return new TextEncoder().encode(text).byteLength > limit
}

/**
 * Read one graph.json document. Tool version, timestamps, and brand strings
 * are not graph fields; unknown properties are dropped. Sidecar run metadata
 * is never opened or required.
 */
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
    // A function that calls itself (recursion) is a real 1.1 calls self-edge; any other self-edge is invalid.
    if (edge.source === edge.target && edge.type !== 'calls') push(paths, pointer(['edges', index, 'target']))
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

  const architecture = Object.hasOwn(value, 'architecture')
    ? readArchitecture(value.architecture, paths)
    : undefined
  if (Object.hasOwn(value, 'architecture') && !architecture) return null

  const hotspots = Object.hasOwn(value, 'hotspots') ? readHotspots(value.hotspots, paths) : undefined
  if (Object.hasOwn(value, 'hotspots') && !hotspots) return null

  const quality = Object.hasOwn(value, 'quality') ? readQuality(value.quality, paths) : undefined
  if (Object.hasOwn(value, 'quality') && !quality) return null

  const duplicates = Object.hasOwn(value, 'duplicates') ? readDuplicates(value.duplicates, paths) : undefined
  if (Object.hasOwn(value, 'duplicates') && !duplicates) return null

  return {
    schemaVersion,
    summary,
    coverage,
    nodes,
    edges,
    ...(architecture ? { architecture } : {}),
    ...(hotspots && hotspots.length > 0 ? { hotspots } : {}),
    ...(quality ? { quality } : {}),
    ...(duplicates && duplicates.groups.length > 0 ? { duplicates } : {})
  }
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
  else if (!isPosInt(value.lineCount)) push(paths, `${base}/lineCount`)
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
  if (status === 'parsed' && reason) push(paths, `${base}/parse/reason`)
  if (status !== 'parsed' && !reason) push(paths, `${base}/parse/reason`)
  const node: FileNode = {
    id,
    kind: 'file',
    path,
    label,
    language,
    lineCount,
    parse: status !== 'parsed' && reason ? { status, reason } : { status }
  }
  if (Object.hasOwn(value, 'docSummary')) {
    const doc = readBoundedString(value.docSummary, `${base}/docSummary`, paths)
    if (doc) node.docSummary = doc
  }
  if (Object.hasOwn(value, 'decoding')) {
    if (value.decoding !== 'lossy') push(paths, `${base}/decoding`)
    else node.decoding = 'lossy'
  }
  if (Object.hasOwn(value, 'entryCandidate')) {
    const candidate = readEntryCandidate(value.entryCandidate, `${base}/entryCandidate`, paths)
    if (!candidate) return null
    node.entryCandidate = candidate
  }
  if (Object.hasOwn(value, 'module')) {
    const moduleName = readBoundedString(value.module, `${base}/module`, paths)
    if (!moduleName || !MODULE_NAME.test(moduleName)) {
      push(paths, `${base}/module`)
      return null
    }
    node.module = moduleName
  }
  if (Object.hasOwn(value, 'hotspot')) {
    const hotspot = readFileHotspot(value.hotspot, `${base}/hotspot`, paths)
    if (!hotspot) return null
    node.hotspot = hotspot
  }
  return node
}

function readFileHotspot(value: unknown, base: string, paths: string[]): FileNode['hotspot'] | null {
  if (!isRecord(value)) {
    push(paths, base)
    return null
  }
  const score = readHotspotScore(value.score, `${base}/score`, paths)
  if (score === null) return null
  return { score }
}

function readHotspots(value: unknown, paths: string[]): GraphHotspot[] | null {
  if (!Array.isArray(value)) {
    push(paths, '/hotspots')
    return null
  }
  const rows: GraphHotspot[] = []
  let failed = false
  value.forEach((entry, index) => {
    const base = `/hotspots/${index}`
    if (!isRecord(entry)) {
      push(paths, base)
      failed = true
      return
    }
    const path = readBoundedString(entry.path, `${base}/path`, paths)
    const why = readBoundedString(entry.why, `${base}/why`, paths)
    const score = readHotspotScore(entry.score, `${base}/score`, paths)
    if (!path || !why || score === null) {
      failed = true
      return
    }
    const fields = readMessageFields(entry)
    if (fields === 'invalid') {
      push(paths, base)
      failed = true
      return
    }
    rows.push(fields ? { path, score, why, ...fields } : { path, score, why })
  })
  return failed ? null : rows
}

function readHotspotScore(value: unknown, path: string, paths: string[]): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || Object.is(value, -0) || value < 0 || value > 100) {
    push(paths, path)
    return null
  }
  return value
}

const QUALITY_GRADE_SET = new Set<string>(QUALITY_GRADES)
const QUALITY_CATEGORY_SET = new Set<string>(QUALITY_CATEGORIES)

function readQuality(value: unknown, paths: string[]): GraphQuality | null {
  if (!isRecord(value)) {
    push(paths, '/quality')
    return null
  }
  const project = readQualityScore(value.project, '/quality/project', paths, false)
  if (!project) return null
  if (!Object.hasOwn(value, 'folders')) return { project }
  if (!Array.isArray(value.folders)) {
    push(paths, '/quality/folders')
    return null
  }
  const folders: FolderQualityScore[] = []
  let failed = false
  value.folders.forEach((entry, index) => {
    const row = readQualityScore(entry, `/quality/folders/${index}`, paths, true)
    if (!row || !('path' in row)) {
      failed = true
      return
    }
    folders.push(row)
  })
  if (failed) return null
  return folders.length > 0 ? { project, folders } : { project }
}

function readQualityScore(
  value: unknown,
  base: string,
  paths: string[],
  withPath: false
): QualityScore | null
function readQualityScore(
  value: unknown,
  base: string,
  paths: string[],
  withPath: true
): FolderQualityScore | null
function readQualityScore(
  value: unknown,
  base: string,
  paths: string[],
  withPath: boolean
): QualityScore | FolderQualityScore | null {
  if (!isRecord(value)) {
    push(paths, base)
    return null
  }
  const score = readHotspotScore(value.score, `${base}/score`, paths)
  const grade = readQualityGrade(value.grade, `${base}/grade`, paths)
  const breakdown = readQualityBreakdown(value.breakdown, `${base}/breakdown`, paths)
  const tips = readQualityTips(value.tips, `${base}/tips`, paths)
  if (score === null || !grade || !breakdown || !tips) return null
  if (withPath) {
    const path = readBoundedString(value.path, `${base}/path`, paths)
    if (!path) return null
    return { path, score, grade, breakdown, tips }
  }
  return { score, grade, breakdown, tips }
}

function readQualityGrade(value: unknown, path: string, paths: string[]): QualityGrade | null {
  if (typeof value !== 'string' || !QUALITY_GRADE_SET.has(value)) {
    push(paths, path)
    return null
  }
  return value as QualityGrade
}

function readQualityBreakdown(value: unknown, base: string, paths: string[]): QualityBreakdownItem[] | null {
  if (!Array.isArray(value) || value.length !== QUALITY_CATEGORIES.length) {
    push(paths, base)
    return null
  }
  const items: QualityBreakdownItem[] = []
  let failed = false
  value.forEach((entry, index) => {
    const itemBase = `${base}/${index}`
    if (!isRecord(entry)) {
      push(paths, itemBase)
      failed = true
      return
    }
    const category = entry.category
    if (typeof category !== 'string' || !QUALITY_CATEGORY_SET.has(category)) {
      push(paths, `${itemBase}/category`)
      failed = true
      return
    }
    const label = readBoundedString(entry.label, `${itemBase}/label`, paths)
    const penalty = readHotspotScore(entry.penalty, `${itemBase}/penalty`, paths)
    if (!label || penalty === null) {
      failed = true
      return
    }
    const fields = readMessageFields(entry)
    if (fields === 'invalid') {
      push(paths, itemBase)
      failed = true
      return
    }
    items.push(fields ? { category: category as QualityCategory, label, penalty, ...fields } : { category: category as QualityCategory, label, penalty })
  })
  if (failed) return null
  const categories = new Set(items.map((item) => item.category))
  if (categories.size !== QUALITY_CATEGORIES.length) {
    push(paths, base)
    return null
  }
  return items
}

function readQualityTips(value: unknown, base: string, paths: string[]): QualityTip[] | null {
  if (!Array.isArray(value) || value.length > 3) {
    push(paths, base)
    return null
  }
  const tips: QualityTip[] = []
  let failed = false
  value.forEach((entry, index) => {
    const itemBase = `${base}/${index}`
    if (!isRecord(entry)) {
      push(paths, itemBase)
      failed = true
      return
    }
    const text = readBoundedString(entry.text, `${itemBase}/text`, paths)
    const gain = readHotspotScore(entry.gain, `${itemBase}/gain`, paths)
    if (!text || gain === null || gain < 1) {
      if (gain === 0) push(paths, `${itemBase}/gain`)
      failed = true
      return
    }
    const fields = readMessageFields(entry)
    if (fields === 'invalid') {
      push(paths, itemBase)
      failed = true
      return
    }
    tips.push(fields ? { text, gain, ...fields } : { text, gain })
  })
  return failed ? null : tips
}

function readDuplicates(value: unknown, paths: string[]): GraphDuplicates | null {
  if (!isRecord(value)) {
    push(paths, '/duplicates')
    return null
  }
  const summary = readDuplicatesSummary(value.summary, paths)
  if (!summary) return null
  if (!Array.isArray(value.groups)) {
    push(paths, '/duplicates/groups')
    return null
  }
  const groups: DuplicateGroup[] = []
  let failed = false
  value.groups.forEach((entry, index) => {
    const group = readDuplicateGroup(entry, `/duplicates/groups/${index}`, paths)
    if (!group) {
      failed = true
      return
    }
    groups.push(group)
  })
  if (failed) return null
  return { summary, groups }
}

function readDuplicatesSummary(value: unknown, paths: string[]): DuplicatesSummary | null {
  if (!isRecord(value)) {
    push(paths, '/duplicates/summary')
    return null
  }
  const groups = readCount(value.groups, '/duplicates/summary/groups', paths)
  const duplicatedLines = readCount(value.duplicatedLines, '/duplicates/summary/duplicatedLines', paths)
  const percentage = readHotspotScore(value.percentage, '/duplicates/summary/percentage', paths)
  if (groups === null || duplicatedLines === null || percentage === null) return null
  return { groups, duplicatedLines, percentage }
}

function readDuplicateGroup(value: unknown, base: string, paths: string[]): DuplicateGroup | null {
  if (!isRecord(value)) {
    push(paths, base)
    return null
  }
  const id = readBoundedString(value.id, `${base}/id`, paths)
  const description = readBoundedString(value.description, `${base}/description`, paths)
  const lineCount = readPositiveCount(value.lineCount, `${base}/lineCount`, paths)
  const occurrences = readDuplicateOccurrences(value.occurrences, `${base}/occurrences`, paths)
  if (!id || !description || lineCount === null || !occurrences) return null
  const fields = readMessageFields(value)
  if (fields === 'invalid') {
    push(paths, base)
    return null
  }
  return fields ? { id, lineCount, occurrences, description, ...fields } : { id, lineCount, occurrences, description }
}

function readDuplicateOccurrences(value: unknown, base: string, paths: string[]): DuplicateOccurrence[] | null {
  if (!Array.isArray(value) || value.length < 2) {
    push(paths, base)
    return null
  }
  const rows: DuplicateOccurrence[] = []
  let failed = false
  value.forEach((entry, index) => {
    const itemBase = `${base}/${index}`
    if (!isRecord(entry)) {
      push(paths, itemBase)
      failed = true
      return
    }
    const path = readBoundedString(entry.path, `${itemBase}/path`, paths)
    const startLine = readPositiveCount(entry.startLine, `${itemBase}/startLine`, paths)
    const endLine = readPositiveCount(entry.endLine, `${itemBase}/endLine`, paths)
    if (!path || startLine === null || endLine === null) {
      failed = true
      return
    }
    if (startLine > endLine) {
      push(paths, `${itemBase}/endLine`)
      failed = true
      return
    }
    rows.push({ path, startLine, endLine })
  })
  return failed ? null : rows
}

function readPositiveCount(value: unknown, path: string, paths: string[]): number | null {
  if (!isPosInt(value)) {
    push(paths, path)
    return null
  }
  return value
}

function readEntryCandidate(value: unknown, base: string, paths: string[]): EntryCandidate | null {
  if (!isRecord(value)) {
    push(paths, base)
    return null
  }
  if (typeof value.reason !== 'string' || !ENTRY_REASONS.has(value.reason as EntryReason)) {
    push(paths, `${base}/reason`)
    return null
  }
  if (value.provenance !== 'EXTRACTED' && value.provenance !== 'INFERRED') {
    push(paths, `${base}/provenance`)
    return null
  }
  return { reason: value.reason as EntryReason, provenance: value.provenance }
}

function readSymbol(value: Record<string, unknown>, id: string, base: string, paths: string[]): GraphNode | null {
  const file = readBoundedString(value.file, `${base}/file`, paths)
  const label = readBoundedString(value.label, `${base}/label`, paths)
  const symbolKind = readBoundedString(value.symbolKind, `${base}/symbolKind`, paths)
  const span = readSpan(value.span, `${base}/span`, paths)
  if (!file || !label || !symbolKind || !span) return null
  if (typeof value.exported !== 'boolean') push(paths, `${base}/exported`)
  if (!id.startsWith('sym:') || !id.includes('#')) push(paths, `${base}/id`)
  const symbol: SymbolNode = { id, kind: 'symbol', file, label, symbolKind, exported: value.exported === true, span }
  // graph.json 1.1 additive fields: a wrong shape is reported, never trusted.
  if (Object.hasOwn(value, 'parent')) {
    const parent = readBoundedString(value.parent, `${base}/parent`, paths)
    if (parent) symbol.parent = parent
  }
  if (Object.hasOwn(value, 'paramCount')) {
    if (Number.isInteger(value.paramCount) && (value.paramCount as number) >= 0) symbol.paramCount = value.paramCount as number
    else push(paths, `${base}/paramCount`)
  }
  if (Object.hasOwn(value, 'scope')) {
    if (typeof value.scope === 'string' && STATE_SCOPES.has(value.scope)) symbol.scope = value.scope as StateScope
    else push(paths, `${base}/scope`)
  }
  if (Object.hasOwn(value, 'mutable')) {
    if (typeof value.mutable === 'boolean') symbol.mutable = value.mutable
    else push(paths, `${base}/mutable`)
  }
  if (Object.hasOwn(value, 'stateKind')) {
    if (typeof value.stateKind === 'string' && STATE_KINDS.has(value.stateKind)) symbol.stateKind = value.stateKind as StateKind
    else push(paths, `${base}/stateKind`)
  }
  if (Object.hasOwn(value, 'docSummary')) {
    const doc = readBoundedString(value.docSummary, `${base}/docSummary`, paths)
    if (doc) symbol.docSummary = doc
  }
  return symbol
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
      const imported = readImportFields(value, base, paths)
      if (!specifier || !imported) return null
      return { source, type, target, provenance, span, specifier, ...imported, confidence: Number(value.confidence), reason }
    }
    return { source, type, target, provenance, span, confidence: Number(value.confidence), reason }
  }
  if (Object.hasOwn(value, 'confidence')) push(paths, `${base}/confidence`)
  if (Object.hasOwn(value, 'reason')) push(paths, `${base}/reason`)
  if (type === 'imports' || type === 'reexports') {
    const specifier = readBoundedString(value.specifier, `${base}/specifier`, paths)
    const imported = readImportFields(value, base, paths)
    if (!specifier || !imported) return null
    return { source, type, target, provenance: 'EXTRACTED', span, specifier, ...imported }
  }
  return { source, type, target, provenance: 'EXTRACTED', span }
}

function readImportFields(
  value: Record<string, unknown>,
  base: string,
  paths: string[]
): { importKind: ImportKind; typeOnly: boolean } | null {
  let importKind: ImportKind = 'static'
  if (Object.hasOwn(value, 'importKind')) {
    // The published schema writes this only for dynamic and require. `static` is the omission default.
    if (value.importKind !== 'dynamic' && value.importKind !== 'require') {
      push(paths, `${base}/importKind`)
      return null
    }
    importKind = value.importKind
  }
  let typeOnly = false
  if (Object.hasOwn(value, 'typeOnly')) {
    // The published schema writes typeOnly only as true.
    if (value.typeOnly !== true) {
      push(paths, `${base}/typeOnly`)
      return null
    }
    typeOnly = true
  }
  return { importKind, typeOnly }
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

function readArchitecture(value: unknown, paths: string[]): GraphArchitecture | null {
  if (!isRecord(value)) {
    push(paths, '/architecture')
    return null
  }
  const config = readBoundedString(value.config, '/architecture/config', paths)
  const modules = readArchitectureModules(value.modules, paths)
  const unassigned = readStringArray(value.unassigned, '/architecture/unassigned', paths)
  const summary = readArchitectureSummary(value.summary, paths)
  if (!config || !modules || !unassigned || !summary) return null
  let defaultPolicy: ArchitecturePolicy | undefined
  if (Object.hasOwn(value, 'defaultPolicy')) {
    if (typeof value.defaultPolicy !== 'string' || !ARCHITECTURE_POLICY.has(value.defaultPolicy as ArchitecturePolicy)) {
      push(paths, '/architecture/defaultPolicy')
      return null
    }
    defaultPolicy = value.defaultPolicy as ArchitecturePolicy
  }
  let findings: ArchitectureFinding[] | undefined
  if (Object.hasOwn(value, 'findings')) {
    const read = readArchitectureFindings(value.findings, paths)
    if (!read) return null
    findings = read.length > 0 ? read : undefined
  }
  return {
    config,
    ...(defaultPolicy ? { defaultPolicy } : {}),
    modules,
    unassigned,
    ...(findings ? { findings } : {}),
    summary
  }
}

function readArchitectureModules(value: unknown, paths: string[]): ArchitectureModuleDecl[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    push(paths, '/architecture/modules')
    return null
  }
  const modules: ArchitectureModuleDecl[] = []
  let failed = false
  value.forEach((entry, index) => {
    const base = `/architecture/modules/${index}`
    if (!isRecord(entry)) {
      push(paths, base)
      failed = true
      return
    }
    const name = readBoundedString(entry.name, `${base}/name`, paths)
    const pathPatterns = readStringArray(entry.paths, `${base}/paths`, paths)
    if (!name || !MODULE_NAME.test(name) || !pathPatterns || pathPatterns.length === 0) {
      failed = true
      return
    }
    const mod: ArchitectureModuleDecl = { name, paths: pathPatterns }
    if (Object.hasOwn(entry, 'allow')) {
      const allow = readModuleNameArray(entry.allow, `${base}/allow`, paths)
      if (!allow) {
        failed = true
        return
      }
      mod.allow = allow
    }
    if (Object.hasOwn(entry, 'deny')) {
      const deny = readModuleNameArray(entry.deny, `${base}/deny`, paths)
      if (!deny) {
        failed = true
        return
      }
      mod.deny = deny
    }
    if (Object.hasOwn(entry, 'policy')) {
      if (typeof entry.policy !== 'string' || !ARCHITECTURE_POLICY.has(entry.policy as ArchitecturePolicy)) {
        push(paths, `${base}/policy`)
        failed = true
        return
      }
      mod.policy = entry.policy as ArchitecturePolicy
    }
    modules.push(mod)
  })
  return failed ? null : modules
}

function readArchitectureFindings(value: unknown, paths: string[]): ArchitectureFinding[] | null {
  if (!Array.isArray(value)) {
    push(paths, '/architecture/findings')
    return null
  }
  const findings: ArchitectureFinding[] = []
  let failed = false
  value.forEach((entry, index) => {
    const base = `/architecture/findings/${index}`
    if (!isRecord(entry)) {
      push(paths, base)
      failed = true
      return
    }
    const from = readBoundedString(entry.from, `${base}/from`, paths)
    const to = readBoundedString(entry.to, `${base}/to`, paths)
    const file = readBoundedString(entry.file, `${base}/file`, paths)
    const rule = readBoundedString(entry.rule, `${base}/rule`, paths)
    if (!from || !to || !file || !isRelPath(file, false) || !rule) {
      failed = true
      return
    }
    if (typeof entry.edgeKind !== 'string' || !ARCHITECTURE_EDGE_KIND.has(entry.edgeKind as ArchitectureEdgeKind)) {
      push(paths, `${base}/edgeKind`)
      failed = true
      return
    }
    if (!isPosInt(entry.line)) {
      push(paths, `${base}/line`)
      failed = true
      return
    }
    // graph.json v1 minor change: INFERRED only for workspace-package resolutions.
    if (entry.provenance !== 'EXTRACTED' && entry.provenance !== 'INFERRED') {
      push(paths, `${base}/provenance`)
      failed = true
      return
    }
    findings.push({
      from,
      to,
      edgeKind: entry.edgeKind as ArchitectureEdgeKind,
      file,
      line: entry.line,
      rule,
      provenance: entry.provenance
    })
  })
  return failed ? null : findings
}

function readArchitectureSummary(value: unknown, paths: string[]): ArchitectureSummary | null {
  if (!isRecord(value)) {
    push(paths, '/architecture/summary')
    return null
  }
  const violations = readCount(value.violations, '/architecture/summary/violations', paths)
  const unassignedFiles = readCount(value.unassignedFiles, '/architecture/summary/unassignedFiles', paths)
  if (violations === null || unassignedFiles === null) return null
  return { violations, unassignedFiles }
}

function readStringArray(value: unknown, path: string, paths: string[]): string[] | null {
  if (!Array.isArray(value)) {
    push(paths, path)
    return null
  }
  const rows: string[] = []
  let failed = false
  value.forEach((entry, index) => {
    const read = readBoundedString(entry, `${path}/${index}`, paths)
    if (!read) failed = true
    else rows.push(read)
  })
  return failed ? null : rows
}

function readModuleNameArray(value: unknown, path: string, paths: string[]): string[] | null {
  const rows = readStringArray(value, path, paths)
  if (!rows) return null
  if (rows.some(name => !MODULE_NAME.test(name))) {
    push(paths, path)
    return null
  }
  return rows
}

function push(paths: string[], path: string) {
  if (paths.length >= JSON_MAX_ERRORS) return
  if (!paths.includes(path)) paths.push(path)
}
