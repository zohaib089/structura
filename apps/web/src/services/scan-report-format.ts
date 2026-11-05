/** Small display helpers for the report header. No HTTP codes, IDs or raw timestamps in plain-language copy. */

export function shortScanId(scanId: string): string {
  return scanId.length > 8 ? scanId.slice(0, 8) : scanId
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60]
]

/** "2 hours ago" style label; falls back to an empty string when the date is unusable. */
export function formatRelativeTime(iso: string | null | undefined, locale: string, now = Date.now()): string {
  if (!iso) return ''
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ''
  const seconds = Math.round((then - now) / 1000)
  const absolute = Math.abs(seconds)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (absolute >= size) return formatter.format(Math.round(seconds / size), unit)
  }
  return formatter.format(0, 'second')
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(1)} s`
}
