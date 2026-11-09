/**
 * Radial edge geometry for the overview graph.
 * Tree/spoke edges are smooth Beziers that fan out from the nucleus like landing spokes.
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
 * Tree spoke: cubic Bezier that fans out from the nucleus.
 * c1 = parent pushed outward along parent angle; c2 = child pulled inward along child angle.
 * Never follows the ring for long, never crosses the nucleus.
 * Nucleus→ring1: straight radial.
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
    const midR = Math.max(Math.min(s.r, t.r) * 0.85, Math.min(s.r, t.r) - 8, 24)
    const midA = s.a + normDelta(s.a, t.a) / 2
    const c = fromPolar(midR, midA, cx, cy)
    return {
      path: `M${sourceX},${sourceY} Q${c.x.toFixed(2)},${c.y.toFixed(2)} ${targetX},${targetY}`,
      labelX: c.x,
      labelY: c.y
    }
  }

  // Nucleus → outer (or nearly centred): pure radial spoke.
  if (s.r < 8 || t.r < 8) {
    return {
      path: `M${sourceX},${sourceY} L${targetX},${targetY}`,
      labelX: (sourceX + targetX) / 2,
      labelY: (sourceY + targetY) / 2
    }
  }

  // Nearly aligned angles: straight segment.
  if (Math.abs(normDelta(s.a, t.a)) < 0.04) {
    return {
      path: `M${sourceX},${sourceY} L${targetX},${targetY}`,
      labelX: (sourceX + targetX) / 2,
      labelY: (sourceY + targetY) / 2
    }
  }

  // Cubic: push the inner endpoint outward along its ray, pull the outer inward along its ray.
  // Control radii stay between the endpoints so the curve never dips through the nucleus.
  const rLo = Math.min(s.r, t.r)
  const rHi = Math.max(s.r, t.r)
  const innerIsSource = s.r <= t.r
  const outR = rLo + (rHi - rLo) * 0.55
  const inR = rLo + (rHi - rLo) * 0.45
  const c1 = fromPolar(innerIsSource ? outR : inR, s.a, cx, cy)
  const c2 = fromPolar(innerIsSource ? inR : outR, t.a, cx, cy)

  const label = {
    x: sourceX * 0.125 + c1.x * 0.375 + c2.x * 0.375 + targetX * 0.125,
    y: sourceY * 0.125 + c1.y * 0.375 + c2.y * 0.375 + targetY * 0.125
  }

  return {
    path: `M${sourceX},${sourceY} C${c1.x.toFixed(2)},${c1.y.toFixed(2)} ${c2.x.toFixed(2)},${c2.y.toFixed(2)} ${targetX},${targetY}`,
    labelX: label.x,
    labelY: label.y
  }
}
