import type { SchemaIssue } from './schema-check.js'
import { baseName, compareStrings, isRepresentablePath, parentPath, ROOT_DIR_ID } from './ids.js'
import { CONFIG_UNRESOLVED_REASONS, type Graph } from './types.js'

const CONFIG_REASON_LOOKUP: Record<string, true> = Object.fromEntries(CONFIG_UNRESOLVED_REASONS.map(reason => [reason, true]))

export interface SemanticOptions {
  /** Stop collecting after this many issues (default 200). */
  maxIssues?: number
  /** Require canonical ordering of nodes/edges/coverage lists (default true). */
  requireCanonicalOrder?: boolean
}

type AnyNode = Record<string, any> & { id: string; kind: string }
type AnyEdge = Record<string, any> & { source: string; type: string; target: string }

const spanOrdered = (span: any): boolean =>
  span.start.line < span.end.line || (span.start.line === span.end.line && span.start.col <= span.end.col)

/**
 * Cross-field rules a JSON Schema cannot express: referential integrity, id/path
 * consistency, ordering, span bounds, containment tree, coverage arithmetic.
 * Unknown node kinds / edge types (newer minor versions) are tolerated, not interpreted.
 */
export function checkSemantics(graph: Graph, options: SemanticOptions = {}): SchemaIssue[] {
  const issues: SchemaIssue[] = []
  const max = options.maxIssues ?? 200
  const order = options.requireCanonicalOrder ?? true
  const add = (path: string, message: string): void => {
    if (issues.length < max) issues.push({ path, message })
  }

  const nodes = graph.nodes as unknown as AnyNode[]
  const edges = graph.edges as unknown as AnyEdge[]
  const byId = new Map<string, AnyNode>()
  let fileNodes = 0

  nodes.forEach((node, index) => {
    const at = `/nodes/${index}`
    if (byId.has(node.id)) add(`${at}/id`, `duplicate node id "${node.id}"`)
    else byId.set(node.id, node)
    if (order && index > 0 && compareStrings((nodes[index - 1] as AnyNode).id, node.id) >= 0) add(`${at}/id`, 'nodes are not in canonical (id) order')

    switch (node.kind) {
      case 'directory':
        if (!isRepresentablePath(node.path, true)) add(`${at}/path`, 'is not a representable repo-relative path')
        else {
          if (node.id !== `dir:${node.path}`) add(`${at}/id`, `must equal "dir:${node.path}"`)
          if (node.label !== baseName(node.path)) add(`${at}/label`, 'must be the last path segment')
        }
        break
      case 'file':
        fileNodes += 1
        if (!isRepresentablePath(node.path)) add(`${at}/path`, 'is not a representable repo-relative path')
        else {
          if (node.id !== `file:${node.path}`) add(`${at}/id`, `must equal "file:${node.path}"`)
          if (node.label !== baseName(node.path)) add(`${at}/label`, 'must be the last path segment')
        }
        if ((node.parse?.status === 'parsed' || node.parse?.status === 'partial') && node.lineCount === null) {
          add(`${at}/lineCount`, 'must not be null for a parsed file')
        }
        break
      case 'external':
        if (node.id !== `ext:${node.ecosystem}:${node.label}`) add(`${at}/id`, `must equal "ext:${node.ecosystem}:${node.label}"`)
        break
      case 'unresolved':
        if (!String(node.id).startsWith('unresolved:') || !String(node.id).includes('::')) add(`${at}/id`, 'must look like "unresolved:<importer>::<specifier>"')
        break
      default:
        break
    }
  })

  if (byId.get(ROOT_DIR_ID)?.kind !== 'directory') add('/nodes', `root directory node "${ROOT_DIR_ID}" is required`)

  const lineCountOf = (fileNodeId: string): number | null | undefined => {
    const file = byId.get(fileNodeId)
    return file?.kind === 'file' ? file.lineCount : undefined
  }

  nodes.forEach((node, index) => {
    if (node.kind !== 'symbol') return
    const at = `/nodes/${index}`
    const file = byId.get(node.file)
    if (!file || file.kind !== 'file') return add(`${at}/file`, `references unknown file node "${node.file}"`)
    if (!String(node.id).startsWith(`sym:${file.path}#`)) add(`${at}/id`, `must start with "sym:${file.path}#"`)
    if (!spanOrdered(node.span)) add(`${at}/span`, 'start must not be after end')
    const lines = file.lineCount
    if (typeof lines === 'number' && node.span.end.line > lines) add(`${at}/span`, `lies beyond the ${lines} lines of ${file.path}`)
  })

  const parentOf = new Map<string, string>()
  const seenEdge = new Set<string>()
  const unresolvedByReason = new Map<string, number>()

  edges.forEach((edge, index) => {
    const at = `/edges/${index}`
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)
    if (!source) add(`${at}/source`, `references unknown node "${edge.source}"`)
    if (!target) add(`${at}/target`, `references unknown node "${edge.target}"`)

    const line = edge.span?.start?.line ?? 0
    const col = edge.span?.start?.col ?? 0
    const key = `${edge.source}\u0000${edge.type}\u0000${edge.target}\u0000${line}\u0000${col}`
    if (seenEdge.has(key)) add(at, 'duplicate edge (source, type, target, start)')
    seenEdge.add(key)
    if (order && index > 0) {
      const previous = edges[index - 1] as AnyEdge
      const cmp =
        compareStrings(previous.source, edge.source) ||
        compareStrings(previous.type, edge.type) ||
        compareStrings(previous.target, edge.target) ||
        (previous.span?.start?.line ?? 0) - line ||
        (previous.span?.start?.col ?? 0) - col
      if (cmp > 0) add(at, 'edges are not in canonical order')
    }
    if (!source || !target) return

    if (edge.type === 'contains') {
      const valid =
        (source.kind === 'directory' && (target.kind === 'directory' || target.kind === 'file')) ||
        (source.kind === 'file' && target.kind === 'symbol') ||
        (source.kind === 'symbol' && target.kind === 'symbol')
      if (!valid) add(at, `contains edge cannot connect ${source.kind} to ${target.kind}`)
      if (parentOf.has(target.id)) add(`${at}/target`, `"${target.id}" has more than one parent`)
      parentOf.set(target.id, source.id)
      if ((target.kind === 'directory' || target.kind === 'file') && typeof target.path === 'string') {
        const parent = parentPath(target.path)
        if (source.kind !== 'directory' || source.path !== parent) add(at, `"${target.path}" must be contained by directory "${parent}"`)
      }
      if (target.kind === 'symbol') {
        const owner = source.kind === 'file' ? source.id : source.kind === 'symbol' ? source.file : undefined
        if (owner !== target.file) add(at, 'a symbol must be contained by its own file or a symbol of the same file')
      }
      return
    }

    if (edge.type === 'imports' || edge.type === 'reexports') {
      if (source.kind !== 'file') add(`${at}/source`, `${edge.type} edges must start at a file node`)
      if (!['file', 'external', 'unresolved'].includes(target.kind)) add(`${at}/target`, `${edge.type} edges cannot end at a ${target.kind} node`)
      if (order && (edge.importKind === 'static' || edge.typeOnly === false)) add(at, 'default values importKind "static" / typeOnly false must be omitted')
      if (edge.span) {
        if (!spanOrdered(edge.span)) add(`${at}/span`, 'start must not be after end')
        const lines = lineCountOf(source.id)
        if (typeof lines === 'number' && edge.span.end.line > lines) add(`${at}/span`, `lies beyond the ${lines} lines of the importing file`)
      }
      if (target.kind === 'unresolved') {
        unresolvedByReason.set(target.reason, (unresolvedByReason.get(target.reason) ?? 0) + 1)
      }
    }
  })

  // Every directory/file except the root has exactly one parent; no containment cycles.
  for (const node of nodes) {
    if ((node.kind === 'directory' && node.id !== ROOT_DIR_ID) || node.kind === 'file' || node.kind === 'symbol') {
      if (!parentOf.has(node.id)) add('/edges', `node "${node.id}" is not contained by anything`)
    }
  }
  const state = new Map<string, number>()
  for (const start of parentOf.keys()) {
    const trail: string[] = []
    let current: string | undefined = start
    while (current !== undefined && state.get(current) !== 2) {
      if (state.get(current) === 1) {
        add('/edges', `containment cycle through "${current}"`)
        break
      }
      state.set(current, 1)
      trail.push(current)
      current = parentOf.get(current)
    }
    for (const id of trail) state.set(id, 2)
  }

  // summary
  const { summary, coverage } = graph
  if (summary.nodes !== nodes.length) add('/summary/nodes', `is ${summary.nodes} but there are ${nodes.length} nodes`)
  if (summary.edges !== edges.length) add('/summary/edges', `is ${summary.edges} but there are ${edges.length} edges`)
  if (summary.files !== fileNodes) add('/summary/files', `is ${summary.files} but there are ${fileNodes} file nodes`)

  // coverage arithmetic
  const f = coverage.files
  const bucketSum = f.parsed + f.partial + f.failed + f.skipped + f.ignored
  if (f.discovered !== bucketSum) add('/coverage/files/discovered', `is ${f.discovered} but the buckets sum to ${bucketSum}`)
  if (coverage.accounting.discovered !== f.discovered) add('/coverage/accounting/discovered', 'must equal coverage.files.discovered')
  if (coverage.accounting.accounted !== coverage.accounting.discovered) add('/coverage/accounting', `discovered ${coverage.accounting.discovered} != accounted ${coverage.accounting.accounted}: a file was dropped silently`)

  const status = { parsed: 0, partial: 0, failed: 0, skipped: 0 }
  const perLanguage = new Map<string, { parsed: number; partial: number; failed: number; skipped: number }>()
  for (const node of nodes) {
    if (node.kind !== 'file' || !(node.parse?.status in status)) continue
    status[node.parse.status as keyof typeof status] += 1
    const key = node.language ?? ''
    const entry = perLanguage.get(key) ?? { parsed: 0, partial: 0, failed: 0, skipped: 0 }
    entry[node.parse.status as keyof typeof status] += 1
    perLanguage.set(key, entry)
  }
  if (status.parsed !== f.parsed) add('/coverage/files/parsed', `is ${f.parsed} but ${status.parsed} file nodes are parsed`)
  if (status.partial !== f.partial) add('/coverage/files/partial', `is ${f.partial} but ${status.partial} file nodes are partial`)
  if (status.failed > f.failed) add('/coverage/files/failed', `is ${f.failed} but ${status.failed} file nodes failed`)
  if (status.skipped > f.skipped) add('/coverage/files/skipped', `is ${f.skipped} but ${status.skipped} file nodes were skipped`)

  const sorted = <T>(items: T[], keyOf: (item: T) => string, path: string): void => {
    for (let i = 0; i < items.length; i += 1) {
      if (i > 0 && compareStrings(keyOf(items[i - 1] as T), keyOf(items[i] as T)) >= 0) {
        add(`${path}/${i}`, order ? 'must be strictly sorted and unique' : 'duplicate entry')
        return
      }
    }
  }
  sorted(coverage.byLanguage, item => item.language ?? '', '/coverage/byLanguage')
  sorted(coverage.skipped, item => item.reason, '/coverage/skipped')
  sorted(coverage.ignored, item => item.rule, '/coverage/ignored')
  sorted(coverage.unresolved, item => item.reason, '/coverage/unresolved')

  const sum = (items: { count: number }[]): number => items.reduce((total, item) => total + item.count, 0)
  if (sum(coverage.skipped) !== f.skipped + f.failed) add('/coverage/skipped', `counts sum to ${sum(coverage.skipped)} but skipped + failed is ${f.skipped + f.failed}`)
  if (sum(coverage.ignored) !== f.ignored) add('/coverage/ignored', `counts sum to ${sum(coverage.ignored)} but ignored is ${f.ignored}`)
  // Every unresolved edge is counted; configuration problems add entries without edges.
  for (const [reason, edgeCount] of unresolvedByReason) {
    const entry = coverage.unresolved.find(item => item.reason === reason)
    if (!entry || entry.count < edgeCount) add('/coverage/unresolved', `reason "${reason}" has ${edgeCount} unresolved edge(s) that coverage does not count`)
  }
  for (const item of coverage.unresolved) {
    if (!(item.reason in CONFIG_REASON_LOOKUP) && (unresolvedByReason.get(item.reason) ?? 0) !== item.count && item.reason !== 'unsupported-resolution') {
      add('/coverage/unresolved', `reason "${item.reason}" counts ${item.count} but ${unresolvedByReason.get(item.reason) ?? 0} edges end at unresolved nodes with it`)
    }
  }
  for (const key of ['parsed', 'partial', 'failed', 'skipped'] as const) {
    const total = coverage.byLanguage.reduce((acc, item) => acc + item[key], 0)
    if (total !== f[key]) add('/coverage/byLanguage', `${key} counts sum to ${total} but files.${key} is ${f[key]}`)
  }
  return issues
}
