import {
  EXPAND_NODE_CAP,
  HARD_EDGE_CAP,
  HARD_NODE_CAP,
  INITIAL_NODE_CAP
} from './caps'
import type { GraphDocument, GraphEdge, GraphNode, Provenance } from './graph-types'

export interface GraphIndex {
  document: GraphDocument
  nodesById: Map<string, GraphNode>
  children: Map<string, string[]>
  parentOf: Map<string, string>
  descendantCount: Map<string, number>
  clusterMembers: Map<string, string[]>
  topLevel: string[]
  languages: string[]
  kinds: string[]
  edgeTypes: string[]
  unresolvedTouch: Set<string>
  outgoing: Map<string, FocusLink[]>
  incoming: Map<string, FocusLink[]>
}

export interface FocusLink {
  other: string
  provenance: Provenance
  unresolved: boolean
}

export interface ProvenanceFilter {
  extracted: boolean
  inferred: boolean
  unresolved: boolean
}

export interface ViewFilters {
  provenance: ProvenanceFilter
  /** Null means every kind is included. */
  kinds: string[] | null
  /** Null means every language is included. */
  languages: string[] | null
  driftOnly: boolean
}

export interface ViewState {
  expanded: string[]
  revealed: Record<string, number>
  pinned: string[]
}

export interface OverviewNodeModel {
  id: string
  label: string
  kind: string
  cluster: boolean
  clusterSize: number
  expanded: boolean
  depth: number
  path: string
  more: boolean
  remainder: number
  internalEdges: number
  dimmed: boolean
}

export type EdgeVisual = 'extracted' | 'inferred' | 'unresolved' | 'mixed'

export interface OverviewEdgeModel {
  id: string
  source: string
  target: string
  provenance: Provenance | 'MIXED'
  resolved: boolean
  weight: number
  visual: EdgeVisual
  hierarchy: boolean
  extracted: number
  inferred: number
  unresolved: number
  label: string
}

export interface OverviewModel {
  nodes: OverviewNodeModel[]
  edges: OverviewEdgeModel[]
  hiddenNodes: number
  hiddenEdges: number
  edgesOmittedByCap: number
  positions: Map<string, { x: number; y: number }>
}

export const LAYOUT_COLUMN = 280
export const LAYOUT_ROW = 80

export function emptyViewState(): ViewState {
  return { expanded: [], revealed: {}, pinned: [] }
}

export function defaultFilters(): ViewFilters {
  return {
    provenance: { extracted: true, inferred: true, unresolved: true },
    kinds: null,
    languages: null,
    driftOnly: false
  }
}

