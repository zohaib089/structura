import { describe, expect, it } from 'vitest'
import { RADIAL_DISC_MIN_ARC, RADIAL_DISC_SPACING_OF_OUTER, spreadRingDiscs } from '../../src/viewer/overview'

describe('spreadRingDiscs (G6 disc spacing)', () => {
  it('pushes stacked discs on a ring apart and keeps the cluster centred', () => {
    const rings = new Map([[1, ['a', 'b', 'c']]])
    const radii = new Map([[0, 0], [1, 2000]])
    const angles = new Map([['a', 0.5], ['b', 0.501], ['c', 0.502]])
    const positions = new Map<string, { x: number; y: number }>()
    spreadRingDiscs(rings, radii, angles, positions)
    const min = Math.max(RADIAL_DISC_MIN_ARC, 2000 * RADIAL_DISC_SPACING_OF_OUTER) / 2000
    const a = angles.get('a')!, b = angles.get('b')!, c = angles.get('c')!
    expect(b - a).toBeGreaterThanOrEqual(min - 1e-4)
    expect(c - b).toBeGreaterThanOrEqual(min - 1e-4)
    expect((a + b + c) / 3).toBeCloseTo(0.501, 6)
    expect(positions.get('b')!.x).toBeCloseTo(2000 * Math.cos(b), 6)
  })

  it('keeps neighbouring rings at least one disc spacing apart', () => {
    const rings = new Map([[1, ['a']], [2, ['b']]])
    const radii = new Map([[0, 0], [1, 1000], [2, 1010]])
    const angles = new Map([['a', 1], ['b', 1]])
    const positions = new Map<string, { x: number; y: number }>()
    spreadRingDiscs(rings, radii, angles, positions)
    const outer = radii.get(2)!
    expect(outer - radii.get(1)!).toBeGreaterThanOrEqual(Math.max(RADIAL_DISC_MIN_ARC, outer * RADIAL_DISC_SPACING_OF_OUTER) * 0.98)
    const pa = positions.get('a')!, pb = positions.get('b')!
    expect(Math.hypot(pb.x - pa.x, pb.y - pa.y)).toBeGreaterThan(RADIAL_DISC_MIN_ARC)
  })

  it('leaves well-spaced rings untouched', () => {
    const rings = new Map([[1, ['a', 'b']]])
    const radii = new Map([[0, 0], [1, 1000]])
    const angles = new Map([['a', 0], ['b', Math.PI]])
    spreadRingDiscs(rings, radii, angles, new Map())
    expect(angles.get('a')).toBe(0)
    expect(angles.get('b')).toBe(Math.PI)
  })
})
