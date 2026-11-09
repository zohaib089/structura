import {
  EXPAND_NODE_CAP,
  HARD_EDGE_CAP,
  HARD_NODE_CAP,
  INITIAL_NODE_CAP
} from './caps'
import type { GraphDocument, GraphEdge, GraphNode, Provenance } from './graph-types'

export const RADIAL_RING_GAP = 220
/** Minimum arc (flow px) between neighbours on one ring, so compact marks + labels do not collide. */
export const RADIAL_MIN_ARC = 180
export const RADIAL_DEFAULT_MAX_RING = 6

export interface EntryPointOption {
  id: string
  label: string
  path: string
}

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
  /** Radial layout: graph nucleus (entry file). */
  nucleusId?: string
  /** Radial layout: max outbound dependency ring depth from nucleus. */
  maxRadialRing?: number
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
  language?: string | null
}

export type EdgeVisual = 'extracted' | 'inferred' | 'unresolved' | 'mixed'

export type RadialEdgeRole = 'spoke' | 'cross'

export interface OverviewEdgeModel {
  id: string
  source: string
  target: string
  provenance: Provenance | 'MIXED'
  resolved: boolean
  weight: number
  visual: EdgeVisual
  hierarchy: boolean
  /** Spoke = neighbouring rings (landing tree); cross = same/skip ring (de-emphasised). */
  role: RadialEdgeRole
  extracted: number
  inferred: number
  unresolved: number
  /** Empty when the bundle is not made of import or reexport edges. */
  importKind: '' | 'static' | 'dynamic' | 'require' | 'mixed'
  /** Empty, true, false, or mixed across the bundled import edges. */
  typeOnly: '' | 'true' | 'false' | 'mixed'
  label: string
  flowing?: boolean
  /** Ring centre in flow units (disc centre of the nucleus), used to bow edge paths. */
  radialCentre?: { x: number; y: number }
  /** True when the edge touches the selected node — cross-links paint at full opacity. */
  emphasized?: boolean
  /** When true, paint every cross-link (toolbar toggle). */
  showAllCross?: boolean
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
  return { expanded: [], revealed: {}, pinned: [], maxRadialRing: RADIAL_DEFAULT_MAX_RING }
}

export function setNucleus(state: ViewState, nucleusId: string): ViewState {
  const next = cloneState(state)
  next.nucleusId = nucleusId
  next.maxRadialRing = next.maxRadialRing ?? RADIAL_DEFAULT_MAX_RING
  return next
}

export function expandRadialRing(state: ViewState): ViewState {
  const next = cloneState(state)
  const current = next.maxRadialRing ?? RADIAL_DEFAULT_MAX_RING
  next.maxRadialRing = current + 1
  return next
}

export function collapseRadialRing(state: ViewState): ViewState {
  const next = cloneState(state)
  const current = next.maxRadialRing ?? RADIAL_DEFAULT_MAX_RING
  next.maxRadialRing = Math.max(0, current - 1)
  return next
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
  const nucleusId = resolveNucleusId(index, state.nucleusId)
  const maxRing = state.maxRadialRing ?? RADIAL_DEFAULT_MAX_RING
  const { depths: ringDepths, parentOf: treeParent } = dependencyRingTree(index, nucleusId, filters, maxRing)
  const expanded = new Set(state.expanded)
  const pinned = new Set(state.pinned)
  const nodes: OverviewNodeModel[] = []
  const visible = new Set<string>()
  const hiddenNodeIds = new Set<string>()
  const provenanceOpen = filters.provenance.extracted || filters.provenance.inferred || filters.provenance.unresolved

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

  const sortedRing = [...ringDepths.entries()].sort(
    (a, b) => a[1] - b[1] || compareUtf16(a[0], b[0])
  )
  for (const [id, depth] of sortedRing) {
    if (nodes.length >= HARD_NODE_CAP) break
    if (!passes(id) && id !== nucleusId) continue
    if (visible.has(id)) continue
    nodes.push(nodeModel(index, id, depth, expanded.has(id), focusIds))
    visible.add(id)
  }
  for (const pinnedId of pinned) {
    if (visible.has(pinnedId) || nodes.length >= HARD_NODE_CAP) continue
    if (!passes(pinnedId)) continue
    const pinnedDepth = ringDepths.get(pinnedId) ?? 1
    nodes.push(nodeModel(index, pinnedId, pinnedDepth, expanded.has(pinnedId), focusIds))
    visible.add(pinnedId)
  }

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

  let edgeModels = [...bundles.values()].map((b) => toEdgeModel(b, ringDepths, treeParent))
  edgeModels.sort((a, b) => b.weight - a.weight || compareUtf16(a.id, b.id))
  const edgesOmittedByCap = Math.max(0, edgeModels.length - HARD_EDGE_CAP)
  edgeModels = edgeModels.slice(0, HARD_EDGE_CAP)

  return {
    nodes,
    edges: edgeModels,
    hiddenNodes: hiddenNodeIds.size,
    hiddenEdges,
    edgesOmittedByCap,
    positions: layoutRadialNodes(nodes, nucleusId, treeParent)
  }
}