export function indexGraph(document: GraphDocument): GraphIndex {
  const nodesById = new Map<string, GraphNode>()
  for (const node of document.nodes) nodesById.set(node.id, node)

  const children = new Map<string, string[]>()
  const parentOf = new Map<string, string>()
  for (const edge of document.edges) {
    if (edge.type !== 'contains') continue
    const list = children.get(edge.source) ?? []
    list.push(edge.target)
    children.set(edge.source, list)
    if (!parentOf.has(edge.target)) parentOf.set(edge.target, edge.source)
  }
  for (const [id, list] of children) {
    list.sort(compareUtf16)
    children.set(id, list)
  }

  const reached = new Set<string>()
  if (nodesById.has('dir:.')) {
    const stack = ['dir:.']
    reached.add('dir:.')
    while (stack.length > 0) {
      const current = stack.pop()!
      for (const child of children.get(current) ?? []) {
        if (reached.has(child)) continue
        reached.add(child)
        stack.push(child)
      }
    }
  }

  const clusterMembers = new Map<string, string[]>()
  for (const node of document.nodes) {
    const orphan = nodesById.has('dir:.')
      ? !reached.has(node.id)
      : node.kind === 'external' || node.kind === 'unresolved' || !parentOf.has(node.id) && node.kind !== 'directory' && node.kind !== 'file'
    const groupExternal = !nodesById.has('dir:.') && (node.kind === 'external' || node.kind === 'unresolved')
    if (!orphan && !groupExternal) continue
    if (!nodesById.has('dir:.') && parentOf.has(node.id)) continue
    const clusterId = `cluster:${node.kind}`
    const members = clusterMembers.get(clusterId) ?? []
    members.push(node.id)
    clusterMembers.set(clusterId, members)
    parentOf.set(node.id, clusterId)
  }
  for (const [clusterId, members] of clusterMembers) {
    members.sort(compareUtf16)
    children.set(clusterId, members)
  }

  const descendantCount = descendantCounts(children, [
    ...document.nodes.map((node) => node.id),
    ...clusterMembers.keys()
  ])

  const topLevel: string[] = []
  if (nodesById.has('dir:.')) {
    for (const child of children.get('dir:.') ?? []) topLevel.push(child)
  } else {
    for (const node of document.nodes) {
      if (!parentOf.has(node.id) && !node.id.startsWith('cluster:')) topLevel.push(node.id)
    }
  }
  for (const clusterId of clusterMembers.keys()) topLevel.push(clusterId)
  topLevel.sort(compareUtf16)

  const languages = new Set<string>()
  const kinds = new Set<string>()
  for (const node of document.nodes) {
    kinds.add(node.kind)
    if (node.kind === 'file' && 'language' in node) languages.add(node.language ?? '')
  }
  const edgeTypes = new Set<string>()
  for (const edge of document.edges) edgeTypes.add(edge.type)

  const unresolvedTouch = new Set<string>()
  for (const node of document.nodes) {
    if (node.kind === 'unresolved') unresolvedTouch.add(node.id)
  }
  const outgoing = new Map<string, FocusLink[]>()
  const incoming = new Map<string, FocusLink[]>()
  for (const edge of document.edges) {
    const target = nodesById.get(edge.target)
    const unresolved = target?.kind === 'unresolved'
    if (unresolved) {
      unresolvedTouch.add(edge.target)
      let current: string | undefined = edge.source
      while (current) {
        unresolvedTouch.add(current)
        current = parentOf.get(current)
      }
    }
    if (edge.type === 'contains') continue
    const forward: FocusLink = { other: edge.target, provenance: edge.provenance, unresolved }
    const back: FocusLink = { other: edge.source, provenance: edge.provenance, unresolved }
    const outList = outgoing.get(edge.source) ?? []
    outList.push(forward)
    outgoing.set(edge.source, outList)
    const inList = incoming.get(edge.target) ?? []
    inList.push(back)
    incoming.set(edge.target, inList)
  }

  return {
    document,
    nodesById,
    children,
    parentOf,
    descendantCount,
    clusterMembers,
    topLevel,
    languages: [...languages].sort(compareUtf16),
    kinds: [...kinds].sort(compareUtf16),
    edgeTypes: [...edgeTypes].sort(compareUtf16),
    unresolvedTouch,
    outgoing,
    incoming
  }
}

function descendantCounts(children: Map<string, string[]>, ids: string[]): Map<string, number> {
  const count = new Map<string, number>()
  const state = new Map<string, number>()
  for (const start of ids) {
    if (state.get(start) === 2) continue
    const stack: { id: string; index: number }[] = [{ id: start, index: 0 }]
    state.set(start, 1)
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!
      const kids = children.get(frame.id) ?? []
      if (frame.index >= kids.length) {
        let total = 0
        for (const child of kids) total += 1 + (count.get(child) ?? 0)
        count.set(frame.id, total)
        state.set(frame.id, 2)
        stack.pop()
        continue
      }
      const next = kids[frame.index]!
      frame.index += 1
      const seen = state.get(next) ?? 0
      if (seen === 0) {
        state.set(next, 1)
        stack.push({ id: next, index: 0 })
      }
    }
  }
  return count
}

export function expandView(state: ViewState, id: string): ViewState {
  const next = cloneState(state)
  if (id.startsWith('more:')) {
    const key = id.slice('more:'.length)
    const base = next.revealed[key] ?? (key === 'root' ? INITIAL_NODE_CAP : EXPAND_NODE_CAP)
    next.revealed[key] = base + EXPAND_NODE_CAP
    return next
  }
  if (!next.expanded.includes(id)) next.expanded.push(id)
  if (next.revealed[id] === undefined) next.revealed[id] = EXPAND_NODE_CAP
  return next
}

