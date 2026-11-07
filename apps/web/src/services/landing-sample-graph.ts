/**
 * Sample data for the landing hero graph (design: landing-advanced.md §2, mockups/landing-advanced.html).
 * Everything here is made up. Positions use the shared radial geometry so the dashboard
 * graph draws rings, edges, and nodes with the same measurements.
 */
import { quadraticEdgePath, ringLabelDegrees, ringRadius, HERO_RING_RADII } from '../components/graph/radial-geometry'

export type SampleSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type SampleLinkKind = 'extracted' | 'inferred' | 'unresolved' | 'start'

export interface SampleNode {
  id: number
  label: string
  ring: 0 | 1 | 2 | 3
  severity: SampleSeverity
  x: number
  y: number
  /** Angle in degrees, used to place the label outside the node. */
  deg: number
  parent?: number
  link: SampleLinkKind
  entry?: boolean
  unresolved?: boolean
}

export interface SampleEdge {
  from: number
  to: number
  kind: SampleLinkKind
  /** SVG path data (quadratic curve bowed a little towards the centre). */
  d: string
}

export const GRAPH_VIEWBOX = 1000
export const GRAPH_CENTER = 500
export const RING_RADII = HERO_RING_RADII

type Ring1 = [label: string, severity: SampleSeverity, deg: number]
type Ring2 = [label: string, severity: SampleSeverity, deg: number, parentIndex: number]
type Ring3 = [label: string, severity: SampleSeverity | 'unres', deg: number, parentIndex: number]

const RING_1: Ring1[] = [
  ['router.ts', 'high', -90], ['App.vue', 'medium', -45], ['stores', 'critical', 0], ['api', 'low', 45],
  ['auth', 'medium', 90], ['config', 'info', 135], ['i18n', 'info', 180], ['theme', 'low', 225]
]
const RING_2: Ring2[] = [
  ['DashboardView', 'critical', -100, 0], ['GraphCanvas', 'high', -70, 0], ['route-guards', 'high', -48, 1], ['ScanReport', 'high', -20, 2],
  ['OpenProject', 'medium', 8, 2], ['workspaces', 'low', 34, 3], ['scan-poll', 'medium', 62, 3], ['session', 'medium', 98, 4],
  ['severity', 'info', 146, 5], ['messages', 'info', 178, 6], ['BrandMark', 'info', 208, 7], ['variables', 'low', 238, 7]
]
const RING_3: Ring3[] = [
  ['useScanRun', 'medium', -85, 0], ['viewer-link', 'info', -58, 1], ['handoff', 'info', -12, 3], ['ErrorBanner', 'low', 22, 4],
  ['Toast', 'info', 52, 5], ['plugin-loader', 'unres', 118, 7], ['Skeleton', 'info', 150, 8], ['worker', 'low', 190, 9],
  ['parse', 'high', 226, 10], ['dynamic page', 'unres', 248, 11]
]

const INFERRED_RING_2 = new Set([2, 6, 9])
const INFERRED_RING_3 = new Set([3, 6])

function polar(ring: 1 | 2 | 3, deg: number) {
  const radians = (deg * Math.PI) / 180
  const radius = ringRadius(ring)
  return {
    x: GRAPH_CENTER + Math.cos(radians) * radius,
    y: GRAPH_CENTER + Math.sin(radians) * radius
  }
}

export const ENTRY_LABEL = 'main.ts'

function buildNodes(): SampleNode[] {
  const nodes: SampleNode[] = [
    { id: 0, label: ENTRY_LABEL, ring: 0, severity: 'info', x: GRAPH_CENTER, y: GRAPH_CENTER, deg: 0, link: 'start', entry: true }
  ]
  for (const [label, severity, deg] of RING_1) {
    nodes.push({ id: nodes.length, label, ring: 1, severity, deg, parent: 0, link: 'extracted', ...polar(1, deg) })
  }
  const ring2Base = nodes.length
  RING_2.forEach(([label, severity, deg, parentIndex], i) => {
    nodes.push({
      id: nodes.length,
      label,
      ring: 2,
      severity,
      deg,
      parent: 1 + parentIndex,
      link: INFERRED_RING_2.has(i) ? 'inferred' : 'extracted',
      ...polar(2, deg)
    })
  })
  RING_3.forEach(([label, severity, deg, parentIndex], i) => {
    const unresolved = severity === 'unres'
    nodes.push({
      id: nodes.length,
      label,
      ring: 3,
      severity: unresolved ? 'info' : severity,
      deg,
      parent: ring2Base + parentIndex,
      link: unresolved ? 'unresolved' : INFERRED_RING_3.has(i) ? 'inferred' : 'extracted',
      unresolved,
      ...polar(3, deg)
    })
  })
  return nodes
}

export const SAMPLE_NODES: readonly SampleNode[] = buildNodes()

function edgePath(a: SampleNode, b: SampleNode): string {
  return quadraticEdgePath(a.x, a.y, b.x, b.y, GRAPH_CENTER, GRAPH_CENTER)
}

function buildEdges(): SampleEdge[] {
  const edges: SampleEdge[] = []
  for (const node of SAMPLE_NODES) {
    if (node.parent === undefined) continue
    edges.push({ from: node.parent, to: node.id, kind: node.link, d: edgePath(SAMPLE_NODES[node.parent]!, node) })
  }
  const ring2Base = 1 + RING_1.length
  const crossLinks: Array<[number, number, SampleLinkKind]> = [
    [2, ring2Base + 3, 'inferred'],
    [4, ring2Base + 4, 'extracted'],
    [6, ring2Base + 9, 'extracted']
  ]
  for (const [from, to, kind] of crossLinks) {
    edges.push({ from, to, kind, d: edgePath(SAMPLE_NODES[from]!, SAMPLE_NODES[to]!) })
  }
  return edges
}

export const SAMPLE_EDGES: readonly SampleEdge[] = buildEdges()

export const SAMPLE_RING_LABELS = ([1, 2, 3] as const).map(ring => ({
  ring,
  deg: ringLabelDegrees(ring)
}))

/** Edges from a node back to the entry file, as `from-to` keys. */
export function pathToEntry(id: number): Array<[number, number]> {
  const path: Array<[number, number]> = []
  let node = SAMPLE_NODES[id]
  while (node && node.parent !== undefined) {
    path.push([node.parent, node.id])
    node = SAMPLE_NODES[node.parent]
  }
  return path
}

export function edgeKey(from: number, to: number): string {
  return `${from}-${to}`
}

export function ringCounts(): Record<1 | 2 | 3, number> {
  const counts = { 1: 0, 2: 0, 3: 0 }
  for (const node of SAMPLE_NODES) if (node.ring > 0) counts[node.ring as 1 | 2 | 3] += 1
  return counts
}
