
import { describe, expect, it } from 'vitest'
import { edgeRadialRole, isTreeEdge, radialEdgePath } from '../../src/viewer/radial-edge-path'

describe('radialEdgePath spokes', () => {
  it('draws a pure radial line from the nucleus', () => {
    const centre = { x: 0, y: 0 }
    const spoke = radialEdgePath(0, 0, 0, -100, centre, 'spoke')
    expect(spoke.path).toBe('M0,0 L0,-100')
  })

  it('uses radial-then-arc for parent→child and never pulls through the centre', () => {
    const centre = { x: 0, y: 0 }
    // parent at r=100 angle -90°, child at r=200 angle 0°
    const path = radialEdgePath(0, -100, 200, 0, centre, 'spoke').path
    expect(path.startsWith('M0,-100 L')).toBe(true)
    expect(path).toContain(' A200')
    // elbow sits at outer radius on the parent's angle: (0, -200)
    expect(path).toContain('L0.00,-200.00')
  })
})

describe('BFS tree classification', () => {
  it('marks only exact tree parent↔child pairs as spokes', () => {
    const parentOf = new Map([
      ['b', 'a'],
      ['c', 'a'],
      ['d', 'b']
    ])
    expect(isTreeEdge('a', 'b', parentOf)).toBe(true)
    expect(isTreeEdge('b', 'd', parentOf)).toBe(true)
    expect(isTreeEdge('b', 'c', parentOf)).toBe(false)
    expect(edgeRadialRole('a', 'b', false, parentOf)).toBe('spoke')
    expect(edgeRadialRole('b', 'c', false, parentOf)).toBe('cross')
    expect(edgeRadialRole('a', 'b', true, parentOf)).toBe('cross')
  })
})
