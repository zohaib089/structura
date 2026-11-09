/**
 * Radial fit: centre the camera on the ring centre (the entry file sits at 0,0 in radial layout),
 * symmetric about it, inside the canvas area left free by measured overlays (toolbar, guide card).
 * Without rings (focus mode / no radial), centre on the nodes' own bounding box.
 */
export interface FitBox { x: number; y: number; width: number; height: number }
export interface RadialFitInput {
  width: number
  height: number
  reserve: { top: number; bottom: number }
  nodes: FitBox[]
  ringRadius: number | null
  /** Measured ring centre in flow units (defaults to 0,0). */
  center?: { x: number; y: number }
  padding: number
  maxZoom?: number
  minZoom?: number
}

export function radialFitViewport(input: RadialFitInput): { x: number; y: number; zoom: number } {
  const { nodes } = input
  const minX = Math.min(...nodes.map((n) => n.x))
  const maxX = Math.max(...nodes.map((n) => n.x + n.width))
  const minY = Math.min(...nodes.map((n) => n.y))
  const maxY = Math.max(...nodes.map((n) => n.y + n.height))
  const radial = input.ringRadius !== null
  const cx = radial ? (input.center?.x ?? 0) : (minX + maxX) / 2
  const cy = radial ? (input.center?.y ?? 0) : (minY + maxY) / 2
  const ring = radial ? (input.ringRadius as number) : 0
  const halfW = Math.max(ring, Math.abs(minX - cx), Math.abs(maxX - cx), 1)
  const halfH = Math.max(ring, Math.abs(minY - cy), Math.abs(maxY - cy), 1)
  const top = Math.min(input.reserve.top, input.height * 0.45)
  const bottom = Math.min(input.reserve.bottom, input.height * 0.35)
  const availH = Math.max(input.height - top - bottom, input.height * 0.3)
  const scale = 1 + input.padding
  const zoom = Math.min(
    input.maxZoom ?? 1.15,
    Math.max(input.minZoom ?? 0.1, Math.min(input.width / (2 * halfW * scale), availH / (2 * halfH * scale)))
  )
  return { x: input.width / 2 - cx * zoom, y: top + availH / 2 - cy * zoom, zoom }
}

/** True when any fitted node box lands under the overlay rect (canvas px). */
export function graphOverlaps(
  viewport: { x: number; y: number; zoom: number },
  nodes: FitBox[],
  rect: { left: number; right: number; top: number }
): boolean {
  return nodes.some((n) => {
    const left = viewport.x + n.x * viewport.zoom
    const right = left + n.width * viewport.zoom
    const bottom = viewport.y + (n.y + n.height) * viewport.zoom
    return right > rect.left && left < rect.right && bottom > rect.top
  })
}
