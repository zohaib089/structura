import type { FocusQuery, ViewState } from './overview'

/** Vue Flow viewport: screen = flow * zoom + (x, y). */
export interface Viewport { x: number; y: number; zoom: number }

/**
 * Zoom by `factor` while the canvas point `anchor` (px, relative to the canvas) stays put, so what
 * the person is looking at (the cursor, or the selected node) does not slide away.
 */
export function zoomAroundPoint(
  viewport: Viewport,
  anchor: { x: number; y: number },
  factor: number,
  minZoom = 0.1,
  maxZoom = 2.5
): Viewport {
  const zoom = Math.min(maxZoom, Math.max(minZoom, viewport.zoom * factor))
  const flowX = (anchor.x - viewport.x) / viewport.zoom
  const flowY = (anchor.y - viewport.y) / viewport.zoom
  return { zoom, x: anchor.x - flowX * zoom, y: anchor.y - flowY * zoom }
}

/** Where to zoom: the selected node when it is on screen, else the canvas centre. */
export function zoomAnchor(
  canvas: { width: number; height: number },
  selected: { x: number; y: number } | null
): { x: number; y: number } {
  if (selected && selected.x >= 0 && selected.y >= 0 && selected.x <= canvas.width && selected.y <= canvas.height) {
    return selected
  }
  return { x: canvas.width / 2, y: canvas.height / 2 }
}

/** One step of graph navigation the Back button can return to. */
export interface GraphSnapshot {
  viewState: ViewState
  selection: { kind: 'node' | 'edge'; id: string } | null
  focus: FocusQuery | null
  viewport: Viewport | null
  inspectorOpen: boolean
}

function clone<T>(value: T): T {
  return value === null || value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)
}

/** Bounded back stack of graph views (nucleus / selection, expanded nodes, viewport). */
export class GraphHistory {
  private stack: GraphSnapshot[] = []
  private readonly limit: number

  constructor(limit = 50) {
    this.limit = limit
  }

  get size(): number {
    return this.stack.length
  }

  get canGoBack(): boolean {
    return this.stack.length > 0
  }

  /** Record the view the person is leaving. Consecutive identical views are stored once. */
  push(snapshot: GraphSnapshot): void {
    const copy = clone(snapshot)
    const last = this.stack[this.stack.length - 1]
    if (last && JSON.stringify(last) === JSON.stringify(copy)) return
    this.stack.push(copy)
    if (this.stack.length > this.limit) this.stack.splice(0, this.stack.length - this.limit)
  }

  /** The previous view, or null when there is nothing to go back to. */
  back(): GraphSnapshot | null {
    return this.stack.pop() ?? null
  }

  clear(): void {
    this.stack = []
  }
}