/** @deprecated Column layout kept for tests that assert deterministic spacing. */
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

function edgeRadialRoleFromTree(
  source: string,
  target: string,
  hierarchy: boolean,
  treeParent: Map<string, string>
): RadialEdgeRole {
  if (hierarchy) return 'cross'
  if (treeParent.get(source) === target || treeParent.get(target) === source) return 'spoke'
  return 'cross'
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
  staticCount: number
  dynamicCount: number
  requireCount: number
  typeOnlyCount: number
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
  const bundle = bundles.get(key) ?? {
    source,
    target,
    hierarchy,
    extracted: 0,
    inferred: 0,
    unresolved: 0,
    staticCount: 0,
    dynamicCount: 0,
    requireCount: 0,
    typeOnlyCount: 0
  }
  const targetNode = index.nodesById.get(edge.target)
  if (targetNode?.kind === 'unresolved') bundle.unresolved += 1
  else if (edge.provenance === 'INFERRED') bundle.inferred += 1
  else bundle.extracted += 1
  if ((edge.type === 'imports' || edge.type === 'reexports') && 'importKind' in edge) {
    if (edge.importKind === 'dynamic') bundle.dynamicCount += 1
    else if (edge.importKind === 'require') bundle.requireCount += 1
    else bundle.staticCount += 1
    if (edge.typeOnly) bundle.typeOnlyCount += 1
  }
  bundles.set(key, bundle)
}

function toEdgeModel(bundle: Bundle, _ringDepths: Map<string, number>, treeParent: Map<string, string>): OverviewEdgeModel {
  const weight = bundle.extracted + bundle.inferred + bundle.unresolved
  const resolved = bundle.unresolved === 0
  let provenance: Provenance | 'MIXED'
  if (!bundle.hierarchy && bundle.extracted > 0 && bundle.inferred > 0) provenance = 'MIXED'
  else if (bundle.inferred > 0 && bundle.extracted === 0) provenance = 'INFERRED'
  else provenance = 'EXTRACTED'
  const visual = edgeVisual(provenance, resolved)
  const imported = importSummary(bundle)
  const role: RadialEdgeRole = edgeRadialRoleFromTree(bundle.source, bundle.target, bundle.hierarchy, treeParent)
  return {
    id: `bundle:${bundle.source}>${bundle.target}:${visual}:${bundle.hierarchy ? 'h' : 'b'}`,
    source: bundle.source,
    target: bundle.target,
    provenance,
    resolved,
    weight,
    visual,
    hierarchy: bundle.hierarchy,
    role,
    extracted: bundle.extracted,
    inferred: bundle.inferred,
    unresolved: bundle.unresolved,
    importKind: imported.importKind,
    typeOnly: imported.typeOnly,
    label: edgeLabel(visual, weight)
  }
}

