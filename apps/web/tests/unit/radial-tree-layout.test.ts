import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildOverview,
  childrenLieInParentSectors,
  defaultFilters,
  dependencyRingTree,
  emptyViewState,
  indexGraph,
  layoutRadialTree,
  setNucleus,
  treeSpokesCross
} from '../../src/viewer/overview'
import { readGraph } from '../../src/viewer/read-graph'

function load(path: string) {
  const result = readGraph(readFileSync(resolve(path), 'utf8'))
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return indexGraph(result.graph)
}

describe('radial tree sector layout', () => {
  it('places every dense-fixture child inside its BFS parent sector and keeps tree spokes non-crossing', () => {
    const index = load('tests/e2e/fixtures/dense-graph.test-only.json')
    const nucleus = 'file:src/main.ts'
    const state = setNucleus(emptyViewState(), nucleus)
    const filters = defaultFilters()
    const { depths, parentOf } = dependencyRingTree(index, nucleus, filters, state.maxRadialRing ?? 6)
    const nodes = [...depths.entries()].map(([id, depth]) => ({ id, depth }))
    const { positions, angles, sectors } = layoutRadialTree(nodes, nucleus, parentOf)

    expect(positions.get(nucleus)).toEqual({ x: 0, y: 0 })
    expect(childrenLieInParentSectors(angles, sectors, parentOf)).toBe(true)
    expect(treeSpokesCross(positions, parentOf)).toBe(false)

    // Spot-check: a ring-1 child of the nucleus sits on ring 1.
    const ring1 = [...parentOf.entries()].filter(([, p]) => p === nucleus).map(([id]) => id)
    expect(ring1.length).toBeGreaterThan(0)
    for (const id of ring1) {
      const pos = positions.get(id)!
      expect(Math.hypot(pos.x, pos.y)).toBeGreaterThan(100)
    }
  })

  it('keeps buildOverview positions on the tree layout for the dense fixture', () => {
    const index = load('tests/e2e/fixtures/dense-graph.test-only.json')
    const overview = buildOverview(index, setNucleus(emptyViewState(), 'file:src/main.ts'), defaultFilters())
    const spokeParents = new Map(
      overview.edges.filter((e) => e.role === 'spoke').map((e) => {
        // Reconstruct undirected parent link from depths on nodes
        const sd = overview.nodes.find((n) => n.id === e.source)?.depth ?? 0
        const td = overview.nodes.find((n) => n.id === e.target)?.depth ?? 0
        return sd < td ? ([e.target, e.source] as const) : ([e.source, e.target] as const)
      })
    )
    expect(treeSpokesCross(overview.positions, spokeParents)).toBe(false)
  })
})
