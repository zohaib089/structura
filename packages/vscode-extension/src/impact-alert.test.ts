import assert from 'node:assert/strict'
import test from 'node:test'
import type { Graph } from '@atlasmith/engine'
import { buildImpactAlert, fileIdForPath } from './impact-alert.js'

function coverage(files: number) {
  return {
    files: { discovered: files, parsed: files, partial: 0, failed: 0, skipped: 0, ignored: 0 },
    byLanguage: [],
    skipped: [],
    failed: [],
    ignored: [],
    unresolved: [],
    accounting: { discovered: files, accounted: files }
  }
}

function fileNode(path: string) {
  const name = path.slice(path.lastIndexOf('/') + 1)
  return {
    id: `file:${path}`,
    kind: 'file' as const,
    path,
    label: name,
    language: 'typescript',
    lineCount: 1,
    parse: { status: 'parsed' as const }
  }
}

/** util.ts is imported by app.ts, which is imported by entry.ts. */
function chainGraph(): Graph {
  return {
    schemaVersion: 'graph.v1',
    summary: { nodes: 4, edges: 5, files: 3 },
    coverage: coverage(3),
    nodes: [
      { id: 'dir:.', kind: 'directory', path: '.', label: '.' },
      fileNode('src/util.ts'),
      fileNode('src/app.ts'),
      fileNode('src/entry.ts')
    ],
    edges: [
      { source: 'dir:.', type: 'contains', target: 'file:src/util.ts', provenance: 'EXTRACTED' },
      { source: 'dir:.', type: 'contains', target: 'file:src/app.ts', provenance: 'EXTRACTED' },
      { source: 'dir:.', type: 'contains', target: 'file:src/entry.ts', provenance: 'EXTRACTED' },
      {
        source: 'file:src/app.ts',
        type: 'imports',
        target: 'file:src/util.ts',
        provenance: 'EXTRACTED',
        specifier: './util',
        span: { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } }
      },
      {
        source: 'file:src/entry.ts',
        type: 'imports',
        target: 'file:src/app.ts',
        provenance: 'INFERRED',
        confidence: 0.8,
        reason: 'src-subpath',
        specifier: './app',
        span: { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } }
      }
    ]
  }
}

test('fileIdForPath accepts a repo-relative path', () => {
  const graph = chainGraph()
  assert.equal(fileIdForPath(graph, 'src/util.ts'), 'file:src/util.ts')
  assert.equal(fileIdForPath(graph, '/src/util.ts'), 'file:src/util.ts')
  assert.equal(fileIdForPath(graph, 'missing.ts'), undefined)
  assert.equal(fileIdForPath(graph, ''), undefined)
})

test('buildImpactAlert lists downstream dependents like impact_lite, nearest first', () => {
  const alert = buildImpactAlert(chainGraph(), 'src/util.ts')
  assert.ok(alert)
  assert.equal(alert!.targetPath, 'src/util.ts')
  assert.equal(alert!.targetFileId, 'file:src/util.ts')
  assert.equal(alert!.truncated, false)
  assert.equal(alert!.depthLimit, 3)
  assert.deepEqual(
    alert!.dependents.map((row) => ({ path: row.path, depth: row.depth })),
    [
      { path: 'src/app.ts', depth: 1 },
      { path: 'src/entry.ts', depth: 2 }
    ]
  )
})

test('a file that nothing imports has an empty dependents list', () => {
  const alert = buildImpactAlert(chainGraph(), 'src/entry.ts')
  assert.ok(alert)
  assert.deepEqual(alert!.dependents, [])
})

test('buildImpactAlert returns null when the file is not in the graph', () => {
  assert.equal(buildImpactAlert(chainGraph(), 'notes.txt'), null)
})

test('the result cap marks the list as truncated', () => {
  const alert = buildImpactAlert(chainGraph(), 'src/util.ts', { resultLimit: 1 })
  assert.ok(alert)
  assert.equal(alert!.truncated, true)
  assert.equal(alert!.dependents.length, 1)
  assert.equal(alert!.dependents[0]?.path, 'src/app.ts')
})
