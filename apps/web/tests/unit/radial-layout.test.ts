import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  collectEntryPoints,
  defaultFilters,
  dependencyRingDepths,
  emptyViewState,
  indexGraph,
  layoutRadialNodes,
  resolveNucleusId,
  setNucleus
} from '../../src/viewer/overview'
import { readGraph } from '../../src/viewer/read-graph'

function loadSample() {
  const result = readGraph(readFileSync(resolve('fixtures/sample-graph.json'), 'utf8'))
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return indexGraph(result.graph)
}

describe('radial layout helpers', () => {
  it('detects conventional entry files', () => {
    const index = loadSample()
    const entries = collectEntryPoints(index)
    expect(entries.map((entry) => entry.id)).toContain('file:apps/web/main.ts')
    expect(resolveNucleusId(index, undefined)).toBe('file:apps/web/main.ts')
  })

  it('assigns dependency rings from the nucleus', () => {
    const index = loadSample()
    const nucleus = 'file:apps/web/main.ts'
    const depths = dependencyRingDepths(index, nucleus, defaultFilters(), 6)
    expect(depths.get(nucleus)).toBe(0)
    expect(depths.get('file:packages/brand/brand.ts')).toBe(1)
    expect(depths.get('unresolved:apps/web/main.ts::./missing')).toBe(1)
  })

  it('places nodes on concentric coordinates', () => {
    const index = loadSample()
    const state = setNucleus(emptyViewState(), 'file:apps/web/main.ts')
    const depths = dependencyRingDepths(index, state.nucleusId!, defaultFilters(), state.maxRadialRing ?? 6)
    const nodes = [...depths.entries()].map(([id, depth]) => ({ id, depth }))
    const positions = layoutRadialNodes(nodes, 'file:apps/web/main.ts')
    expect(positions.get('file:apps/web/main.ts')).toEqual({ x: 0, y: 0 })
    const ringOne = positions.get('file:packages/brand/brand.ts')
    expect(ringOne).toBeDefined()
    expect(Math.hypot(ringOne!.x, ringOne!.y)).toBeGreaterThan(100)
  })

  it('places a 2-child sample near top and bottom (start at 12 o\'clock)', async () => {
    const { dependencyRingTree, layoutRadialTree } = await import('../../src/viewer/overview')
    const index = loadSample()
    const nucleus = 'file:apps/web/main.ts'
    const { depths, parentOf } = dependencyRingTree(index, nucleus, defaultFilters(), 6)
    const nodes = [...depths.entries()].map(([id, depth]) => ({ id, depth }))
    const { positions } = layoutRadialTree(nodes, nucleus, parentOf)
    const brand = positions.get('file:packages/brand/brand.ts')!
    const missing = positions.get('unresolved:apps/web/main.ts::./missing')!
    // Both on ring 1; one should be above centre, one below (or nearly).
    const ys = [brand.y, missing.y].sort((a, b) => a - b)
    expect(ys[0]!).toBeLessThan(-50)
    expect(ys[1]!).toBeGreaterThan(50)
  })
})
