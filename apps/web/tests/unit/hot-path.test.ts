import { describe, expect, it } from 'vitest'
import { hotPathBetween } from '../../src/viewer/hot-path'
import { buildLinearOverview } from '../../src/viewer/linear'
import { defaultFilters, emptyViewState, indexGraph, setNucleus } from '../../src/viewer/overview'
import type { GraphDocument } from '../../src/viewer/graph-types'

const e = (source: string, target: string) => ({ id: `${source}>${target}`, source, target })

describe('path highlight (Radial and Linear)', () => {
  it('lights the shortest route from the centre, either direction', () => {
    const edges = [e('c', 'a'), e('a', 'b'), e('u', 'c'), e('c', 'b')]
    const out = hotPathBetween(edges, 'c', 'b')
    expect([...out.nodes].sort()).toEqual(['b', 'c'])
    expect([...out.edges]).toEqual(['c>b'])
    const left = hotPathBetween(edges, 'c', 'u')
    expect([...left.edges]).toEqual(['u>c'])
  })

  it('is empty for no target or the centre itself', () => {
    expect(hotPathBetween([e('c', 'a')], 'c', null).nodes.size).toBe(0)
    expect(hotPathBetween([e('c', 'a')], 'c', 'c').nodes.size).toBe(0)
  })

  it('works on a Linear model: a file two columns out lights the middle file and both edges', () => {
    const files = ['src/centre.ts', 'src/a.ts', 'src/deep.ts', 'app/user.ts']
    const imports = [['src/centre.ts', 'src/a.ts'], ['src/a.ts', 'src/deep.ts'], ['app/user.ts', 'src/centre.ts']]
    const document = {
      schemaVersion: '1.0.0', summary: { nodes: 4, edges: 3 }, coverage: {},
      nodes: files.map((path) => ({ id: `file:${path}`, kind: 'file', path, label: path.split('/').pop(), language: 'typescript' })),
      edges: imports.map(([s, t]) => ({ source: `file:${s}`, target: `file:${t}`, type: 'imports', provenance: 'EXTRACTED', importKind: 'static', typeOnly: false }))
    } as unknown as GraphDocument
    const index = indexGraph(document)
    const model = buildLinearOverview(index, setNucleus(emptyViewState(), 'file:src/centre.ts'), defaultFilters())
    const path = hotPathBetween(model.edges, 'file:src/centre.ts', 'file:src/deep.ts')
    expect([...path.nodes].sort()).toEqual(['file:src/a.ts', 'file:src/centre.ts', 'file:src/deep.ts'])
    expect(path.edges.size).toBe(2)
    expect(hotPathBetween(model.edges, 'file:src/centre.ts', 'file:app/user.ts').nodes.has('file:src/a.ts')).toBe(false)
  })
})
