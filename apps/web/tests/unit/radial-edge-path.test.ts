import { describe, expect, it } from 'vitest'
import { edgeRadialRole, radialEdgePath } from '../../src/viewer/radial-edge-path'

describe('radialEdgePath', () => {
  it('bows the control point toward the ring centre for spokes', () => {
    const centre = { x: 0, y: 0 }
    const spoke = radialEdgePath(0, -100, 100, 0, centre, 'spoke')
    expect(spoke.path.startsWith('M0,-100 Q')).toBe(true)
    // Midpoint of (0,-100) and (100,0) is (50,-50); 18% pull toward origin → (41, -41)
    expect(spoke.path).toContain('Q41,-41')
  })

  it('pulls cross-links less so they stay flatter', () => {
    const centre = { x: 0, y: 0 }
    const cross = radialEdgePath(0, -100, 100, 0, centre, 'cross')
    expect(cross.path).toContain('Q46,-46')
  })
})

describe('edgeRadialRole', () => {
  it('marks neighbouring rings as spokes and everything else as cross', () => {
    expect(edgeRadialRole(0, 1, false)).toBe('spoke')
    expect(edgeRadialRole(2, 3, false)).toBe('spoke')
    expect(edgeRadialRole(1, 1, false)).toBe('cross')
    expect(edgeRadialRole(0, 2, false)).toBe('cross')
    expect(edgeRadialRole(0, 1, true)).toBe('cross')
    expect(edgeRadialRole(undefined, 1, false)).toBe('cross')
  })
})