export function collapseView(index: GraphIndex, state: ViewState, id: string): ViewState {
  const drop = new Set<string>([id])
  const stack = [id]
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const child of index.children.get(current) ?? []) {
      if (drop.has(child)) continue
      drop.add(child)
      stack.push(child)
    }
  }
  return {
    expanded: state.expanded.filter((item) => !drop.has(item)),
    revealed: Object.fromEntries(Object.entries(state.revealed).filter(([key]) => !drop.has(key))),
    pinned: state.pinned.filter((item) => !drop.has(item))
  }
}

export function pinPath(index: GraphIndex, state: ViewState, id: string): ViewState {
  const next = cloneState(state)
  const chain: string[] = []
  let current: string | undefined = id
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    chain.push(current)
    current = index.parentOf.get(current)
  }
  for (let i = 0; i < chain.length; i += 1) {
    const nodeId = chain[i]!
    next.pinned = next.pinned.includes(nodeId) ? next.pinned : [...next.pinned, nodeId]
    const parent = index.parentOf.get(nodeId)
    if (!parent) continue
    if (!next.expanded.includes(parent)) next.expanded.push(parent)
    if (next.revealed[parent] === undefined) next.revealed[parent] = 0
  }
  if (chain.length > 1) {
    const rootParent = index.parentOf.get(chain[chain.length - 1]!)
    if (!rootParent && next.revealed.root === undefined) next.revealed.root = 0
  }
  return next
}

export interface FocusQuery {
  nodeId: string
  direction: 'in' | 'out' | 'both'
  depth: number
  confirmedOnly: boolean
}

export interface FocusHits {
  confirmed: string[]
  possible: string[]
  unresolvedLeaving: number
}

export function focusHits(index: GraphIndex, query: FocusQuery): FocusHits {
  const confirmed = walkFocus(index, query, true)
  const possible = query.confirmedOnly ? [] : walkFocus(index, query, false).filter((id) => !confirmed.includes(id))
  let unresolvedLeaving = 0
  for (const edge of index.document.edges) {
    if (edge.type === 'contains') continue
    if (edge.source !== query.nodeId && edge.target !== query.nodeId) continue
    const target = index.nodesById.get(edge.target)
    if (target?.kind === 'unresolved') unresolvedLeaving += 1
  }
  return { confirmed, possible, unresolvedLeaving }
}

function walkFocus(index: GraphIndex, query: FocusQuery, extractedOnly: boolean): string[] {
  const found: string[] = []
  const seen = new Set<string>([query.nodeId])
  let frontier = [query.nodeId]
  const depth = Math.max(1, Math.min(FOCUS_DEPTH_CAP, query.depth))
  for (let step = 0; step < depth; step += 1) {
    const next: string[] = []
    for (const nodeId of frontier) {
      const links: FocusLink[] = []
      if (query.direction === 'out' || query.direction === 'both') links.push(...(index.outgoing.get(nodeId) ?? []))
      if (query.direction === 'in' || query.direction === 'both') links.push(...(index.incoming.get(nodeId) ?? []))
      for (const link of links) {
        if (link.unresolved) continue
        if (extractedOnly && link.provenance !== 'EXTRACTED') continue
        if (seen.has(link.other)) continue
        seen.add(link.other)
        found.push(link.other)
        next.push(link.other)
        if (found.length >= EXPAND_NODE_CAP) return found
      }
    }
    frontier = next
  }
  return found
}

const FOCUS_DEPTH_CAP = 6

