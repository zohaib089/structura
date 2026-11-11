/**
 * Linear layout: two-sided columns around the current file.
 * "Used by" columns sit to the left (−1 … −depth), "Uses" columns to the right (+1 … +depth),
 * matching the radial split. Crowded columns group by folder ("N files", expandable) and cap at
 * LINEAR_COLUMN_CAP visible pills with a "+N more" pill that reveals the rest.
 */
import type { GraphEdge } from './graph-types'
import {
  addBundle,
  compareUtf16,
  edgePasses,
  nodeModel,
  radialLinkPasses,
  radialNodePasses,
  resolveNucleusId,
  toEdgeModel,
  type Bundle,
  type GraphIndex,
  type OverviewModel,
  type OverviewNodeModel,
  type ViewFilters,
  type ViewState
} from './overview'

export const LINEAR_DEPTH = 3
export const LINEAR_COLUMN_CAP = 14
export const LINEAR_PILL_WIDTH = 184
export const LINEAR_PILL_HEIGHT = 32
export const LINEAR_COLUMN_GAP = 264
export const LINEAR_ROW = 44
const GROUP_PREFIX = 'lgroup:'
const MORE_PREFIX = 'lmore:'

export function isLinearControlId(id: string): boolean {
  return id.startsWith(GROUP_PREFIX) || id.startsWith(MORE_PREFIX)
}

/** Expand / collapse a folder group, or reveal the next page behind "+N more". */
export function toggleLinear(state: ViewState, id: string): ViewState {
  const next: ViewState = { ...state, expanded: [...state.expanded], revealed: { ...state.revealed }, pinned: [...state.pinned] }
  if (id.startsWith(MORE_PREFIX)) {
    next.revealed[id] = (next.revealed[id] ?? 0) + LINEAR_COLUMN_CAP
    return next
  }
  next.expanded = next.expanded.includes(id) ? next.expanded.filter((item) => item !== id) : [...next.expanded, id]
  return next
}

/** BFS columns: uses (outgoing) win over used by (incoming) when a file is on both sides. */
export function linearColumns(
  index: GraphIndex,
  nucleusId: string,
  filters: ViewFilters,
  depth = LINEAR_DEPTH
): Map<string, number> {
  const column = new Map<string, number>([[nucleusId, 0]])
  const walk = (links: Map<string, { other: string; provenance: GraphEdge['provenance']; unresolved: boolean }[]>, sign: 1 | -1) => {
    let frontier = [nucleusId]
    for (let d = 1; d <= depth && frontier.length > 0; d += 1) {
      const next: string[] = []
      for (const id of frontier) {
        for (const link of links.get(id) ?? []) {
          if (!radialLinkPasses(filters, link.unresolved, link.provenance)) continue
          if (!radialNodePasses(index, filters, link.other)) continue
          if (column.has(link.other)) continue
          column.set(link.other, sign * d)
          next.push(link.other)
        }
      }
      frontier = next.sort(compareUtf16)
    }
  }
  walk(index.outgoing, 1)
  walk(index.incoming, -1)
  return column
}

function folderOf(index: GraphIndex, id: string): string {
  const node = index.nodesById.get(id)
  if (node && 'path' in node && typeof node.path === 'string') {
    const cut = node.path.lastIndexOf('/')
    return cut > 0 ? node.path.slice(0, cut) : '.'
  }
  if (id.startsWith('ext:')) return `ext:${id.split(':')[1] ?? ''}`
  return '.'
}

function folderLabel(folder: string): string {
  if (folder.startsWith('ext:')) return folder.slice(4) || 'packages'
  const parts = folder.split('/')
  return parts.slice(-3).join('/')
}

interface Row { id: string; members?: string[]; folder?: string }

export interface LinearModel extends OverviewModel {
  columns: Map<string, number>
  /** Linear control pill (group / more) for every hidden member, so edges stay real. */
  memberOf: Map<string, string>
}

