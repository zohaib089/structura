/** Read a duration token. Reduced motion collapses it to zero. */
export function motionMs(token: string, fallbackMs: number, reduced = prefersReducedMotion()): number {
  if (reduced) return 0
  if (typeof document === 'undefined') return fallbackMs
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  if (raw.endsWith('ms')) return Number.parseFloat(raw)
  if (raw.endsWith('s')) return Number.parseFloat(raw) * 1000
  return fallbackMs
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function prefersReducedTransparency(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-transparency: reduce)').matches
}

export function fitDurationMs(): number {
  return motionMs('--duration-slow', 400)
}
