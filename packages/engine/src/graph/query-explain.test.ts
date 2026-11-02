import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CANARY_GRAPH_PATH } from './hash.js'
import { explainGraphNode } from './explain.js'
import { GraphNodeNotFoundError, resolveNodeRef } from './resolve-ref.js'
import { queryGraph } from './query.js'
import { readGraph } from './read.js'

const { graph } = readGraph(readFileSync(CANARY_GRAPH_PATH, 'utf8'))

test('resolveNodeRef accepts ids and repo paths', () => {
  assert.equal(resolveNodeRef(graph, 'file:src/app.ts'), 'file:src/app.ts')
  assert.equal(resolveNodeRef(graph, 'src/app.ts'), 'file:src/app.ts')
  assert.equal(resolveNodeRef(graph, 'src/app.ts#main'), 'sym:src/app.ts#main')
  assert.throws(() => resolveNodeRef(graph, 'missing.ts'), GraphNodeNotFoundError)
})

test('queryGraph lists nodes with kind and path filters', () => {
  const files = queryGraph(graph, { kind: 'file' })
  assert.equal(files.mode, 'nodes')
  assert.deepEqual(
    files.nodes.map(node => node.id),
    ['file:src/app.ts']
  )
  const byPath = queryGraph(graph, { path: 'src/**' })
  assert.equal(byPath.mode, 'nodes')
  assert.equal(byPath.nodes.length, 2)
  assert.deepEqual(
    byPath.nodes.map(node => node.id).sort(),
    ['dir:src', 'file:src/app.ts']
  )
})

test('queryGraph lists edges with type and endpoint filters', () => {
  const imports = queryGraph(graph, { type: 'imports' })
  assert.equal(imports.mode, 'edges')
  assert.equal(imports.edges.length, 1)
  const from = queryGraph(graph, { from: 'src/app.ts', type: 'imports' })
  assert.equal(from.edges[0]?.target, 'ext:npm:left-pad')
  const to = queryGraph(graph, { to: 'ext:npm:left-pad' })
  assert.equal(to.edges.length, 1)
})

test('queryGraph applies limit after sorting', () => {
  const limited = queryGraph(graph, { limit: 1 })
  assert.equal(limited.mode, 'nodes')
  assert.equal(limited.nodes.length, 1)
  assert.equal(limited.nodes[0]?.id, 'dir:.')
})

test('explainGraphNode reports coverage and grouped edges', () => {
  const explained = explainGraphNode(graph, 'src/app.ts')
  assert.equal(explained.kind, 'file')
  assert.equal(explained.coverage?.status, 'parsed')
  assert.equal(explained.inbound.contains?.length, 1)
  assert.equal(explained.outbound.imports?.length, 1)
  assert.equal(explained.outbound.contains?.length, 1)
  assert.equal(explained.entryCandidate?.provenance, 'INFERRED')
})