export function buildLinearOverview(
  index: GraphIndex,
  state: ViewState,
  filters: ViewFilters,
  focusIds: ReadonlySet<string> | null = null
): LinearModel {
  const nucleusId = resolveNucleusId(index, state.nucleusId)
  const columns = linearColumns(index, nucleusId, filters)
  const expanded = new Set(state.expanded)
  const byColumn = new Map<number, string[]>()
  for (const [id, col] of columns) byColumn.set(col, [...(byColumn.get(col) ?? []), id])

  const nodes: OverviewNodeModel[] = []
  const positions = new Map<string, { x: number; y: number }>()
  const memberOf = new Map<string, string>()
  let top = 0
  let bottom = LINEAR_PILL_HEIGHT

  for (const col of [...byColumn.keys()].sort((a, b) => a - b)) {
    const ids = byColumn.get(col)!.sort((a, b) => compareUtf16(folderOf(index, a), folderOf(index, b)) || compareUtf16(a, b))
    let rows: Row[] = ids.map((id) => ({ id }))
    if (ids.length > LINEAR_COLUMN_CAP) {
      const folders = new Map<string, string[]>()
      for (const id of ids) folders.set(folderOf(index, id), [...(folders.get(folderOf(index, id)) ?? []), id])
      rows = []
      for (const [folder, members] of folders) {
        if (members.length < 2) { rows.push({ id: members[0]! }); continue }
        const groupId = `${GROUP_PREFIX}${col}:${folder}`
        rows.push({ id: groupId, members, folder })
        if (expanded.has(groupId)) rows.push(...members.map((id) => ({ id })))
      }
    }
    const moreId = `${MORE_PREFIX}${col}`
    const cap = LINEAR_COLUMN_CAP + (state.revealed[moreId] ?? 0)
    const shown = rows.length > cap ? rows.slice(0, cap - 1) : rows
    const hidden = rows.length > cap ? rows.slice(cap - 1) : []
    const depth = Math.abs(col)
    const placed: OverviewNodeModel[] = []
    for (const row of shown) {
      if (row.members) {
        const open = expanded.has(row.id)
        placed.push({
          id: row.id, label: folderLabel(row.folder!), kind: 'directory', cluster: true, clusterSize: row.members.length,
          expanded: open, depth, path: row.folder!.startsWith('ext:') ? '' : row.folder!, more: false, remainder: 0,
          internalEdges: 0, dimmed: focusIds !== null && !row.members.some((m) => focusIds.has(m)), column: col
        })
        if (!open) for (const member of row.members) memberOf.set(member, row.id)
      } else {
        placed.push({ ...nodeModel(index, row.id, depth, false, focusIds), cluster: false, expanded: false, column: col })
      }
    }
    if (hidden.length > 0) {
      const hiddenIds = hidden.flatMap((row) => row.members ?? [row.id])
      placed.push({
        id: moreId, label: '', kind: 'more', cluster: false, clusterSize: 0, expanded: false, depth, path: '',
        more: true, remainder: hiddenIds.length, internalEdges: 0, dimmed: false, column: col
      })
      for (const id of hiddenIds) if (!memberOf.has(id) || hidden.some((row) => row.id === memberOf.get(id))) memberOf.set(id, moreId)
    }
    const height = placed.length * LINEAR_ROW - (LINEAR_ROW - LINEAR_PILL_HEIGHT)
    const y0 = -height / 2 + LINEAR_PILL_HEIGHT / 2 - LINEAR_PILL_HEIGHT / 2
    placed.forEach((node, i) => {
      const y = Math.round(y0 + i * LINEAR_ROW)
      positions.set(node.id, { x: col * LINEAR_COLUMN_GAP - LINEAR_PILL_WIDTH / 2, y })
      top = Math.min(top, y)
      bottom = Math.max(bottom, y + LINEAR_PILL_HEIGHT)
    })
    nodes.push(...placed)
  }

  // Same file name twice on screen (types.ts, index.ts …): show the parent folder too.
  const seen = new Map<string, number>()
  for (const node of nodes) if (!node.cluster && !node.more) seen.set(node.label, (seen.get(node.label) ?? 0) + 1)
  for (const node of nodes) {
    if (node.cluster || node.more || (seen.get(node.label) ?? 0) < 2 || !node.path) continue
    node.label = node.path.split('/').slice(-2).join('/')
  }

  // Real edges between what is on screen: hidden files stand in as their group or "+N more" pill.
  const visible = new Set(nodes.map((node) => node.id))
  const columnOf = new Map(nodes.map((node) => [node.id, node.column ?? 0]))
  const rep = (id: string): string | null => (visible.has(id) ? id : memberOf.get(id) ?? null)
  const bundles = new Map<string, Bundle>()
  let hiddenEdges = 0
  for (const edge of index.document.edges) {
    if (edge.type === 'contains') continue
    if (!columns.has(edge.source) || !columns.has(edge.target)) continue
    if (!edgePasses(index, filters, edge)) { hiddenEdges += 1; continue }
    const source = rep(edge.source)
    const target = rep(edge.target)
    if (!source || !target || source === target) continue
    addBundle(bundles, source, target, edge, false, index)
  }
  const gutter = LINEAR_COLUMN_GAP - LINEAR_PILL_WIDTH
  let lane = 0
  const edges = [...bundles.values()].map((bundle) => {
    const model = toEdgeModel(bundle, new Map(), new Map())
    const adjacent = (columnOf.get(bundle.target) ?? 0) === (columnOf.get(bundle.source) ?? 0) + 1
    return {
      ...model,
      role: 'spoke' as const,
      // Counts sit on the edge only where it is a short adjacent hop; around routes stay unlabelled and quiet.
      label: adjacent ? model.label : '',
      linear: { route: adjacent ? ('adjacent' as const) : ('around' as const), top, bottom, gutter, lane: adjacent ? 0 : lane++ % 6 }
    }
  })
  edges.sort((a, b) => b.weight - a.weight || compareUtf16(a.id, b.id))

  return {
    nodes,
    edges,
    hiddenNodes: 0,
    hiddenEdges,
    edgesOmittedByCap: 0,
    positions,
    ringRadii: [],
    labelPlacements: new Map(),
    columns,
    memberOf
  }
}