export function buildOverview(
  index: GraphIndex,
  state: ViewState,
  filters: ViewFilters,
  focusIds: ReadonlySet<string> | null = null
): OverviewModel {
  const provenanceOpen = filters.provenance.extracted || filters.provenance.inferred || filters.provenance.unresolved
  const expanded = new Set(state.expanded)
  const pinned = new Set(state.pinned)
  const nodes: OverviewNodeModel[] = []
  const visible = new Set<string>()
  const hiddenNodeIds = new Set<string>()

  const passes = (id: string): boolean => {
    if (!provenanceOpen) return false
    if (id.startsWith('cluster:')) {
      const kind = id.slice('cluster:'.length)
      if (filters.kinds && !filters.kinds.includes(kind)) return false
      const members = index.clusterMembers.get(id) ?? []
      return members.some((member) => passes(member))
    }
    const node = index.nodesById.get(id)
    if (!node) return false
    if (filters.kinds && !filters.kinds.includes(node.kind)) return false
    if (filters.languages && !languageOk(index, filters, id)) return false
    if (filters.driftOnly && !index.unresolvedTouch.has(id) && !descendantTouchesUnresolved(index, id)) return false
    return true
  }

  const considerHidden = (id: string) => {
    if (id.startsWith('cluster:') || id.startsWith('more:')) return
    if (!passes(id)) hiddenNodeIds.add(id)
  }
  for (const node of index.document.nodes) considerHidden(node.id)

  const addLevel = (parentKey: string, childIds: string[], depth: number) => {
    const filtered = childIds.filter((id) => passes(id))
    const room = HARD_NODE_CAP - nodes.length
    if (room <= 0) return
    const configured = state.revealed[parentKey]
    const sliceCap = configured ?? (parentKey === 'root' ? INITIAL_NODE_CAP : EXPAND_NODE_CAP)
    const pinnedHere = filtered.filter((id) => pinned.has(id) && filtered.indexOf(id) >= sliceCap)
    const page = filtered.slice(0, sliceCap)
    const chosen: string[] = []
    const chosenSet = new Set<string>()
    for (const id of [...page, ...pinnedHere]) {
      if (chosenSet.has(id)) continue
      chosenSet.add(id)
      chosen.push(id)
    }
    const overflow = filtered.length > chosen.length
    const limit = Math.min(chosen.length, Math.max(room - (overflow ? 1 : 0), 0))
    const rootLimited = parentKey === 'root' && overflow
      ? Math.min(limit, Math.max(sliceCap - 1, 0))
      : limit
    const shown = chosen.slice(0, rootLimited)
    const shownSet = new Set(shown)
    const remainder = filtered.filter((id) => !shownSet.has(id)).length
    for (const id of shown) {
      if (nodes.length >= HARD_NODE_CAP) break
      const model = nodeModel(index, id, depth, expanded.has(id), focusIds)
      nodes.push(model)
      visible.add(id)
      if (model.expanded) addLevel(id, index.children.get(id) ?? [], depth + 1)
    }
    if (remainder > 0 && nodes.length < HARD_NODE_CAP) {
      const moreId = `more:${parentKey}`
      nodes.push({
        id: moreId,
        label: '',
        kind: 'more',
        cluster: false,
        clusterSize: remainder,
        expanded: false,
        depth,
        path: '',
        more: true,
        remainder,
        internalEdges: 0,
        dimmed: false
      })
      visible.add(moreId)
    }
  }

  addLevel('root', index.topLevel, 0)

  const internal = new Map<string, number>()
  const bundles = new Map<string, Bundle>()
  let hiddenEdges = 0
  for (const edge of index.document.edges) {
    if (!edgePasses(index, filters, edge)) {
      hiddenEdges += 1
      continue
    }
    if (edge.type === 'contains') {
      if (visible.has(edge.source) && visible.has(edge.target)) {
        addBundle(bundles, edge.source, edge.target, edge, true, index)
      }
      continue
    }
    const source = representative(index, edge.source, visible, state)
    const target = representative(index, edge.target, visible, state)
    if (!source || !target) {
      hiddenEdges += 1
      continue
    }
    if (source === target) {
      internal.set(source, (internal.get(source) ?? 0) + 1)
      continue
    }
    addBundle(bundles, source, target, edge, false, index)
  }

  for (const node of nodes) node.internalEdges = internal.get(node.id) ?? 0

  let edgeModels = [...bundles.values()].map(toEdgeModel)
  edgeModels.sort((a, b) => b.weight - a.weight || compareUtf16(a.id, b.id))
  const edgesOmittedByCap = Math.max(0, edgeModels.length - HARD_EDGE_CAP)
  edgeModels = edgeModels.slice(0, HARD_EDGE_CAP)

  return {
    nodes,
    edges: edgeModels,
    hiddenNodes: hiddenNodeIds.size,
    hiddenEdges,
    edgesOmittedByCap,
    positions: layoutNodes(nodes)
  }
}

