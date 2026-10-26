import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMFORT_EDGE_BUDGET, COMFORT_NODE_BUDGET, EXPAND_NODE_CAP, HARD_EDGE_CAP, HARD_NODE_CAP, INITIAL_NODE_CAP } from '../../src/viewer/caps'
import { buildFixture } from '../../tools/make-fixture.mjs'
import {
  buildOverview,
  collapseView,
  defaultFilters,
  emptyViewState,
  expandView,
  indexGraph,
  layoutNodes,
  searchGraph
} from '../../src/viewer/overview'
import { readGraph } from '../../src/viewer/read-graph'
import { EDGE_DASH } from '../../src/viewer/edge-style'

function load(text: string) {
  const result = readGraph(text)
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return indexGraph(result.graph)
}

describe('overview', () => {
  it('keeps the comfort budget below the confirmed caps', () => {
    expect(INITIAL_NODE_CAP).toBe(300)
    expect(EXPAND_NODE_CAP).toBe(50)
    expect(HARD_NODE_CAP).toBe(1000)
    expect(HARD_EDGE_CAP).toBe(1000)
    expect(COMFORT_NODE_BUDGET).toBeLessThan(INITIAL_NODE_CAP)
    expect(COMFORT_EDGE_BUDGET).toBeLessThan(HARD_EDGE_CAP)
  })

  it('rolls sample edges up with mixed provenance and unresolved styling', () => {
    const index = load(readFileSync(resolve('fixtures/sample-graph.json'), 'utf8'))
    const view = buildOverview(index, emptyViewState(), defaultFilters())
    expect(view.nodes.length).toBeLessThanOrEqual(INITIAL_NODE_CAP)
    const apps = view.nodes.find((node) => node.id === 'dir:apps')
    expect(apps?.clusterSize).toBe(5)
    expect(apps?.expanded).toBe(false)
    const mixed = view.edges.find((edge) => edge.source === 'dir:apps' && edge.target === 'dir:packages')
    expect(mixed).toMatchObject({ provenance: 'MIXED', weight: 2, resolved: true, visual: 'mixed' })
    const unresolved = view.edges.find((edge) => edge.target.startsWith('cluster:unresolved'))
    expect(unresolved?.resolved).toBe(false)
    expect(unresolved?.visual).toBe('unresolved')
    expect(EDGE_DASH.mixed).not.toBe(EDGE_DASH.inferred)
    expect(EDGE_DASH.unresolved).not.toBe(EDGE_DASH.extracted)
    const again = layoutNodes(view.nodes)
    expect([...again.entries()]).toEqual([...layoutNodes(view.nodes).entries()])
  })

  it('expands at most 50 children and clears that page on collapse', () => {
    const nodes: unknown[] = [{ id: 'dir:.', kind: 'directory', path: '.', label: '.' }, { id: 'dir:hub', kind: 'directory', path: 'hub', label: 'hub' }]
    const edges: unknown[] = [{ source: 'dir:.', type: 'contains', target: 'dir:hub', provenance: 'EXTRACTED' }]
    for (let index = 0; index < 80; index += 1) {
      const path = `hub/f${index}.ts`
      nodes.push({
        id: `file:${path}`,
        kind: 'file',
        path,
        label: `f${index}.ts`,
        language: 'typescript',
        lineCount: 4,
        parse: { status: 'parsed' }
      })
      edges.push({ source: 'dir:hub', type: 'contains', target: `file:${path}`, provenance: 'EXTRACTED' })
    }
    const files = 80
    const text = JSON.stringify({
      schemaVersion: '1.0.0',
      summary: { nodes: nodes.length, edges: edges.length, files },
      coverage: {
        files: { discovered: files, parsed: files, partial: 0, failed: 0, skipped: 0, ignored: 0 },
        byLanguage: [],
        skipped: [],
        ignored: [],
        unresolved: [],
        accounting: { discovered: files, accounted: files }
      },
      nodes,
      edges
    })
    const index = load(text)
    const opened = buildOverview(index, expandView(emptyViewState(), 'dir:hub'), defaultFilters())
    const children = opened.nodes.filter((node) => node.depth > 0 && !node.more)
    expect(children.length).toBeLessThanOrEqual(EXPAND_NODE_CAP)
    expect(opened.nodes.some((node) => node.more)).toBe(true)
    expect(opened.nodes.length).toBeLessThanOrEqual(HARD_NODE_CAP)
    const collapsed = buildOverview(index, collapseView(index, expandView(emptyViewState(), 'dir:hub'), 'dir:hub'), defaultFilters())
    expect(collapsed.nodes.some((node) => node.id.startsWith('file:'))).toBe(false)
  })

  it('keeps a 5k fixture inside the initial render cap', () => {
    const document = buildFixture(5000)
    expect(document.summary.nodes).toBeGreaterThanOrEqual(5000)
    const index = load(JSON.stringify(document))
    const view = buildOverview(index, emptyViewState(), defaultFilters())
    expect(view.nodes.length).toBeLessThanOrEqual(INITIAL_NODE_CAP)
    expect(view.nodes.length).toBeGreaterThan(1)
    expect(view.edges.length).toBeLessThanOrEqual(1000)
  })

  it('searches literally and stays inside the result cap', () => {
    const index = load(JSON.stringify(buildFixture(400)))
    const found = searchGraph(index, 'f1')
    expect(found.hits.length).toBeLessThanOrEqual(50)
    expect(found.total).toBeGreaterThan(0)
    expect(() => searchGraph(index, '.*+?{__proto__}🙂'.repeat(20))).not.toThrow()
    const hostile = searchGraph(index, '__proto__')
    expect(hostile.hits.length).toBe(0)
  })
})
