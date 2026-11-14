/**
 * Mark / disc CSS scale vs Vue Flow zoom.
 * Desktop keeps the a3695cd cap (MAX 4). Phone raises the cap so on-screen
 * labels stay ≈11px and discs ≥20px even when fit zooms out.
 */

export const LABEL_PX = 11.5
export const BASE_LABEL_PX = 11
/** Desktop cap — must stay 4 so final8 desktop matches final7. */
export const DESKTOP_MAX_MARK_SCALE = 4
/** Phone: high enough that LABEL_PX is reachable down to zoom ≈ 0.065. */
export const PHONE_MAX_MARK_SCALE = 16
export const DESKTOP_DISC_PX = 30
/** Phone minimum on-screen disc target. */
export const PHONE_DISC_PX = 20
export const BASE_DISC_PX = 24
/** Phone breakpoint (CSS px canvas width). */
export const PHONE_CANVAS_MAX = 480

export function isPhoneCanvas(width: number): boolean {
  return width > 0 && width <= PHONE_CANVAS_MAX
}

export interface MarkScaleResult {
  mark: number
  disc: number
  /** Approximate on-screen label size (px) for the base mono size. */
  labelScreenPx: number
  /** Approximate on-screen disc size (px). */
  discScreenPx: number
}

/** Pure zoom → CSS scale mapping (unit-tested). */
export const EMBEDDED_MAX_MARK_SCALE = PHONE_MAX_MARK_SCALE

export function markScaleForZoom(zoom: number, phone: boolean, maxMarkOverride?: number): MarkScaleResult {
  const z = Math.max(zoom, 1e-6)
  const maxMark = maxMarkOverride ?? (phone ? PHONE_MAX_MARK_SCALE : DESKTOP_MAX_MARK_SCALE)
  const discTarget = phone ? PHONE_DISC_PX : DESKTOP_DISC_PX
  const mark = Math.min(maxMark, Math.max(1, LABEL_PX / (BASE_LABEL_PX * z)))
  const disc = Math.min(mark, Math.max(1, discTarget / (BASE_DISC_PX * z)))
  return {
    mark,
    disc,
    labelScreenPx: BASE_LABEL_PX * mark * z,
    discScreenPx: BASE_DISC_PX * disc * z
  }
}
