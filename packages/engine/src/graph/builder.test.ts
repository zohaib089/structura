import assert from 'node:assert/strict'
import test from 'node:test'
import { GraphBuilder } from './builder.js'
import { buildCoverage } from '../report/report.js'

const coverage = buildCoverage({
  discovered: 0,
  ignored: new Map(),
  files: [],
  unnoded: [],
  unresolved: []
})

const span = { start: { line: 1, col: 1 }, end: { line: 1, col: 20 } }

test('colliding import edges merge typeOnly and importKind (value and non-static win)', () => {
  const builder = new GraphBuilder()
  const base = {
    source: 'file:src/a.ts',
    type: 'imports' as const,
    target: 'file:src/b.ts',
    provenance: 'EXTRACTED' as const,
    span,
    specifier: './b'
  }
  assert.equal(builder.addEdge({ ...base, typeOnly: true }), true)
  assert.equal(builder.addEdge({ ...base }), false)
  const graph = builder.build(coverage)
  assert.equal(graph.edges.length, 1)
  const edge = graph.edges[0]
  assert.equal(edge && 'typeOnly' in edge, false)

  const builder2 = new GraphBuilder()
  assert.equal(builder2.addEdge({ ...base, importKind: 'dynamic' }), true)
  assert.equal(builder2.addEdge({ ...base, typeOnly: true }), false)
  const merged = builder2.build(coverage).edges[0]
  assert.equal(merged && 'importKind' in merged && merged.importKind, 'dynamic')
  assert.equal(merged && 'typeOnly' in merged, false)

  const builder3 = new GraphBuilder()
  assert.equal(builder3.addEdge({ ...base, typeOnly: true }), true)
  assert.equal(builder3.addEdge({ ...base, typeOnly: true }), false)
  const bothType = builder3.build(coverage).edges[0]
  assert.equal(bothType && 'typeOnly' in bothType && bothType.typeOnly, true)
})