function importSummary(bundle: Bundle): Pick<OverviewEdgeModel, 'importKind' | 'typeOnly'> {
  const total = bundle.staticCount + bundle.dynamicCount + bundle.requireCount
  if (total === 0) return { importKind: '', typeOnly: '' }
  const present = Number(bundle.staticCount > 0) + Number(bundle.dynamicCount > 0) + Number(bundle.requireCount > 0)
  const importKind = present > 1
    ? 'mixed'
    : bundle.dynamicCount > 0
      ? 'dynamic'
      : bundle.requireCount > 0
        ? 'require'
        : 'static'
  const typeOnly = bundle.typeOnlyCount === 0 ? 'false' : bundle.typeOnlyCount === total ? 'true' : 'mixed'
  return { importKind, typeOnly }
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
      dimmed: focusIds !== null && !focusIds.has(id),
      language: null
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
    dimmed: focusIds !== null && !focusIds.has(id),
    language: node?.kind === 'file' && 'language' in node ? node.language : null
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
    pinned: [...state.pinned],
    nucleusId: state.nucleusId,
    maxRadialRing: state.maxRadialRing
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

export function collectEntryPoints(index: GraphIndex): EntryPointOption[] {
  const fromEngine: EntryPointOption[] = []
  for (const node of index.document.nodes) {
    if (node.kind !== 'file' || !('path' in node) || !node.entryCandidate) continue
    fromEngine.push({ id: node.id, label: node.label, path: node.path })
  }
  if (fromEngine.length > 0) {
    fromEngine.sort((a, b) => compareUtf16(a.path, b.path))
    return fromEngine
  }

  const conventional: EntryPointOption[] = []
  const conventionalName = /^(main|index)\.(tsx?|jsx?|vue|mts|cts)$/i
  for (const node of index.document.nodes) {
    if (node.kind !== 'file' || !('path' in node)) continue
    const base = node.path.split('/').pop() ?? node.label
    if (conventionalName.test(base)) {
      conventional.push({ id: node.id, label: node.label, path: node.path })
    }
  }
  if (conventional.length > 0) {
    conventional.sort((a, b) => {
      const rank = (path: string) => {
        const base = path.split('/').pop() ?? ''
        if (/^main\./i.test(base)) return 0
        if (/^index\./i.test(base)) return 1
        return 2
      }
      const byRank = rank(a.path) - rank(b.path)
      return byRank !== 0 ? byRank : compareUtf16(a.path, b.path)
    })
    return conventional
  }

  const files: EntryPointOption[] = []
  for (const node of index.document.nodes) {
    if (node.kind !== 'file' || !('path' in node)) continue
    files.push({ id: node.id, label: node.label, path: node.path })
  }
  files.sort((a, b) => compareUtf16(a.path, b.path))
  return files.slice(0, 1)
}

export function resolveNucleusId(index: GraphIndex, preferredId: string | null | undefined): string {
  if (preferredId && index.nodesById.has(preferredId)) return preferredId
  const entries = collectEntryPoints(index)
  if (entries[0]) return entries[0].id
  return index.document.nodes[0]?.id ?? 'dir:.'
}

export type RadialSector = { start: number; end: number }

/**
 * Classic radial-tree / sunburst placement: each node sits on its BFS ring, angled inside its
 * parent's sector. Sectors are proportional to subtree leaf weight so siblings stay contiguous
 * and tree spokes fan outward without crossing.
 */
export function layoutRadialNodes(
  nodes: { id: string; depth: number }[],
  nucleusId: string,
  treeParent: Map<string, string> = new Map()
): Map<string, { x: number; y: number }> {
  const { positions } = layoutRadialTree(nodes, nucleusId, treeParent)
  return positions
}

/** Full radial-tree layout result (positions + angles/sectors for tests). */
export function layoutRadialTree(
  nodes: { id: string; depth: number }[],
  nucleusId: string,
  treeParent: Map<string, string> = new Map()
): {
  positions: Map<string, { x: number; y: number }>
  angles: Map<string, number>
  sectors: Map<string, RadialSector>
} {
  const visible = new Set(nodes.map((n) => n.id))
  const children = new Map<string, string[]>()

  for (const [child, parent] of treeParent) {
    if (!visible.has(child) || !visible.has(parent)) continue
    const list = children.get(parent) ?? []
    list.push(child)
    children.set(parent, list)
  }
  // Orphans (e.g. pinned) without a visible tree parent hang under the nucleus so they still get a sector.
  for (const node of nodes) {
    if (node.id === nucleusId || node.depth === 0) continue
    const parent = treeParent.get(node.id)
    if (parent && visible.has(parent)) continue
    const list = children.get(nucleusId) ?? []
    if (!list.includes(node.id)) list.push(node.id)
    children.set(nucleusId, list)
  }
  for (const [, list] of children) list.sort(compareUtf16)

  /** Leaf counts (unweighted) then sector share = max(floor, sqrt(leaves)) so large subtrees
   * do not swallow the circle and tiny ones still get a readable wedge. */
  const leaves = new Map<string, number>()
  const leafCount = (id: string): number => {
    const cached = leaves.get(id)
    if (cached !== undefined) return cached
    const kids = children.get(id) ?? []
    if (kids.length === 0) {
      leaves.set(id, 1)
      return 1
    }
    let sum = 0
    for (const kid of kids) sum += leafCount(kid)
    leaves.set(id, Math.max(1, sum))
    return leaves.get(id)!
  }
  if (visible.has(nucleusId)) leafCount(nucleusId)

  const sectorShare = (id: string): number => Math.max(1, Math.sqrt(leafCount(id)))

  /** Sibling shares with a minimum floor so ring-1 children stay spread around the nucleus. */
  const siblingShares = (kids: string[]): number[] => {
    const raw = kids.map((kid) => sectorShare(kid))
    const sum = raw.reduce((a, b) => a + b, 0) || 1
    const floor = sum / (kids.length * 1.35)
    const bumped = raw.map((w) => Math.max(w, floor))
    const bumpedSum = bumped.reduce((a, b) => a + b, 0) || 1
    return bumped.map((w) => w / bumpedSum)
  }

  const angles = new Map<string, number>()
  const sectors = new Map<string, RadialSector>()
  const assign = (id: string, start: number, end: number) => {
    sectors.set(id, { start, end })
    angles.set(id, (start + end) / 2)
    const kids = children.get(id) ?? []
    if (kids.length === 0) return
    const shares = siblingShares(kids)
    const spanTotal = end - start
    let cursor = start
    kids.forEach((kid, i) => {
      const span = spanTotal * shares[i]!
      assign(kid, cursor, cursor + span)
      cursor += span
    })
  }

  const TAU = Math.PI * 2
  // Place the first ring-1 child's midpoint at 12 o'clock so 2-child samples sit top/bottom
  // and denser trees still start from the top rather than clustering on one side.
  if (visible.has(nucleusId)) {
    const ring1 = children.get(nucleusId) ?? []
    if (ring1.length === 0) {
      assign(nucleusId, -Math.PI / 2, -Math.PI / 2 + TAU)
    } else {
      const shares = siblingShares(ring1)
      const firstSpan = TAU * shares[0]!
      const start = -Math.PI / 2 - firstSpan / 2
      assign(nucleusId, start, start + TAU)
    }
  }
  // Any visible node still missing an angle (should be rare) gets a deterministic leftover slot.
  for (const node of nodes) {
    if (angles.has(node.id)) continue
    const fallback = -Math.PI / 2 + (angles.size * 0.37) % TAU
    angles.set(node.id, fallback)
    sectors.set(node.id, { start: fallback - 0.01, end: fallback + 0.01 })
  }

  const rings = new Map<number, string[]>()
  for (const node of nodes) {
    const list = rings.get(node.depth) ?? []
    list.push(node.id)
    rings.set(node.depth, list)
  }

  const positions = new Map<string, { x: number; y: number }>()
  let previousRadius = 0
  for (const ring of [...rings.keys()].sort((a, b) => a - b)) {
    const ids = rings.get(ring) ?? []
    if (ids.length === 0) continue
    if (ring === 0) {
      for (const id of ids) positions.set(id, { x: 0, y: 0 })
      continue
    }
    const ordered = [...ids].sort((a, b) => (angles.get(a) ?? 0) - (angles.get(b) ?? 0) || compareUtf16(a, b))
    let minGap = TAU
    if (ordered.length >= 2) {
      for (let i = 0; i < ordered.length; i += 1) {
        const a1 = angles.get(ordered[i]!)!
        const a2 = angles.get(ordered[(i + 1) % ordered.length]!)!
        let gap = a2 - a1
        if (gap <= 0) gap += TAU
        if (gap < minGap) minGap = gap
      }
    }
    // Widen the ring when a sector packs neighbours tighter than RADIAL_MIN_ARC.
    const radius = Math.max(
      previousRadius === 0 ? RADIAL_RING_GAP : previousRadius + RADIAL_RING_GAP * 0.55,
      ordered.length >= 2 ? RADIAL_MIN_ARC / Math.max(minGap, 1e-6) : RADIAL_RING_GAP
    )
    previousRadius = radius
    for (const id of ids) {
      const a = angles.get(id) ?? -Math.PI / 2
      positions.set(id, { x: radius * Math.cos(a), y: radius * Math.sin(a) })
    }
  }

  return { positions, angles, sectors }
}

/** True when every tree child's angle sits inside its parent's sector (within a tiny epsilon). */
export function childrenLieInParentSectors(
  angles: Map<string, number>,
  sectors: Map<string, RadialSector>,
  treeParent: Map<string, string>
): boolean {
  for (const [child, parent] of treeParent) {
    const a = angles.get(child)
    const childSector = sectors.get(child)
    const parentSector = sectors.get(parent)
    if (a === undefined || !childSector || !parentSector) continue
    // Layout assigns nested sectors in the same unwrapped space: child ⊂ parent.
    if (childSector.start + 1e-9 < parentSector.start || childSector.end - 1e-9 > parentSector.end) return false
    if (a + 1e-9 < childSector.start || a - 1e-9 > childSector.end) return false
  }
  return true
}


/** Largest empty angular gap among a set of angles on the circle (radians). */
export function maxAngularGap(angles: number[]): number {
  if (angles.length === 0) return Math.PI * 2
  if (angles.length === 1) return Math.PI * 2
  const TAU = Math.PI * 2
  const sorted = [...angles].sort((a, b) => a - b)
  let max = 0
  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i]!
    const b = sorted[(i + 1) % sorted.length]!
    let gap = b - a
    if (gap <= 0) gap += TAU
    if (gap > max) max = gap
  }
  return max
}

