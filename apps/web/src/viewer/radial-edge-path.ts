/**
 * Radial edge geometry for the overview graph.
 * Tree/spoke edges bow gently toward the ring centre (landing-style); cross-links stay flatter.
 */

export type RadialEdgeRole = 'spoke' | 'cross'

/** Quadratic path bowed toward `centre` (flow units). Landing uses ~12% pull. */
export function radialEdgePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  centre: { x: number; y: number },
  role: RadialEdgeRole = 'spoke'
): { path: string; labelX: number; labelY: number } {
  const mx = (sourceX + targetX) / 2
  const my = (sourceY + targetY) / 2
  const pull = role === 'spoke' ? 0.18 : 0.08
  const cx = mx + (centre.x - mx) * pull
  const cy = my + (centre.y - my) * pull
  return {
    path: `M${sourceX},${sourceY} Q${cx},${cy} ${targetX},${targetY}`,
    labelX: mx + (centre.x - mx) * (pull * 0.5),
    labelY: my + (centre.y - my) * (pull * 0.5)
  }
}

/**
 * Spoke = dependency between neighbouring rings (depth differs by 1), matching landing's
 * parent→child tree edges. Same-ring / skip-ring / hierarchy-only extras are cross-links.
 */
export function edgeRadialRole(
  sourceDepth: number | undefined,
  targetDepth: number | undefined,
  hierarchy: boolean
): RadialEdgeRole {
  if (hierarchy) return 'cross'
  if (sourceDepth === undefined || targetDepth === undefined) return 'cross'
  return Math.abs(sourceDepth - targetDepth) === 1 ? 'spoke' : 'cross'
}