export function layoutNodes(nodes: { id: string; depth: number }[]): Map<string, { x: number; y: number }> {
  const columns = new Map<number, string[]>()
  for (const node of nodes) {
    const list = columns.get(node.depth) ?? []
    list.push(node.id)
    columns.set(node.depth, list)
  }
  const positions = new Map<string, { x: number; y: number }>()
  const depths = [...columns.keys()].sort((a, b) => a - b)
  for (const depth of depths) {
    const ids = columns.get(depth) ?? []
    ids.sort(compareUtf16)
    ids.forEach((id, index) => {
      positions.set(id, { x: depth * LAYOUT_COLUMN, y: index * LAYOUT_ROW })
    })
  }
  return positions
}

export function compareUtf16(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function edgeVisual(provenance: Provenance | 'MIXED', resolved: boolean): EdgeVisual {
  if (!resolved) return 'unresolved'
  if (provenance === 'MIXED') return 'mixed'
  if (provenance === 'INFERRED') return 'inferred'
  return 'extracted'
}

interface Bundle {
  source: string
  target: string
  hierarchy: boolean
  extracted: number
  inferred: number
  unresolved: number
}

function addBundle(
  bundles: Map<string, Bundle>,
  source: string,
  target: string,
  edge: GraphEdge,
  hierarchy: boolean,
  index: GraphIndex
) {
  const key = `${source}\u0000${target}\u0000${hierarchy ? 'h' : 'b'}`
  const bundle = bundles.get(key) ?? { source, target, hierarchy, extracted: 0, inferred: 0, unresolved: 0 }
  const targetNode = index.nodesById.get(edge.target)
  if (targetNode?.kind === 'unresolved') bundle.unresolved += 1
  else if (edge.provenance === 'INFERRED') bundle.inferred += 1
  else bundle.extracted += 1
  bundles.set(key, bundle)
}

function toEdgeModel(bundle: Bundle): OverviewEdgeModel {
  const weight = bundle.extracted + bundle.inferred + bundle.unresolved
  const resolved = bundle.unresolved === 0
  let provenance: Provenance | 'MIXED'
  if (!bundle.hierarchy && bundle.extracted > 0 && bundle.inferred > 0) provenance = 'MIXED'
  else if (bundle.inferred > 0 && bundle.extracted === 0) provenance = 'INFERRED'
  else provenance = 'EXTRACTED'
  const visual = edgeVisual(provenance, resolved)
  return {
    id: `bundle:${bundle.source}>${bundle.target}:${visual}:${bundle.hierarchy ? 'h' : 'b'}`,
    source: bundle.source,
    target: bundle.target,
    provenance,
    resolved,
    weight,
    visual,
    hierarchy: bundle.hierarchy,
    extracted: bundle.extracted,
    inferred: bundle.inferred,
    unresolved: bundle.unresolved,
    label: edgeLabel(visual, weight)
  }
}

function edgeLabel(visual: EdgeVisual, weight: number): string {
  if (visual === 'unresolved') return weight > 1 ? `? ${weight}` : '?'
  if (visual === 'inferred') return weight > 1 ? `~ ${weight}` : '~'
  if (visual === 'mixed') return String(weight)
  return weight > 1 ? String(weight) : ''
}

function representative(index: GraphIndex, id: string, visible: Set<string>, state: ViewState): string | null {
  let current: string | undefined = id
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    if (visible.has(current)) return current
    const parent = index.parentOf.get(current)
    if (parent && parent !== 'dir:.') {
      if (visible.has(`more:${parent}`) && isPagedOut(index, state, parent, current)) return `more:${parent}`
      current = parent
      continue
    }
    if (visible.has('more:root') && isRootPagedOut(index, state, current)) return 'more:root'
    return null
  }
  return null
}

function isPagedOut(index: GraphIndex, state: ViewState, parent: string, id: string): boolean {
  const siblings = index.children.get(parent) ?? []
  const cap = state.revealed[parent] ?? EXPAND_NODE_CAP
  return siblings.indexOf(id) >= cap && !state.pinned.includes(id)
}

function isRootPagedOut(index: GraphIndex, state: ViewState, id: string): boolean {
  const cap = state.revealed.root ?? INITIAL_NODE_CAP
  const indexInList = index.topLevel.indexOf(id)
  return indexInList >= cap && !state.pinned.includes(id)
}

