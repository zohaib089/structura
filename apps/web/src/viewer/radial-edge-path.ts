/**
 * Radial edge geometry for the overview graph.
 * Tree/spoke edges follow a radial-then-arc route that never cuts across the nucleus.
 * Cross-links are classified separately and hidden until revealed.
 */

export type RadialEdgeRole = 'spoke' | 'cross'

/** True when a↔b is a BFS tree edge (one is the discovered parent of the other). */
export function isTreeEdge(
  sourceId: string,
  targetId: string,
  treeParent: Map<string, string>
): boolean {
  return treeParent.get(sourceId) === targetId || treeParent.get(targetId) === sourceId
}

/**
 * Spoke = exact BFS parent↔child. Hierarchy/contains and non-tree deps are cross-links.
 * Prefer the tree map when present; fall back to neighbouring-ring heuristic only if absent.
 */
export function edgeRadialRole(
  sourceId: string,
  targetId: string,
  hierarchy: boolean,
  treeParent?: Map<string, string>,
  sourceDepth?: number,
  targetDepth?: number
): RadialEdgeRole {
  if (hierarchy) return 'cross'
  if (treeParent && treeParent.size > 0) {
    return isTreeEdge(sourceId, targetId, treeParent) ? 'spoke' : 'cross'
  }
  if (sourceDepth === undefined || targetDepth === undefined) return 'cross'
  return Math.abs(sourceDepth - targetDepth) === 1 ? 'spoke' : 'cross'
}

function polar(x: number, y: number, cx: number, cy: number) {
  const dx = x - cx
  const dy = y - cy
  return { r: Math.hypot(dx, dy), a: Math.atan2(dy, dx) }
}

function fromPolar(r: number, a: number, cx: number, cy: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function normDelta(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

/**
 * Tree spoke: go radially out along the inner angle to the outer radius, then arc along the ring.
 * Never passes through the nucleus (paths stay at r ≥ min(inner, outer)).
 * Cross-links: shallow bow that still stays outside the nucleus disc.
 */
export function radialEdgePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  centre: { x: number; y: number },
  role: RadialEdgeRole = 'spoke'
): { path: string; labelX: number; labelY: number } {
  const { x: cx, y: cy } = centre
  const s = polar(sourceX, sourceY, cx, cy)
  const t = polar(targetX, targetY, cx, cy)

  if (role === 'cross') {
    // Keep outside the nucleus: control point at mid-radius, not pulled inward.
    const midR = Math.max(Math.min(s.r, t.r) * 0.85, Math.min(s.r, t.r) - 8, 24)
    const midA = s.a + normDelta(s.a, t.a) / 2
    const c = fromPolar(midR, midA, cx, cy)
    return {
      path: `M${sourceX},${sourceY} Q${c.x.toFixed(2)},${c.y.toFixed(2)} ${targetX},${targetY}`,
      labelX: c.x,
      labelY: c.y
    }
  }

  // Nucleus → outer: pure radial spoke.
  if (s.r < 8 || t.r < 8) {
    return {
      path: `M${sourceX},${sourceY} L${targetX},${targetY}`,
      labelX: (sourceX + targetX) / 2,
      labelY: (sourceY + targetY) / 2
    }
  }

  const inner = s.r <= t.r ? s : t
  const outer = s.r <= t.r ? t : s
  const sourceIsInner = s.r <= t.r
  const dA = normDelta(inner.a, outer.a)
  const elbow = fromPolar(outer.r, inner.a, cx, cy)
  const large = Math.abs(dA) > Math.PI ? 1 : 0
  const sweep = dA >= 0 ? 1 : 0

  let path: string
  if (Math.abs(dA) < 0.02) {
    path = `M${sourceX},${sourceY} L${targetX},${targetY}`
  } else if (sourceIsInner) {
    path = `M${sourceX},${sourceY} L${elbow.x.toFixed(2)},${elbow.y.toFixed(2)} A${outer.r.toFixed(2)},${outer.r.toFixed(2)} 0 ${large} ${sweep} ${targetX},${targetY}`
  } else {
    path = `M${sourceX},${sourceY} A${outer.r.toFixed(2)},${outer.r.toFixed(2)} 0 ${large} ${sweep ^ 1} ${elbow.x.toFixed(2)},${elbow.y.toFixed(2)} L${targetX},${targetY}`
  }

  const label = fromPolar(outer.r, inner.a + dA / 2, cx, cy)
  return { path, labelX: label.x, labelY: label.y }
}
