import { describe, expect, it } from 'vitest'
import { labelsToHide, type DeclutterBox } from '../../src/viewer/label-declutter'

const bounds = { left: 0, right: 400, top: 0, bottom: 400 }

function box(partial: Partial<DeclutterBox> & { id: string; label: DeclutterBox['label']; disc: DeclutterBox['disc'] }): DeclutterBox {
  return { distance: 0, ...partial }
}

describe('labelsToHide', () => {
  it('keeps non-overlapping labels', () => {
    const boxes = [
      box({ id: 'a', label: { left: 10, right: 40, top: 10, bottom: 20 }, disc: { left: 0, right: 8, top: 8, bottom: 22 }, distance: 10 }),
      box({ id: 'b', label: { left: 100, right: 140, top: 100, bottom: 110 }, disc: { left: 90, right: 98, top: 98, bottom: 112 }, distance: 20 })
    ]
    expect([...labelsToHide(boxes, bounds)]).toEqual([])
  })

  it('hides the lower-priority label when two labels overlap', () => {
    const boxes = [
      box({ id: 'inner', label: { left: 50, right: 90, top: 50, bottom: 60 }, disc: { left: 40, right: 48, top: 48, bottom: 62 }, distance: 5, hasFindings: true }),
      box({ id: 'outer', label: { left: 55, right: 95, top: 52, bottom: 62 }, disc: { left: 100, right: 108, top: 100, bottom: 114 }, distance: 80 })
    ]
    expect(labelsToHide(boxes, bounds).has('outer')).toBe(true)
    expect(labelsToHide(boxes, bounds).has('inner')).toBe(false)
  })

  it('never hides the nucleus or the selected node', () => {
    const boxes = [
      box({ id: 'entry', nucleus: true, label: { left: 50, right: 90, top: 50, bottom: 60 }, disc: { left: 40, right: 48, top: 48, bottom: 62 }, distance: 0 }),
      box({ id: 'picked', selected: true, label: { left: 52, right: 92, top: 52, bottom: 62 }, disc: { left: 100, right: 108, top: 50, bottom: 64 }, distance: 10 })
    ]
    expect(labelsToHide(boxes, bounds).size).toBe(0)
  })

  it('hides a label that overlaps another disc', () => {
    const boxes = [
      box({ id: 'a', label: { left: 20, right: 60, top: 10, bottom: 20 }, disc: { left: 0, right: 8, top: 8, bottom: 22 }, distance: 10 }),
      box({ id: 'b', label: { left: 200, right: 240, top: 200, bottom: 210 }, disc: { left: 25, right: 40, top: 8, bottom: 22 }, distance: 5 })
    ]
    // a's label overlaps b's disc
    expect(labelsToHide(boxes, bounds).has('a')).toBe(true)
  })

  it('hides labels that sit outside the canvas', () => {
    const boxes = [
      box({ id: 'off', label: { left: -40, right: -5, top: 10, bottom: 20 }, disc: { left: 0, right: 8, top: 8, bottom: 22 }, distance: 10 })
    ]
    expect(labelsToHide(boxes, bounds).has('off')).toBe(true)
  })
})