function nodeModel(
  index: GraphIndex,
  id: string,
  depth: number,
  expanded: boolean,
  focusIds: ReadonlySet<string> | null
): OverviewNodeModel {
  if (id.startsWith('cluster:')) {
    const kind = id.slice('cluster:'.length)
    const size = index.descendantCount.get(id) ?? index.clusterMembers.get(id)?.length ?? 0
    return {
      id,
      label: kind,
      kind,
      cluster: true,
      clusterSize: size,
      expanded,
      depth,
      path: '',
      more: false,
      remainder: 0,
      internalEdges: 0,
      dimmed: focusIds !== null && !focusIds.has(id)
    }
  }
  const node = index.nodesById.get(id)
  const kind = node?.kind ?? 'generic'
  const children = index.children.get(id) ?? []
  const cluster = children.length > 0
  return {
    id,
    label: node?.label ?? id,
    kind,
    cluster,
    clusterSize: index.descendantCount.get(id) ?? children.length,
    expanded: cluster ? expanded : false,
    depth,
    path: nodePath(node),
    more: false,
    remainder: 0,
    internalEdges: 0,
    dimmed: focusIds !== null && !focusIds.has(id)
  }
}

function nodePath(node: GraphNode | undefined): string {
  if (!node) return ''
  if ((node.kind === 'directory' || node.kind === 'file') && 'path' in node) return node.path
  if (node.kind === 'symbol' && 'file' in node) return node.file
  return ''
}

function languageOk(index: GraphIndex, filters: ViewFilters, id: string): boolean {
  const languages = filters.languages
  if (!languages) return true
  const node = index.nodesById.get(id)
  if (!node) return true
  if (node.kind === 'file' && 'language' in node) return languages.includes(node.language ?? '')
  const files = fileDescendants(index, id)
  if (files.length === 0) return true
  return files.some((file) => file.kind === 'file' && 'language' in file && languages.includes(file.language ?? ''))
}

function fileDescendants(index: GraphIndex, id: string): GraphNode[] {
  const files: GraphNode[] = []
  const stack = [...(index.children.get(id) ?? [])]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const current = stack.pop()!
    if (seen.has(current)) continue
    seen.add(current)
    const node = index.nodesById.get(current)
    if (node?.kind === 'file') files.push(node)
    for (const child of index.children.get(current) ?? []) stack.push(child)
  }
  return files
}

function descendantTouchesUnresolved(index: GraphIndex, id: string): boolean {
  const stack = [...(index.children.get(id) ?? [])]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const current = stack.pop()!
    if (seen.has(current)) continue
    seen.add(current)
    if (index.unresolvedTouch.has(current)) return true
    for (const child of index.children.get(current) ?? []) stack.push(child)
  }
  return false
}

function edgePasses(index: GraphIndex, filters: ViewFilters, edge: GraphEdge): boolean {
  const target = index.nodesById.get(edge.target)
  if (target?.kind === 'unresolved') return filters.provenance.unresolved
  if (edge.provenance === 'INFERRED') return filters.provenance.inferred
  return filters.provenance.extracted
}

function cloneState(state: ViewState): ViewState {
  return {
    expanded: [...state.expanded],
    revealed: { ...state.revealed },
    pinned: [...state.pinned]
  }
}

export function searchGraph(index: GraphIndex, query: string, limit = 50): { hits: SearchHit[]; total: number } {
  const needle = query.trim().toLowerCase()
  if (!needle) return { hits: [], total: 0 }
  const hits: SearchHit[] = []
  for (const node of index.document.nodes) {
    const path = nodePath(node)
    const label = node.label
    const haystack = `${label}\u0000${path}\u0000${node.id}`.toLowerCase()
    const at = haystack.indexOf(needle)
    if (at < 0) continue
    let score = 0
    if (label.toLowerCase().startsWith(needle)) score += 40
    if (path.toLowerCase().startsWith(needle)) score += 20
    if (at === 0) score += 10
    score -= haystack.length / 10_000
    hits.push({ id: node.id, label, path, kind: node.kind, score })
  }
  hits.sort((a, b) => b.score - a.score || compareUtf16(a.id, b.id))
  return { hits: hits.slice(0, limit), total: hits.length }
}

export interface SearchHit {
  id: string
  label: string
  path: string
  kind: string
  score: number
}
