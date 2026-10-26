import type { EdgeVisual } from './overview'

/** Dash patterns match the design tokens. Mixed is viewer-computed and has its own pattern. */
export const EDGE_DASH: Record<EdgeVisual, string> = {
  extracted: 'none',
  inferred: '7 5',
  unresolved: '0.1 6',
  mixed: '3 2'
}

export function edgeClass(visual: EdgeVisual): string {
  if (visual === 'inferred') return 'edge-inferred'
  if (visual === 'unresolved') return 'edge-unresolved'
  if (visual === 'mixed') return 'edge-mixed'
  return 'edge-extracted'
}

export function edgeStroke(visual: EdgeVisual): string {
  if (visual === 'inferred' || visual === 'mixed') return 'var(--graph-edge-inferred)'
  if (visual === 'unresolved') return 'var(--graph-edge-unresolved)'
  return 'var(--graph-edge-extracted)'
}

export function edgeWidth(visual: EdgeVisual): string {
  if (visual === 'unresolved') return 'var(--graph-edge-width-unresolved)'
  if (visual === 'mixed') return 'var(--graph-edge-width-inferred)'
  return 'var(--graph-edge-width-extracted)'
}
