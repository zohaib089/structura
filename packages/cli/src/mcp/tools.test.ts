import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { CONFIG_FILE, readGraph } from '@atlasmith/engine'
import {
  architectureFindings,
  fileDeps,
  impactLite,
  listModules,
  McpToolError,
  symbolLookup
} from './tools.js'

const here = dirname(fileURLToPath(import.meta.url))
const canaryPath = join(here, '../../../engine/schema-fixtures/v1.0.0.graph.json')
const canary = readGraph(readFileSync(canaryPath, 'utf8')).graph

function withArchitecture(findings: ArchitectureFinding[] | undefined): typeof canary {
  return {
    ...canary,
    architecture: {
      config: CONFIG_FILE,
      modules: [
        { name: 'app', paths: ['src/**'] },
        { name: 'vendor', paths: ['ext/**'] }
      ],
      unassigned: ['misc.ts'],
      ...(findings && findings.length > 0 ? { findings } : {}),
      summary: { violations: findings?.length ?? 0, unassignedFiles: 1 }
    },
    nodes: canary.nodes.map(node =>
      node.kind === 'file' && node.path === 'src/app.ts' ? { ...node, module: 'app' } : node
    )
  }
}

test('list_modules returns declared modules and counts', () => {
  const graph = withArchitecture(undefined)
  const result = listModules(graph)
  assert.equal(result.modules.length, 2)
  assert.equal(result.modules[0]?.name, 'app')
  assert.equal(result.modules[0]?.fileCount, 1)
  assert.deepEqual(result.unassigned, ['misc.ts'])
})

test('list_modules is empty without architecture section', () => {
  const result = listModules(canary)
  assert.deepEqual(result, { modules: [], unassigned: [] })
})

test('file_deps reports imports with provenance on canary', () => {
  const result = fileDeps(canary, 'src/app.ts')
  assert.equal(result.fileId, 'file:src/app.ts')
  assert.equal(result.imports.length, 1)
  assert.equal(result.imports[0]?.provenance, 'EXTRACTED')
  assert.equal(result.imports[0]?.peerId, 'ext:npm:left-pad')
  assert.equal(result.importers.length, 0)
})

test('file_deps rejects non-file refs', () => {
  assert.throws(() => fileDeps(canary, 'sym:src/app.ts#main'), McpToolError)
})

test('symbol_lookup finds main in canary', () => {
  const matches = symbolLookup(canary, 'main')
  assert.equal(matches.length, 1)
  assert.equal(matches[0]?.filePath, 'src/app.ts')
  assert.equal(matches[0]?.symbolKind, 'function')
})

test('architecture_findings returns findings or empty list', () => {
  assert.deepEqual(architectureFindings(canary), [])
  const finding = {
    from: 'app',
    to: 'vendor',
    edgeKind: 'imports' as const,
    file: 'src/app.ts',
    line: 1,
    rule: 'deny-list',
    provenance: 'EXTRACTED' as const
  }
  const graph = withArchitecture([finding])
  assert.deepEqual(architectureFindings(graph), [finding])
})

test('impact_lite walks reverse import chains among files', () => {
  const graph = {
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
        provenance: 'EXTRACTED' as const,
        span: { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } },
        specifier: './app'
      }
    ]
  }
  const result = impactLite(graph, 'src/util.ts', 3, 10)
  assert.deepEqual(
    result.dependents.map(item => ({ path: item.path, depth: item.depth })),
    [
      { path: 'src/app.ts', depth: 1 },
      { path: 'src/entry.ts', depth: 2 }
    ]
  )
})

test('impact_lite returns empty dependents when nothing imports the file', () => {
  const result = impactLite(canary, 'src/app.ts', 2, 10)
  assert.equal(result.truncated, false)
  assert.deepEqual(result.dependents, [])
})
