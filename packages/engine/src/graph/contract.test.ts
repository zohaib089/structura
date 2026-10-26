import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { GraphBuilder } from './builder.js'
import { serializeGraph } from './canonical.js'
import { GraphReadError, GraphVersionUnsupported } from './errors.js'
import { CANARY_GRAPH_PATH, hashSchemaDocument, readCheckedInSchema, readCheckedInSchemaHash, schemaDocumentText } from './hash.js'
import { readGraph } from './read.js'
import { validateStrict } from './validate-strict.js'
import {
  EDGE_TYPES,
  ENTRY_REASONS,
  FAIL_REASONS,
  INFERRED_REASONS,
  LANGUAGES,
  NODE_KINDS,
  PARTIAL_REASONS,
  SKIP_REASONS,
  SYMBOL_KINDS,
  UNRESOLVED_REASONS,
  type Graph
} from './types.js'

function emptyCoverage(discovered = 0, parsed = 0): Graph['coverage'] {
  return {
    files: { discovered, parsed, partial: 0, failed: 0, skipped: 0, ignored: discovered - parsed },
    byLanguage: parsed === 0 ? [] : [{ language: 'typescript', parsed, partial: 0, failed: 0, skipped: 0 }],
    skipped: [],
    ignored: [],
    unresolved: [],
    accounting: { discovered, accounted: discovered }
  }
}

function canary(): Graph {
  const builder = new GraphBuilder()
  builder.addNode({ id: 'dir:.', kind: 'directory', path: '.', label: '.' })
  builder.addNode({ id: 'dir:src', kind: 'directory', path: 'src', label: 'src' })
  builder.addNode({
    id: 'file:src/app.ts',
    kind: 'file',
    path: 'src/app.ts',
    label: 'app.ts',
    language: 'typescript',
    lineCount: 2,
    parse: { status: 'parsed' },
    entryCandidate: { reason: 'conventional-name', provenance: 'INFERRED' }
  })
  builder.addNode({
    id: 'sym:src/app.ts#main',
    kind: 'symbol',
    file: 'file:src/app.ts',
    label: 'main',
    symbolKind: 'function',
    exported: true,
    span: { start: { line: 2, col: 1 }, end: { line: 2, col: 28 } }
  })
  builder.addNode({ id: 'ext:npm:left-pad', kind: 'external', ecosystem: 'npm', label: 'left-pad' })
  builder.addEdge({ source: 'dir:.', type: 'contains', target: 'dir:src', provenance: 'EXTRACTED' })
  builder.addEdge({ source: 'dir:src', type: 'contains', target: 'file:src/app.ts', provenance: 'EXTRACTED' })
  builder.addEdge({ source: 'file:src/app.ts', type: 'contains', target: 'sym:src/app.ts#main', provenance: 'EXTRACTED' })
  builder.addEdge({
    source: 'file:src/app.ts',
    type: 'imports',
    target: 'ext:npm:left-pad',
    provenance: 'EXTRACTED',
    span: { start: { line: 1, col: 1 }, end: { line: 1, col: 34 } },
    specifier: 'left-pad'
  })
  const coverage = emptyCoverage(1, 1)
  coverage.files.ignored = 0
  coverage.files.discovered = 1
  coverage.accounting = { discovered: 1, accounted: 1 }
  return builder.build(coverage)
}

test('checked-in schema and SCHEMA_HASH match the builder', () => {
  const text = schemaDocumentText()
  assert.equal(readCheckedInSchema(), text)
  assert.equal(readCheckedInSchemaHash(), hashSchemaDocument(text))
  assert.match(text, /"\$id": "urn:repo-graph:schema:graph:1"/)
  assert.equal(text.endsWith('\n'), true)
  assert.equal(text.includes('\r'), false)
})

