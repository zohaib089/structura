import type { EdgeVisual } from './overview'

/** Dash patterns match the design tokens. Mixed is viewer-computed and has its own pattern. */
export const EDGE_DASH: Record<EdgeVisual, string> = {
  extracted: 'none',
  inferred: '7 5',
  unresolved: '1.5 5',
  mixed: '3 2'
}

export function edgeClass(visual: EdgeVisual): string {
  if (visual === 'inferred') return 'edge-inferred'
  if (visual === 'unresolved') return 'edge-unresolved'
  if (visual === 'mixed') return 'edge-mixed'
  return 'edge-extracted'
}

/** Same ink as the landing hero edges. */
const HERO_EDGE = '#5a6270'

export function edgeStroke(visual: EdgeVisual): string {
  if (visual === 'unresolved') return 'var(--gray-7)'
  return HERO_EDGE
}

export function edgeWidth(visual: EdgeVisual): string {
  return visual === 'unresolved' ? '1.3' : '1.3'
}
