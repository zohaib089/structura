import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { graphOverlaps, radialFitViewport } from '../../src/viewer/radial-fit'

const read = (p: string) => readFileSync(resolve(p), 'utf8')
// Entry at the ring centre (0,0), labels extend to the right: the old bbox fit pushed the entry left.
const nodes = [
  { x: -14, y: -14, width: 120, height: 28 },
  { x: -14, y: -234, width: 110, height: 28 },
  { x: -14, y: 206, width: 110, height: 28 }
]

describe('radial fit (S3 mobile)', () => {
  it('centres the ring centre horizontally and inside the area left by the measured toolbar', () => {
    const vp = radialFitViewport({ width: 390, height: 700, reserve: { top: 60, bottom: 0 }, nodes, ringRadius: 110, padding: 0.12 })
    expect(vp.x).toBeCloseTo(195, 5)
    expect(vp.y).toBeCloseTo(60 + 640 / 2, 5)
    // Topmost node clears the toolbar.
    expect(vp.y + -234 * vp.zoom).toBeGreaterThan(60)
  })

  it('keeps the bottom node above a reserved guide card and caps the zoom', () => {
    const vp = radialFitViewport({ width: 390, height: 700, reserve: { top: 60, bottom: 120 }, nodes, ringRadius: 110, padding: 0.12 })
    expect(vp.y + (206 + 28) * vp.zoom).toBeLessThan(700 - 120)
    expect(radialFitViewport({ width: 3000, height: 3000, reserve: { top: 0, bottom: 0 }, nodes, ringRadius: 110, padding: 0 }).zoom).toBe(1.15)
  })

  it('detects when fitted nodes would sit under the guide card', () => {
    const vp = { x: 195, y: 350, zoom: 1 }
    expect(graphOverlaps(vp, nodes, { left: 12, right: 330, top: 560 })).toBe(true)
    expect(graphOverlaps(vp, nodes, { left: 12, right: 150, top: 560 })).toBe(false)
  })

  it('wires measured overlays, compact phone toolbar, guide clear of zoom, and measured report height', () => {
    const frame = read('src/viewer/components/FitFrame.vue')
    expect(frame).toContain(".floating-bar")
    expect(frame).toContain('[data-testid="coach-mark"]')
    expect(frame).toContain('--graph-mark-scale')
    expect(read('src/viewer/components/GraphFloatingBar.vue')).toMatch(/@media \(max-width: 640px\)[\s\S]*flex-wrap: nowrap/)
    expect(read('src/viewer/components/CoachMark.vue')).toMatch(/max-inline-size: min\(22rem, calc\(100% - var\(--viewer-control-size/)
    const report = read('src/components/dashboard/report/ReportGraph.vue')
    expect(report).toContain('scroller.clientHeight')
    expect(report).not.toMatch(/translateY\(-|margin-top: -/)
    expect(read('src/components/ui/AppShell.vue')).toMatch(/@media \(max-width: 640px\)\s*\{\s*\.shell-content--fill\s*\{\s*overflow-y: auto/)
  })
})
