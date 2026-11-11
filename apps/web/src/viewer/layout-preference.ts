import type { GraphLayout } from './overview'

/**
 * Last Linear / Radial choice for this session (kept in memory: the viewer never touches
 * browser storage). New scans and reloads of the same page open in the last-used layout.
 */
let preferred: GraphLayout = 'radial'

export function readLayoutPreference(): GraphLayout {
  return preferred
}

export function writeLayoutPreference(layout: GraphLayout): void {
  preferred = layout
}