/** Path for a linear edge: bezier into the next column, otherwise a quiet route above / below the pills. */
export function linearEdgePath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  linear: NonNullable<import('./overview').OverviewEdgeModel['linear']>
): { path: string; labelX: number; labelY: number } {
  if (linear.route === 'adjacent') {
    const mx = (sx + tx) / 2
    return { path: `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`, labelX: mx, labelY: (sy + ty) / 2 }
  }
  const half = linear.gutter / 2
  const below = sy + ty > linear.top + linear.bottom
  const band = below ? linear.bottom + 16 + linear.lane * 6 : linear.top - 16 - linear.lane * 6
  const x1 = sx + half - 8 + linear.lane * 3
  const x2 = tx - half + 8 - linear.lane * 3
  const r = 16
  const v1 = band > sy ? 1 : -1
  const v2 = ty > band ? 1 : -1
  const h = x2 >= x1 ? 1 : -1
  const path = [
    `M${sx},${sy}`,
    `L${x1 - r},${sy}`,
    `Q${x1},${sy} ${x1},${sy + v1 * r}`,
    `L${x1},${band - v1 * r}`,
    `Q${x1},${band} ${x1 + h * r},${band}`,
    `L${x2 - h * r},${band}`,
    `Q${x2},${band} ${x2},${band + v2 * r}`,
    `L${x2},${ty - v2 * r}`,
    `Q${x2},${ty} ${x2 + r},${ty}`,
    `L${tx},${ty}`
  ].join(' ')
  return { path, labelX: (x1 + x2) / 2, labelY: band }
}
