import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertNoLabelOverlaps,
  measureLabelWidth,
  resolveLabelCollisions
} from '../../src/viewer/label-collision'
import {
  childrenLieInParentSectors,
  defaultFilters,
  dependencyRingTree,
  emptyViewState,
  indexGraph,
  layoutRadialTree,
  maxAngularGap,
  RADIAL_RING1_MIN_WEDGE,
  setNucleus,
  sharesWithFloor,
  treeSpokesCross,
  buildOverview
} from '../../src/viewer/overview'
import { readGraph } from '../../src/viewer/read-graph'

function load(path: string) {
  const result = readGraph(readFileSync(resolve(path), 'utf8'))
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return indexGraph(result.graph)
}

describe('label collision + ring-1 floor', () => {
  it('measureLabelWidth is consistent and grows with text', () => {
    const a = measureLabelWidth('a')
    const b = measureLabelWidth('GraphCanvas.vue')
    expect(b).toBeGreaterThan(a)
    expect(measureLabelWidth('GraphCanvas.vue')).toBe(b)
  })

  it('sharesWithFloor enforces a minimum wedge', () => {
    const shares = sharesWithFloor([1, 1, 1, 10], Math.PI * 2, RADIAL_RING1_MIN_WEDGE)
    expect(shares.length).toBe(4)
    for (const s of shares) expect(s).toBeGreaterThanOrEqual(RADIAL_RING1_MIN_WEDGE - 1e-6)
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(Math.PI * 2, 6)
  })

  it('dense fixture: no label↔label or label↔disc overlaps after collision pass', () => {
    const index = load('tests/e2e/fixtures/dense-graph.test-only.json')
    const nucleus = 'file:src/main.ts'
    const { depths, parentOf } = dependencyRingTree(index, nucleus, defaultFilters(), 6)
    const nodes = [...depths.entries()].map(([id, depth]) => {
      const n = index.nodesById.get(id)
      return { id, depth, label: n && 'label' in n ? String((n as { label?: string }).label ?? id) : id }
    })
    const laid = layoutRadialTree(nodes, nucleus, parentOf)
    expect(childrenLieInParentSectors(laid.angles, laid.sectors, parentOf)).toBe(true)
    expect(treeSpokesCross(laid.positions, parentOf)).toBe(false)

    const collisionNodes = nodes.map((n) => ({
      id: n.id,
      label: n.label,
      depth: n.depth,
      angle: laid.angles.get(n.id)!,
      radius: laid.radiiByDepth.get(n.depth) ?? 0,
      nucleus: n.id === nucleus || n.depth === 0
    }))
    // Placements already computed inside layout; re-check with same measured widths.
    const issues = assertNoLabelOverlaps(laid.labelPlacements, collisionNodes)
    expect(issues, issues.join('\n')).toEqual([])

    // Ring-1 min wedge: no tiny bunch — max empty gap among ring-1 midpoints stays bounded,
    // and every ring-1 sector is at least ~18°.
    const ring1 = [...parentOf.entries()].filter(([, p]) => p === nucleus).map(([id]) => id)
    expect(ring1.length).toBeGreaterThan(2)
    for (const id of ring1) {
      const s = laid.sectors.get(id)!
      expect(s.end - s.start).toBeGreaterThanOrEqual(RADIAL_RING1_MIN_WEDGE - 0.02)
    }
    expect(maxAngularGap(ring1.map((id) => laid.angles.get(id)!))).toBeLessThan(Math.PI * 0.85)
  })

  it('buildOverview exposes labelPlacements for the dense fixture', () => {
    const index = load('tests/e2e/fixtures/dense-graph.test-only.json')
    const overview = buildOverview(index, setNucleus(emptyViewState(), 'file:src/main.ts'), defaultFilters())
    expect(overview.labelPlacements.size).toBe(overview.nodes.length)
    const sample = [...overview.labelPlacements.values()].find((p) => p.displayLabel.includes('…') || p.displayLabel.length > 0)
    expect(sample).toBeTruthy()
  })
})
