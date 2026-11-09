import { describe, expect, it } from 'vitest'
import { edgeRadialRole, isTreeEdge, radialEdgePath } from '../../src/viewer/radial-edge-path'

describe('radialEdgePath spokes', () => {
  it('draws a pure radial line from the nucleus to ring 1', () => {
    const centre = { x: 0, y: 0 }
    const spoke = radialEdgePath(0, 0, 0, -100, centre, 'spoke')
    expect(spoke.path).toBe('M0,0 L0,-100')
  })

  it('uses a cubic Bezier that fans out (not a long ring arc)', () => {
    const centre = { x: 0, y: 0 }
    // parent at r=100 angle -90°, child at r=200 angle 0°
    const path = radialEdgePath(0, -100, 200, 0, centre, 'spoke').path
    expect(path.startsWith('M0,-100 C')).toBe(true)
    expect(path).not.toContain(' A')
    // Control points stay on parent/child rays (x≈0 for c1, y≈0 for c2)
    const m = path.match(/^M0,-100 C([^,]+),([^ ]+) ([^,]+),([^ ]+) 200,0$/)
    expect(m).toBeTruthy()
    const c1x = Number(m![1]), c1y = Number(m![2]), c2x = Number(m![3]), c2y = Number(m![4])
    expect(Math.abs(c1x)).toBeLessThan(1) // along parent angle (-90° → x=0)
    expect(c1y).toBeLessThan(-100) // pushed outward (more negative y)
    expect(Math.abs(c2y)).toBeLessThan(1) // along child angle (0° → y=0)
    expect(c2x).toBeGreaterThan(0)
    expect(c2x).toBeLessThan(200) // pulled inward
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