/** True when two open tree-spoke segments improperly intersect (shared nucleus endpoint is OK). */
export function treeSpokesCross(
  positions: Map<string, { x: number; y: number }>,
  treeParent: Map<string, string>
): boolean {
  const spokes: Array<{ a: string; b: string; x1: number; y1: number; x2: number; y2: number }> = []
  for (const [child, parent] of treeParent) {
    const p = positions.get(parent)
    const c = positions.get(child)
    if (!p || !c) continue
    spokes.push({ a: parent, b: child, x1: p.x, y1: p.y, x2: c.x, y2: c.y })
  }
  const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    Math.sign((by - ay) * (cx - bx) - (bx - ax) * (cy - by))
  const onSeg = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    Math.min(ax, bx) - 1e-9 <= cx &&
    cx <= Math.max(ax, bx) + 1e-9 &&
    Math.min(ay, by) - 1e-9 <= cy &&
    cy <= Math.max(ay, by) + 1e-9
  const crosses = (
    a: (typeof spokes)[number],
    b: (typeof spokes)[number]
  ) => {
    // Shared vertex (usual at nucleus or along a chain) is not a crossing.
    if (a.a === b.a || a.a === b.b || a.b === b.a || a.b === b.b) return false
    const o1 = orient(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1)
    const o2 = orient(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2)
    const o3 = orient(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1)
    const o4 = orient(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2)
    if (o1 !== o2 && o3 !== o4) return true
    if (o1 === 0 && onSeg(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1)) return true
    if (o2 === 0 && onSeg(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2)) return true
    if (o3 === 0 && onSeg(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1)) return true
    if (o4 === 0 && onSeg(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2)) return true
    return false
  }
  for (let i = 0; i < spokes.length; i += 1) {
    for (let j = i + 1; j < spokes.length; j += 1) {
      if (crosses(spokes[i]!, spokes[j]!)) return true
    }
  }
  return false
}

