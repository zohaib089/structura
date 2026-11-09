import { describe, expect, it } from 'vitest'
import {
  BASE_LABEL_PX,
  DESKTOP_MAX_MARK_SCALE,
  isPhoneCanvas,
  markScaleForZoom,
  PHONE_DISC_PX,
  PHONE_MAX_MARK_SCALE
} from '../../src/viewer/graph-mark-scale'
import { labelsToHide, type DeclutterBox } from '../../src/viewer/label-declutter'

function box(id: string, x: number, opts: Partial<DeclutterBox> = {}): DeclutterBox {
  return {
    id,
    label: { left: x, right: x + 40, top: 0, bottom: 12 },
    disc: { left: x - 20, right: x - 8, top: 0, bottom: 12 },
    distance: Math.abs(x),
    ...opts
  }
}

describe('phone mark scale + priority visibility', () => {
  it('keeps phone on-screen labels ≥11px and discs ≥20px at deep zoom-out', () => {
    for (const zoom of [0.08, 0.1, 0.15, 0.2, 0.3]) {
      const phone = markScaleForZoom(zoom, true)
      expect(phone.labelScreenPx, `label @ zoom ${zoom}`).toBeGreaterThanOrEqual(11 - 1e-6)
      expect(phone.discScreenPx, `disc @ zoom ${zoom}`).toBeGreaterThanOrEqual(PHONE_DISC_PX - 1e-6)
      expect(phone.mark).toBeLessThanOrEqual(PHONE_MAX_MARK_SCALE)
    }
  })

  it('desktop mark-scale cap stays at 4 (a3695cd parity)', () => {
    const deep = markScaleForZoom(0.1, false)
    expect(deep.mark).toBe(DESKTOP_MAX_MARK_SCALE)
    // With the desktop cap, deep zoom cannot hold 11px — that is phone-only.
    expect(BASE_LABEL_PX * deep.mark * 0.1).toBeLessThan(11)
    expect(isPhoneCanvas(390)).toBe(true)
    expect(isPhoneCanvas(480)).toBe(true)
    expect(isPhoneCanvas(481)).toBe(false)
    expect(isPhoneCanvas(1440)).toBe(false)
  })

  it('phone declutter keeps nucleus, ring-1, and findings even when they clash', () => {
    const bounds = { left: 0, right: 200, top: 0, bottom: 100 }
    // Overlapping labels: nucleus, ring1, findings, and a low-priority outer leaf.
    const boxes: DeclutterBox[] = [
      box('nucleus', 10, { nucleus: true }),
      box('ring1', 12, { ring1: true }),
      box('finding', 14, { hasFindings: true }),
      box('outer', 16, { distance: 500 })
    ]
    const hidden = labelsToHide(boxes, bounds, { keepRing1: true, keepFindings: true })
    expect(hidden.has('nucleus')).toBe(false)
    expect(hidden.has('ring1')).toBe(false)
    expect(hidden.has('finding')).toBe(false)
    expect(hidden.has('outer')).toBe(true)
  })
})
