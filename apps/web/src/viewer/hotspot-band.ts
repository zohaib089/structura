/**
 * Bands for a 0–100 hotspot score, used by the scan report, graph toggle
 * and File insights "Risk to change" line. Keep the thresholds in this one place.
 *
 *   Low    — below 40
 *   Medium — 40 up to (but not including) 70
 *   High   — 70 and above
 */
export const HOTSPOT_MEDIUM_MIN = 40
export const HOTSPOT_HIGH_MIN = 70

export type HotspotBand = 'low' | 'medium' | 'high'

export interface GraphHotspotEntry {
  path: string
  score: number
  why: string
}

export function hotspotBand(score: number): HotspotBand {
  if (!Number.isFinite(score) || score < HOTSPOT_HIGH_MIN) {
    if (Number.isFinite(score) && score >= HOTSPOT_MEDIUM_MIN) return 'medium'
    return 'low'
  }
  return 'high'
}

export function graphHasHotspots(
  graph:
    | {
        hotspots?: readonly GraphHotspotEntry[] | null
        nodes?: ReadonlyArray<{ kind?: string; hotspot?: { score: number } }>
      }
    | null
    | undefined
): boolean {
  if (!graph) return false
  if ((graph.hotspots?.length ?? 0) > 0) return true
  return (graph.nodes ?? []).some(
    (node) => node.kind === 'file' && typeof node.hotspot?.score === 'number' && node.hotspot.score > 0
  )
}

export function hotspotScoreByNodeId(
  nodes: ReadonlyArray<{ id: string; kind?: string; hotspot?: { score: number } }>
): Map<string, number> {
  const scores = new Map<string, number>()
  for (const node of nodes) {
    if (node.kind === 'file' && typeof node.hotspot?.score === 'number' && node.hotspot.score > 0) {
      scores.set(node.id, node.hotspot.score)
    }
  }
  return scores
}

export function hotspotFileName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts.at(-1) ?? path
}

/** Parent folder. Shortened only when it would be long to read. */
export function hotspotShortPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return ''
  const dir = parts.slice(0, -1)
  const joined = dir.join('/')
  if (dir.length <= 3 || joined.length <= 32) return joined
  return `${dir[0]}/…/${dir[dir.length - 1]}`
}