function radialNodePasses(index: GraphIndex, filters: ViewFilters, id: string): boolean {
  const provenanceOpen = filters.provenance.extracted || filters.provenance.inferred || filters.provenance.unresolved
  if (!provenanceOpen) return false
  if (id.startsWith('cluster:')) {
    const kind = id.slice('cluster:'.length)
    if (filters.kinds && !filters.kinds.includes(kind)) return false
    const members = index.clusterMembers.get(id) ?? []
    return members.some((member) => radialNodePasses(index, filters, member))
  }
  const node = index.nodesById.get(id)
  if (!node) return false
  if (filters.kinds && !filters.kinds.includes(node.kind)) return false
  if (filters.languages && node.kind === 'file' && 'language' in node) {
    if (!filters.languages.includes(node.language ?? '')) return false
  }
  if (filters.driftOnly && !index.unresolvedTouch.has(id)) return false
  return true
}

function radialLinkPasses(filters: ViewFilters, unresolved: boolean, provenance: Provenance): boolean {
  if (unresolved) return filters.provenance.unresolved
  if (provenance === 'INFERRED') return filters.provenance.inferred
  return filters.provenance.extracted
}

/** BFS depths from the nucleus plus the tree parent used for spoke edges. */
export function dependencyRingTree(
  index: GraphIndex,
  nucleusId: string,
  filters: ViewFilters,
  maxRing: number
): { depths: Map<string, number>; parentOf: Map<string, string> } {
  const depths = new Map<string, number>()
  const parentOf = new Map<string, string>()
  if (!index.nodesById.has(nucleusId)) return { depths, parentOf }
  depths.set(nucleusId, 0)
  const queue: string[] = [nucleusId]
  let head = 0
  while (head < queue.length) {
    const current = queue[head]!
    head += 1
    const depth = depths.get(current)!
    if (depth >= maxRing) continue
    for (const link of index.outgoing.get(current) ?? []) {
      if (!radialLinkPasses(filters, link.unresolved, link.provenance)) continue
      const target = link.other
      if (!radialNodePasses(index, filters, target)) continue
      if (depths.has(target)) continue
      depths.set(target, depth + 1)
      parentOf.set(target, current)
      queue.push(target)
    }
  }
  return { depths, parentOf }
}

export function dependencyRingDepths(
  index: GraphIndex,
  nucleusId: string,
  filters: ViewFilters,
  maxRing: number
): Map<string, number> {
  return dependencyRingTree(index, nucleusId, filters, maxRing).depths
}

export function countDependencyEdges(index: GraphIndex, nodeId: string): { out: number; in: number } {
  let out = 0
  let inn = 0
  for (const edge of index.document.edges) {
    if (edge.type === 'contains') continue
    if (edge.source === nodeId) out += 1
    if (edge.target === nodeId) inn += 1
  }
  return { out, in: inn }
}

export function entryLabelForNode(node: GraphNode | undefined, fallbackId: string): string {
  if (!node) return fallbackId
  if (node.label) return node.label
  if ((node.kind === 'directory' || node.kind === 'file') && 'path' in node) {
    const parts = node.path.split('/')
    return parts[parts.length - 1] || node.path
  }
  return fallbackId
}