test('canonical writer is stable, ordered, and has a single trailing newline', () => {
  const graph = canary()
  const first = serializeGraph(graph)
  const second = serializeGraph(JSON.parse(first) as Graph)
  assert.equal(first, second)
  assert.equal(first.endsWith('}\n'), true)
  assert.equal(first.charCodeAt(0), 123)
  assert.equal(first.includes('\r'), false)
  const keys = Object.keys(JSON.parse(first) as object)
  assert.deepEqual(keys, ['schemaVersion', 'summary', 'coverage', 'nodes', 'edges'])
  const nodes = (JSON.parse(first) as Graph).nodes.map(node => node.id)
  assert.deepEqual(nodes, [...nodes].sort())
  const strict = validateStrict(JSON.parse(first))
  assert.equal(strict.ok, true, strict.issues.map(issue => `${issue.path} ${issue.message}`).join('; '))
})

test('frozen canary round-trips byte for byte', () => {
  const frozen = readFileSync(CANARY_GRAPH_PATH, 'utf8')
  assert.equal(serializeGraph(canary()), frozen)
  const loaded = readGraph(frozen)
  assert.equal(loaded.version, '1.0.0')
  assert.equal(loaded.newerMinor, false)
  assert.equal(serializeGraph(loaded.graph), frozen)
  assert.equal(validateStrict(loaded.graph).ok, true)
})

test('a greater major is refused and a newer minor is accepted with unknown data stripped', () => {
  const future = serializeGraph(canary()).replace('"schemaVersion": "1.0.0"', '"schemaVersion": "2.0.0"')
  assert.throws(() => readGraph(future), (error: unknown) => error instanceof GraphVersionUnsupported && error.foundVersion === '2.0.0')

  const parsed = JSON.parse(serializeGraph(canary())) as Graph & { summary: { extra?: boolean } }
  parsed.schemaVersion = '1.1.0'
  parsed.summary.extra = true
  parsed.nodes.push({ id: 'custom:1', kind: 'widget' } as unknown as Graph['nodes'][number])
  parsed.summary.nodes += 1
  const loaded = readGraph(JSON.stringify(parsed))
  assert.equal(loaded.newerMinor, true)
  assert.equal('extra' in (loaded.graph.summary as object), false)
  assert.equal(loaded.graph.nodes.some(node => (node as { kind: string }).kind === 'widget'), true)
})

test('rejects prototype keys, excessive depth, duplicates and defaulted edge flags', () => {
  assert.throws(() => readGraph('{"schemaVersion":"1.0.0","__proto__":{"x":1}}'), GraphReadError)
  assert.throws(() => readGraph(`${'['.repeat(65)}${']'.repeat(65)}`), /deeper than 64/)

  const broken = JSON.parse(serializeGraph(canary())) as Graph
  broken.nodes.push(broken.nodes[0] as Graph['nodes'][number])
  broken.summary.nodes += 1
  const duplicate = readGraphSafe(JSON.stringify(broken))
  assert.equal(duplicate?.code, 'GraphInvalid')

  const flagged = JSON.parse(serializeGraph(canary())) as Graph
  const edge = flagged.edges.find(item => item.type === 'imports')
  if (!edge || !('span' in edge)) throw new Error('missing import edge')
  edge.importKind = 'static'
  const result = validateStrict(flagged)
  assert.equal(result.ok, false)

  const extracted = JSON.parse(serializeGraph(canary())) as { edges: Array<Record<string, unknown>> }
  const ref = extracted.edges.find(item => item.type === 'imports')
  if (!ref) throw new Error('missing edge')
  ref.confidence = 1
  assert.equal(readGraphSafe(JSON.stringify(extracted))?.code, 'GraphInvalid')
})

function readGraphSafe(text: string): GraphReadError | undefined {
  try {
    readGraph(text)
    return undefined
  } catch (error) {
    if (error instanceof GraphReadError) return error
    throw error
  }
}

test('the contract document names every settled vocabulary value', () => {
  const doc = readFileSync(fileURLToPath(new URL('../../docs/graph-json-v1.md', import.meta.url)), 'utf8')
  for (const value of [
    ...NODE_KINDS, ...EDGE_TYPES, ...LANGUAGES, ...SYMBOL_KINDS, ...SKIP_REASONS, ...FAIL_REASONS,
    ...PARTIAL_REASONS, ...UNRESOLVED_REASONS, ...INFERRED_REASONS, ...ENTRY_REASONS, 'EXTRACTED', 'INFERRED'
  ]) {
    assert.ok(doc.includes(value), value)
  }
})
