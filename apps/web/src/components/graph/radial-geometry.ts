/**
 * Geometry shared by the landing hero and the dashboard radial graph.
 * Ring radii for the first three rings are the hero's; deeper rings continue
 * that same decreasing gap so real scans do not switch to a second layout.
 */
export const HERO_RING_RADII = [0, 140, 262, 372] as const

const HERO_RING_LABEL_DEGREES: Record<number, number> = { 1: 112, 2: 120, 3: 90 }

export function ringRadius(ring: number): number {
  if (ring <= 0) return 0
  if (ring < HERO_RING_RADII.length) return HERO_RING_RADII[ring] ?? 0
  let radius = HERO_RING_RADII[HERO_RING_RADII.length - 1] ?? 0
  let gap = (HERO_RING_RADII[3] ?? 0) - (HERO_RING_RADII[2] ?? 0)
  for (let step = HERO_RING_RADII.length - 1; step < ring; step += 1) {
    gap = Math.max(72, gap - 12)
    radius += gap
  }
  return radius
}

/** Circle radius inside a ring. Matches the hero: 15, 12.5, then 11. */
export function nodeRadius(ring: number): number {
  if (ring <= 1) return 15
  if (ring === 2) return 12.5
  return 11
}

export const NUCLEUS_HALO_RADIUS = 56

/** Square frame centered on a node, large enough for the hero halo. */
export function nodeFrameSize(ring: number, entry: boolean): number {
  if (entry) return NUCLEUS_HALO_RADIUS * 2
  return (nodeRadius(Math.max(ring, 1)) + 7) * 2
}

export function ringLabelDegrees(ring: number): number {
  return HERO_RING_LABEL_DEGREES[ring] ?? 90 + (ring - 3) * 14
}

export function quadraticEdgePath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  centerX: number,
  centerY: number
): string {
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  const cx = mx + (centerX - mx) * 0.12
  const cy = my + (centerY - my) * 0.12
  return `M${ax.toFixed(1)} ${ay.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`
}

export interface RadialLabelPlacement {
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
}

/** Label outside the circle, same rule as the hero. */
export function labelPlacement(deg: number, radius: number): RadialLabelPlacement {
  const radians = (deg * Math.PI) / 180
  const out = Math.cos(radians)
  if (Math.abs(out) < 0.25) {
    return { x: 0, y: Math.sin(radians) > 0 ? radius + 18 : -radius - 8, anchor: 'middle' }
  }
  return { x: out > 0 ? radius + 9 : -radius - 9, y: 4, anchor: out > 0 ? 'start' : 'end' }
}

export interface RadialHotPath {
  nodeIds: Set<string>
  edgeIds: Set<string>
}

/** Walk toward the nucleus the way the hero highlights the path back to the entry file. */
export function pathToNucleus(
  activeId: string | null,
  nodes: { id: string; depth: number }[],
  edges: { id: string; source: string; target: string }[]
): RadialHotPath {
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()
  if (!activeId) return { nodeIds, edgeIds }
  const byId = new Map(nodes.map(node => [node.id, node]))
  if (!byId.has(activeId)) return { nodeIds, edgeIds }
  for (const node of nodes) {
    if (node.depth === 0) nodeIds.add(node.id)
  }
  let current = activeId
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    nodeIds.add(current)
    const node = byId.get(current)
    if (!node || node.depth <= 0) break
    let step: { id: string; source: string; target: string } | undefined
    let next: string | undefined
    for (const edge of edges) {
      const other = edge.source === current ? edge.target : edge.target === current ? edge.source : ''
      if (!other) continue
      const otherNode = byId.get(other)
      if (!otherNode || otherNode.depth !== node.depth - 1) continue
      if (!step || other < (next ?? '')) {
        step = edge
        next = other
      }
    }
    if (!step || !next) break
    edgeIds.add(step.id)
    current = next
  }
  return { nodeIds, edgeIds }
}
