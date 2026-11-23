import { describe, expect, it } from 'vitest'
import {
  HOTSPOT_HIGH_MIN,
  HOTSPOT_MEDIUM_MIN,
  graphHasHotspots,
  hotspotBand,
  hotspotFileName,
  hotspotScoreByNodeId,
  hotspotShortPath
} from '../../src/viewer/hotspot-band'

describe('hotspotBand', () => {
  it('uses 40 and 70 as the Medium and High thresholds', () => {
    expect(HOTSPOT_MEDIUM_MIN).toBe(40)
    expect(HOTSPOT_HIGH_MIN).toBe(70)
    expect(hotspotBand(0)).toBe('low')
    expect(hotspotBand(39)).toBe('low')
    expect(hotspotBand(40)).toBe('medium')
    expect(hotspotBand(69)).toBe('medium')
    expect(hotspotBand(70)).toBe('high')
    expect(hotspotBand(100)).toBe('high')
  })

  it('treats non-finite scores as Low', () => {
    expect(hotspotBand(Number.NaN)).toBe('low')
    expect(hotspotBand(Number.POSITIVE_INFINITY)).toBe('low')
  })
})

describe('hotspot path helpers', () => {
  it('returns the file name and a shortened parent path', () => {
    expect(hotspotFileName('apps/web/src/viewer/ViewerApp.vue')).toBe('ViewerApp.vue')
    expect(hotspotShortPath('apps/web/src/viewer/ViewerApp.vue')).toBe('apps/web/src/viewer')
    expect(hotspotShortPath('src/app.ts')).toBe('src')
    expect(hotspotShortPath('app.ts')).toBe('')
    expect(hotspotShortPath('apps/web/src/components/dashboard/report/ReportHotspots.vue')).toBe('apps/…/report')
  })
})

describe('graphHasHotspots', () => {
  it('is true when the top-N list or a file score is present, and false on 1.1-shaped graphs', () => {
    expect(graphHasHotspots({ nodes: [], hotspots: [] })).toBe(false)
    expect(graphHasHotspots({ nodes: [{ kind: 'file' }] })).toBe(false)
    expect(graphHasHotspots({ hotspots: [{ path: 'src/a.ts', score: 80, why: 'Used by 2 files' }] })).toBe(true)
    expect(graphHasHotspots({ nodes: [{ kind: 'file', hotspot: { score: 12 } }] })).toBe(true)
    expect(graphHasHotspots(null)).toBe(false)
  })

  it('indexes scores by file node id, skipping zeros', () => {
    const scores = hotspotScoreByNodeId([
      { id: 'file:a.ts', kind: 'file', hotspot: { score: 80 } },
      { id: 'file:b.ts', kind: 'file', hotspot: { score: 0 } },
      { id: 'dir:src', kind: 'directory' }
    ])
    expect([...scores.entries()]).toEqual([['file:a.ts', 80]])
  })
})
