import assert from 'node:assert/strict'
import test from 'node:test'
import type { Graph } from '@atlasmith/engine'
import { chooseProjectFocus, fileInGraph, toGraphPayload } from './workspace-scan.js'

/** Test-only fixture: a two-node graph shaped like engine output. */
function fixtureGraph(): Graph {
  return {
    schemaVersion: 'graph.v1',
    summary: { nodes: 2, edges: 1, files: 1 },
    coverage: {
      files: { discovered: 1, parsed: 1, partial: 0, failed: 0, skipped: 0, ignored: 0 },
      byLanguage: [],
      skipped: [],
      failed: [],
      ignored: [],
      unresolved: [],
      accounting: { discovered: 1, accounted: 1 }
    },
    nodes: [
      { id: 'dir:.', kind: 'directory', path: '.', label: '.' },
      {
        id: 'file:src/app.ts',
        kind: 'file',
        path: 'src/app.ts',
        label: 'app.ts',
        language: 'typescript',
        lineCount: 4,
        parse: { status: 'parsed' }
      }
    ],
    edges: [{ source: 'dir:.', type: 'contains', target: 'file:src/app.ts', provenance: 'EXTRACTED' }]
  }
}

test('fileInGraph finds a file node with queryGraph and an exact path', () => {
  const graph = fixtureGraph()
  assert.deepEqual(fileInGraph(graph, 'src/app.ts'), { found: true, path: 'src/app.ts' })
  assert.deepEqual(fileInGraph(graph, 'src/missing.ts'), { found: false, path: 'src/missing.ts' })
})

test('toGraphPayload keeps the fields the viewer needs and drops run metadata', () => {
  const graph = fixtureGraph()
  const payload = toGraphPayload(graph)
  assert.equal(payload.schemaVersion, 'graph.v1')
  assert.deepEqual(payload.summary, { nodes: 2, edges: 1, files: 1 })
  assert.equal(payload.nodes.length, 2)
  assert.equal(payload.edges.length, 1)
  assert.equal('run' in payload, false)
})

test('chooseProjectFocus prefers the file with the most non-contains edges (test-only fixture)', () => {
  const graph = fixtureGraph()
  graph.nodes.push({
    id: 'file:src/other.ts',
    kind: 'file',
    path: 'src/other.ts',
    label: 'other.ts',
    language: 'typescript',
    lineCount: 2,
    parse: { status: 'parsed' }
  })
  graph.edges.push(
    { source: 'file:src/app.ts', type: 'imports', target: 'file:src/other.ts', provenance: 'EXTRACTED', span: { start: { line: 1, col: 1 }, end: { line: 1, col: 10 } }, specifier: './other' },
    { source: 'file:src/app.ts', type: 'imports', target: 'file:src/other.ts', provenance: 'EXTRACTED', span: { start: { line: 1, col: 1 }, end: { line: 1, col: 10 } }, specifier: './other' }
  )
  graph.summary = { nodes: 3, edges: 3, files: 2 }
  assert.equal(chooseProjectFocus(graph), 'src/app.ts')
})
