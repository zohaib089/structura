/**
 * Shortens a file / folder name to `max` characters with a middle ellipsis, keeping the start of
 * the name and its distinguishing tail (last stem characters + extension), e.g.
 * `file-neighborhood.ts` → `file-ne…hood.ts`. Names that fit are returned unchanged.
 */
export function middleEllipsis(name: string, max: number): string {
  const chars = Array.from(name)
  if (max < 4 || chars.length <= max) return name
  const dot = name.lastIndexOf('.')
  // Keep a short extension whole (".ts", ".vue", ".test.ts" keeps ".ts"); dotfiles have no extension.
  const ext = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : ''
  const stem = Array.from(ext ? name.slice(0, dot) : name)
  const room = max - 1 - Array.from(ext).length
  if (room < 2) return chars.slice(0, max - 1).join('') + '…'
  const head = Math.ceil(room * 0.55)
  const tail = room - head
  return stem.slice(0, head).join('') + '…' + (tail > 0 ? stem.slice(-tail).join('') : '') + ext
}

/** Character budgets for the 12.5px monospace pill text (≈7.6px per glyph, ≈8.2px bold, after padding / marks). */
export function pillCharBudget(pillWidth: number, opts: { mark?: boolean; count?: boolean; bold?: boolean } = {}): number {
  const text = pillWidth - 24 - (opts.mark ? 24 : 0) - (opts.count ? 24 : 0)
  return Math.max(4, Math.floor(text / (opts.bold ? 8.2 : 7.6)))
}
