import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildOverview,
  childrenLieInParentSectors,
  defaultFilters,
  dependencyRingTree,
  emptyViewState,
  estimateLabelWidth,
  indexGraph,
  layoutRadialTree,
  setNucleus,
  maxAngularGap,
  RADIAL_DISC_OFFSET,
  treeSpokesCross
} from '../../src/viewer/overview'
import { readGraph } from '../../src/viewer/read-graph'

function load(path: string) {
  const result = readGraph(readFileSync(resolve(path), 'utf8'))
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return indexGraph(result.graph)
}

function denseTree() {
  const index = load('tests/e2e/fixtures/dense-graph.test-only.json')
  const nucleus = 'file:src/main.ts'
  const { depths, parentOf } = dependencyRingTree(index, nucleus, defaultFilters(), 6)
  const nodes = [...depths.entries()].map(([id, depth]) => {
    const n = index.nodesById.get(id)
    return { id, depth, label: n && 'label' in n ? String((n as { label?: string }).label ?? id) : id }
  })
  return { index, nucleus, parentOf, nodes, laid: layoutRadialTree(nodes, nucleus, parentOf) }
}

describe('radial tree sector layout', () => {
  it('places every dense-fixture child inside its BFS parent sector and keeps tree spokes non-crossing', () => {
    const { nucleus, parentOf, laid } = denseTree()
    const { positions, angles, sectors } = laid

    expect(positions.get(nucleus)).toEqual({ x: 0, y: 0 })
    expect(childrenLieInParentSectors(angles, sectors, parentOf)).toBe(true)
    expect(treeSpokesCross(positions, parentOf)).toBe(false)

    const ring1 = [...parentOf.entries()].filter(([, p]) => p === nucleus).map(([id]) => id)
    expect(ring1.length).toBeGreaterThan(0)
    for (const id of ring1) {
      const pos = positions.get(id)!
      expect(Math.hypot(pos.x, pos.y)).toBeGreaterThan(100)
    }
  })

  it('spreads ring-1 children around the nucleus (no huge empty half)', () => {
    const { nucleus, parentOf, laid } = denseTree()
    const ring1 = [...parentOf.entries()].filter(([, p]) => p === nucleus).map(([id]) => id)
    expect(ring1.length).toBeGreaterThan(2)
    const ring1Angles = ring1.map((id) => laid.angles.get(id)!)
    expect(maxAngularGap(ring1Angles)).toBeLessThan(Math.PI * 0.85)
    const first = [...ring1].sort()[0]!
    const firstDeg = ((laid.angles.get(first)! * 180) / Math.PI + 360) % 360
    const dist = Math.min(Math.abs(firstDeg - 270), 360 - Math.abs(firstDeg - 270))
    expect(dist).toBeLessThan(90)
  })

  it('keeps buildOverview positions on the tree layout for the dense fixture', () => {
    const index = load('tests/e2e/fixtures/dense-graph.test-only.json')
    const overview = buildOverview(index, setNucleus(emptyViewState(), 'file:src/main.ts'), defaultFilters())
    expect(overview.ringRadii.length).toBeGreaterThan(0)
    const spokeParents = new Map(
      overview.edges.filter((e) => e.role === 'spoke').map((e) => {
        const sd = overview.nodes.find((n) => n.id === e.source)?.depth ?? 0
        const td = overview.nodes.find((n) => n.id === e.target)?.depth ?? 0
        return sd < td ? ([e.target, e.source] as const) : ([e.source, e.target] as const)
      })
    )
    expect(treeSpokesCross(overview.positions, spokeParents)).toBe(false)
  })

  it('puts every dense node on its shared ring radius (guides use the same values)', () => {
    const { nodes, laid } = denseTree()
    for (const node of nodes) {
      if (node.depth <= 0) continue
      const pos = laid.positions.get(node.id)!
      const expected = laid.radiiByDepth.get(node.depth)!
      expect(Math.hypot(pos.x, pos.y)).toBeCloseTo(expected, 5)
    }
    // Radii list exported for guides matches depth order.
    const ordered = [...laid.radiiByDepth.entries()].filter(([d]) => d > 0).sort((a, b) => a[0] - b[0]).map(([, r]) => r)
    expect(ordered.length).toBeGreaterThan(1)
    for (let i = 1; i < ordered.length; i += 1) expect(ordered[i]!).toBeGreaterThan(ordered[i - 1]!)
  })

  it('keeps approximate desktop label boxes from overlapping on the dense fixture', () => {
    const { nodes, laid } = denseTree()
    type Box = { id: string; left: number; right: number; top: number; bottom: number }
    const boxes: Box[] = []
    const labelH = 14
    for (const node of nodes) {
      const pos = laid.positions.get(node.id)!
      const angle = laid.angles.get(node.id) ?? -Math.PI / 2
      const cx = pos.x + RADIAL_DISC_OFFSET
      const cy = pos.y + RADIAL_DISC_OFFSET
      if (node.depth === 0) {
        // Nucleus name + ENTRY POINT stack sits below the hexagon.
        const w = estimateLabelWidth(node.label ?? 'main.ts')
        boxes.push({
          id: node.id,
          left: cx - w / 2,
          right: cx + w / 2,
          top: cy + 22,
          bottom: cy + 22 + labelH * 2
        })
        continue
      }
      const w = estimateLabelWidth(node.label ?? node.id)
      const outward = angle
      // Labels sit radially outward of the disc (landing style).
      const lx = cx + Math.cos(outward) * (RADIAL_DISC_OFFSET + 10)
      const ly = cy + Math.sin(outward) * (RADIAL_DISC_OFFSET + 10)
      const west = Math.cos(outward) < 0
      boxes.push({
        id: node.id,
        left: west ? lx - w : lx,
        right: west ? lx : lx + w,
        top: ly - labelH / 2,
        bottom: ly + labelH / 2
      })
    }
    const overlaps: string[] = []
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!
        const b = boxes[j]!
        const hit =
          a.left < b.right - 1 &&
          a.right > b.left + 1 &&
          a.top < b.bottom - 1 &&
          a.bottom > b.top + 1
        if (hit) overlaps.push(`${a.id}×${b.id}`)
      }
    }
    expect(overlaps, overlaps.slice(0, 8).join(', ')).toEqual([])
  })
})
