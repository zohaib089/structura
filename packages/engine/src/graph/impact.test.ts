import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CANARY_GRAPH_PATH } from './hash.js'
import {
  ImpactTargetAmbiguousError,
  ImpactTargetNotFoundError,
  graphImpact,
  resolveImpactTarget,
  walkFileImpact
} from './impact.js'
import { readGraph } from './read.js'

const { graph: canary } = readGraph(readFileSync(CANARY_GRAPH_PATH, 'utf8'))

function chainGraph() {
  return {
    ...canary,
    nodes: [
      ...canary.nodes,
      {
        id: 'file:src/util.ts',
        kind: 'file' as const,
        path: 'src/util.ts',
        label: 'util.ts',
        language: 'typescript',
        lineCount: 1,
        parse: { status: 'parsed' as const }
      },
      {
        id: 'file:src/entry.ts',
        kind: 'file' as const,
        path: 'src/entry.ts',
        label: 'entry.ts',
        language: 'typescript',
        lineCount: 1,
        parse: { status: 'parsed' as const }
      }
    ],
    edges: [
      ...canary.edges,
      {
        source: 'file:src/app.ts',
        type: 'imports' as const,
        target: 'file:src/util.ts',
        provenance: 'EXTRACTED' as const,
        span: { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } },
        specifier: './util'
      },
      {
        source: 'file:src/entry.ts',
        type: 'imports' as const,
        target: 'file:src/app.ts',
        provenance: 'INFERRED' as const,
        confidence: 0.8,
        reason: 'src-subpath',
        span: { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } },
        specifier: './app'
      }
    ]
  }
}

test('resolveImpactTarget accepts file paths and symbol names', () => {
  const file = resolveImpactTarget(canary, 'src/app.ts')
  assert.equal(file.kind, 'file')
  assert.equal(file.id, 'file:src/app.ts')
  const symbol = resolveImpactTarget(canary, 'main')
  assert.equal(symbol.kind, 'symbol')
  assert.equal(symbol.id, 'sym:src/app.ts#main')
})

test('resolveImpactTarget rejects missing paths and ambiguous symbol names', () => {
  assert.throws(() => resolveImpactTarget(canary, 'missing.ts'), ImpactTargetNotFoundError)
  const ambiguous = {
    ...canary,
    nodes: [
      ...canary.nodes,
      {
        id: 'file:src/other.ts',
        kind: 'file' as const,
        path: 'src/other.ts',
        label: 'other.ts',
        language: 'typescript',
        lineCount: 1,
        parse: { status: 'parsed' as const }
      },
      {
        id: 'sym:src/other.ts#main',
        kind: 'symbol' as const,
        file: 'file:src/other.ts',
        label: 'main',
        symbolKind: 'function' as const,
        exported: true,
        span: { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } }
      }
    ]
  }
  assert.throws(() => resolveImpactTarget(ambiguous, 'main'), ImpactTargetAmbiguousError)
})

test('walkFileImpact marks inferred downstream paths', () => {
  const graph = chainGraph()
  const downstream = walkFileImpact(graph, 'file:src/util.ts', 'downstream', { depthLimit: 3 })
  assert.equal(downstream.paths.length, 2)
  assert.equal(downstream.paths[0]?.status, 'EXTRACTED')
  assert.equal(downstream.paths[1]?.status, 'INFERRED')
  assert.deepEqual(
    downstream.paths.map(path => path.nodes),
    [
      ['file:src/util.ts', 'file:src/app.ts'],
      ['file:src/util.ts', 'file:src/app.ts', 'file:src/entry.ts']
    ]
  )
})

test('graphImpact reports upstream imports on canary', () => {
  const result = graphImpact(canary, 'src/app.ts', { depth: 2 })
  assert.equal(result.upstream.length, 1)
  assert.equal(result.upstream[0]?.nodes.at(-1), 'ext:npm:left-pad')
  assert.equal(result.upstream[0]?.status, 'EXTRACTED')
  assert.equal(result.downstream.length, 0)
})
