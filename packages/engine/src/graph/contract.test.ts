import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { GraphBuilder } from './builder.js'
import { serializeGraph } from './canonical.js'
import { GraphReadError, GraphVersionUnsupported } from './errors.js'
import { CANARY_GRAPH_PATH, CANARY_V110_GRAPH_PATH, CANARY_V120_GRAPH_PATH, CANARY_V130_GRAPH_PATH, CANARY_V140_GRAPH_PATH, hashSchemaDocument, readCheckedInSchema, readCheckedInSchemaHash, schemaDocumentText } from './hash.js'
import { attachHotspots } from './hotspots.js'
import { attachQuality } from './quality.js'
import { attachDuplicates } from './duplicates.js'
import { readGraph } from './read.js'
import { validateStrict } from './validate-strict.js'
import {
  EDGE_TYPES,
  ENTRY_REASONS,
  FAIL_REASONS,
  GRAPH_SCHEMA_VERSION,
  INFERRED_REASONS,
  LANGUAGES,
  NODE_KINDS,
  PARTIAL_REASONS,
  SKIP_REASONS,
  STATE_KINDS,
  STATE_SCOPES,
  SYMBOL_KINDS,
  UNRESOLVED_REASONS,
  type Graph
} from './types.js'

function emptyCoverage(discovered = 0, parsed = 0): Graph['coverage'] {
  return {
    files: { discovered, parsed, partial: 0, failed: 0, skipped: 0, ignored: discovered - parsed },
    byLanguage: parsed === 0 ? [] : [{ language: 'typescript', parsed, partial: 0, failed: 0, skipped: 0 }],
    skipped: [],
    failed: [],
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
    entryCandidate: { reason: 'conventional-name', provenance: 'INFERRED' },
    entryCandidates: [{
      reason: 'conventional-name',
      evidence: { source: 'src/app.ts', pointer: 'src/app.ts#/conventional' },
      confidence: 0.65
    }]
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
  return builder.build(coverage, { files: 1, candidates: 1 })
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

test('frozen 1.0.0 canary round-trips byte for byte', () => {
  const frozen = readFileSync(CANARY_GRAPH_PATH, 'utf8')
  const asV10 = canary()
  asV10.schemaVersion = '1.0.0'
  assert.equal(serializeGraph(asV10), frozen)
  const loaded = readGraph(frozen)
  assert.equal(loaded.version, '1.0.0')
  assert.equal(loaded.newerMinor, false)
  assert.equal(serializeGraph(loaded.graph), frozen)
  assert.equal(validateStrict(loaded.graph).ok, true)
})

test('a greater major is refused and a newer minor is accepted with unknown data stripped', () => {
  const future = serializeGraph(canary()).replace(`"schemaVersion": "${GRAPH_SCHEMA_VERSION}"`, '"schemaVersion": "2.0.0"')
  assert.throws(() => readGraph(future), (error: unknown) => error instanceof GraphVersionUnsupported && error.foundVersion === '2.0.0')

  const parsed = JSON.parse(serializeGraph(canary())) as Graph & { summary: { extra?: boolean } }
  parsed.schemaVersion = '1.6.0'
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
  if (!edge || edge.type !== 'imports') throw new Error('missing import edge')
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
    ...NODE_KINDS, ...EDGE_TYPES, ...LANGUAGES, ...SYMBOL_KINDS, ...STATE_SCOPES, ...STATE_KINDS,
    ...SKIP_REASONS, ...FAIL_REASONS, ...PARTIAL_REASONS, ...UNRESOLVED_REASONS, ...INFERRED_REASONS,
    ...ENTRY_REASONS, 'EXTRACTED', 'INFERRED', 'docSummary', 'paramCount'
  ]) {
    assert.ok(doc.includes(value), value)
  }
})


function canaryV11(): Graph {
  const builder = new GraphBuilder()
  builder.addNode({ id: 'dir:.', kind: 'directory', path: '.', label: '.' })
  builder.addNode({ id: 'dir:src', kind: 'directory', path: 'src', label: 'src' })
  builder.addNode({
    id: 'file:src/app.ts',
    kind: 'file',
    path: 'src/app.ts',
    label: 'app.ts',
    language: 'typescript',
    lineCount: 20,
    parse: { status: 'parsed' },
    docSummary: 'Application entry.'
  })
  builder.addNode({
    id: 'file:src/lib.ts',
    kind: 'file',
    path: 'src/lib.ts',
    label: 'lib.ts',
    language: 'typescript',
    lineCount: 8,
    parse: { status: 'parsed' }
  })
  builder.addNode({
    id: 'sym:src/app.ts#Greeter',
    kind: 'symbol',
    file: 'file:src/app.ts',
    label: 'Greeter',
    symbolKind: 'class',
    exported: true,
    span: { start: { line: 3, col: 1 }, end: { line: 12, col: 2 } },
    docSummary: 'Greets a caller by name.'
  })
  builder.addNode({
    id: 'sym:src/app.ts#Greeter.hello',
    kind: 'symbol',
    file: 'file:src/app.ts',
    label: 'hello',
    symbolKind: 'function',
    exported: true,
    span: { start: { line: 4, col: 3 }, end: { line: 8, col: 4 } },
    parent: 'sym:src/app.ts#Greeter',
    paramCount: 1,
    docSummary: 'Returns a greeting.'
  })
  builder.addNode({
    id: 'sym:src/app.ts#format',
    kind: 'symbol',
    file: 'file:src/app.ts',
    label: 'format',
    symbolKind: 'function',
    exported: false,
    span: { start: { line: 14, col: 1 }, end: { line: 16, col: 2 } },
    paramCount: 1
  })
  builder.addNode({
    id: 'sym:src/app.ts#count',
    kind: 'symbol',
    file: 'file:src/app.ts',
    label: 'count',
    symbolKind: 'variable',
    exported: false,
    span: { start: { line: 1, col: 1 }, end: { line: 1, col: 15 } },
    scope: 'module',
    mutable: true
  })
  builder.addNode({
    id: 'sym:src/lib.ts#helper',
    kind: 'symbol',
    file: 'file:src/lib.ts',
    label: 'helper',
    symbolKind: 'function',
    exported: true,
    span: { start: { line: 1, col: 1 }, end: { line: 3, col: 2 } },
    paramCount: 0
  })
  builder.addEdge({ source: 'dir:.', type: 'contains', target: 'dir:src', provenance: 'EXTRACTED' })
  builder.addEdge({ source: 'dir:src', type: 'contains', target: 'file:src/app.ts', provenance: 'EXTRACTED' })
  builder.addEdge({ source: 'dir:src', type: 'contains', target: 'file:src/lib.ts', provenance: 'EXTRACTED' })
  builder.addEdge({ source: 'file:src/app.ts', type: 'contains', target: 'sym:src/app.ts#Greeter', provenance: 'EXTRACTED' })
  builder.addEdge({ source: 'sym:src/app.ts#Greeter', type: 'contains', target: 'sym:src/app.ts#Greeter.hello', provenance: 'EXTRACTED' })
  builder.addEdge({ source: 'file:src/app.ts', type: 'contains', target: 'sym:src/app.ts#format', provenance: 'EXTRACTED' })
  builder.addEdge({ source: 'file:src/app.ts', type: 'contains', target: 'sym:src/app.ts#count', provenance: 'EXTRACTED' })
  builder.addEdge({ source: 'file:src/lib.ts', type: 'contains', target: 'sym:src/lib.ts#helper', provenance: 'EXTRACTED' })
  builder.addEdge({
    source: 'file:src/app.ts',
    type: 'imports',
    target: 'file:src/lib.ts',
    provenance: 'INFERRED',
    confidence: 0.7,
    reason: 'src-subpath',
    span: { start: { line: 2, col: 1 }, end: { line: 2, col: 30 } },
    specifier: './lib'
  })
  builder.addEdge({
    source: 'sym:src/app.ts#Greeter.hello',
    type: 'calls',
    target: 'sym:src/app.ts#format',
    provenance: 'EXTRACTED',
    span: { start: { line: 6, col: 5 }, end: { line: 6, col: 16 } }
  })
  builder.addEdge({
    source: 'sym:src/app.ts#Greeter.hello',
    type: 'calls',
    target: 'sym:src/lib.ts#helper',
    provenance: 'INFERRED',
    confidence: 0.7,
    reason: 'src-subpath',
    span: { start: { line: 7, col: 5 }, end: { line: 7, col: 13 } }
  })
  const coverage = emptyCoverage(2, 2)
  coverage.files.ignored = 0
  coverage.calls = { resolved: 2, unresolved: 1 }
  return { ...builder.build(coverage), schemaVersion: '1.1.0' }
}

function canaryV12(): Graph {
  return attachHotspots({ ...canaryV11(), schemaVersion: '1.2.0' })
}

function canaryV13(): Graph {
  return attachQuality({ ...canaryV12(), schemaVersion: '1.3.0' })
}

function canaryV14(): Graph {
  return attachDuplicates({ ...canaryV13(), schemaVersion: '1.4.0' }, [])
}

test('v1.1.0 fixture is stable, ordered, and accepted by a 1.1.0 reader', () => {
  const frozen = readFileSync(CANARY_V110_GRAPH_PATH, 'utf8')
  const first = serializeGraph(canaryV11())
  assert.equal(first, frozen)
  assert.equal(serializeGraph(JSON.parse(first) as Graph), first)
  const loaded = readGraph(frozen)
  assert.equal(loaded.version, '1.1.0')
  assert.equal(loaded.newerMinor, false)
  assert.equal(serializeGraph(loaded.graph), frozen)
  const strict = validateStrict(JSON.parse(frozen))
  assert.equal(strict.ok, true, strict.issues.map(issue => `${issue.path} ${issue.message}`).join('; '))

  const file = loaded.graph.nodes.find(node => node.id === 'file:src/app.ts')
  const hello = loaded.graph.nodes.find(node => node.id === 'sym:src/app.ts#Greeter.hello')
  const count = loaded.graph.nodes.find(node => node.id === 'sym:src/app.ts#count')
  if (!file || file.kind !== 'file' || !hello || hello.kind !== 'symbol' || !count || count.kind !== 'symbol') {
    throw new Error('missing v1.1.0 fixture nodes')
  }
  assert.deepEqual(Object.keys(file), ['id', 'kind', 'path', 'label', 'language', 'lineCount', 'parse', 'docSummary'])
  assert.deepEqual(Object.keys(hello), ['id', 'kind', 'file', 'label', 'symbolKind', 'exported', 'span', 'parent', 'paramCount', 'docSummary'])
  assert.deepEqual(Object.keys(count), ['id', 'kind', 'file', 'label', 'symbolKind', 'exported', 'span', 'scope', 'mutable'])
  assert.deepEqual(Object.keys(loaded.graph.coverage), ['files', 'byLanguage', 'skipped', 'failed', 'ignored', 'unresolved', 'calls', 'accounting'])
  const types = loaded.graph.edges.map(edge => edge.type)
  assert.equal(types.includes('calls'), true)
  const inferredCall = loaded.graph.edges.find(edge => edge.type === 'calls' && edge.provenance === 'INFERRED')
  const extractedCall = loaded.graph.edges.find(edge => edge.type === 'calls' && edge.provenance === 'EXTRACTED')
  assert.equal(extractedCall?.target, 'sym:src/app.ts#format')
  assert.equal(inferredCall && 'reason' in inferredCall ? inferredCall.reason : undefined, 'src-subpath')
})

test('readGraph accepts the 1.0.0 canary and the 1.1.0, 1.2.0, 1.3.0, and 1.4.0 fixtures', () => {
  const v10 = readGraph(readFileSync(CANARY_GRAPH_PATH, 'utf8'))
  const v11 = readGraph(readFileSync(CANARY_V110_GRAPH_PATH, 'utf8'))
  const v12 = readGraph(readFileSync(CANARY_V120_GRAPH_PATH, 'utf8'))
  const v13 = readGraph(readFileSync(CANARY_V130_GRAPH_PATH, 'utf8'))
  const v14 = readGraph(readFileSync(CANARY_V140_GRAPH_PATH, 'utf8'))
  assert.equal(v10.version, '1.0.0')
  assert.equal(v10.newerMinor, false)
  assert.equal(v11.version, '1.1.0')
  assert.equal(v11.newerMinor, false)
  assert.equal(v12.version, '1.2.0')
  assert.equal(v12.newerMinor, false)
  assert.equal(v13.version, '1.3.0')
  assert.equal(v13.newerMinor, false)
  assert.equal(v14.version, '1.4.0')
  assert.equal(v14.newerMinor, false)
})

test('v1.2.0 fixture is stable, ordered, and accepted by a 1.2.0 reader', () => {
  const frozen = readFileSync(CANARY_V120_GRAPH_PATH, 'utf8')
  const first = serializeGraph(canaryV12())
  assert.equal(first, frozen)
  assert.equal(serializeGraph(JSON.parse(first) as Graph), first)
  const loaded = readGraph(frozen)
  assert.equal(loaded.version, '1.2.0')
  assert.equal(loaded.newerMinor, false)
  assert.equal(serializeGraph(loaded.graph), frozen)
  const strict = validateStrict(JSON.parse(frozen))
  assert.equal(strict.ok, true, strict.issues.map(issue => `${issue.path} ${issue.message}`).join('; '))
  assert.ok((loaded.graph.hotspots?.length ?? 0) > 0)
  const file = loaded.graph.nodes.find(node => node.id === 'file:src/app.ts')
  if (!file || file.kind !== 'file') throw new Error('missing v1.2.0 file node')
  assert.equal(typeof file.hotspot?.score, 'number')
  assert.deepEqual(Object.keys(loaded.graph.hotspots?.[0] ?? {}), ['path', 'score', 'why'])
})

test('v1.3.0 fixture is stable, ordered, and accepted by a 1.3.0 reader', () => {
  const frozen = readFileSync(CANARY_V130_GRAPH_PATH, 'utf8')
  const first = serializeGraph(canaryV13())
  assert.equal(first, frozen)
  assert.equal(serializeGraph(JSON.parse(first) as Graph), first)
  const loaded = readGraph(frozen)
  assert.equal(loaded.version, '1.3.0')
  assert.equal(loaded.newerMinor, false)
  assert.equal(serializeGraph(loaded.graph), frozen)
  const strict = validateStrict(JSON.parse(frozen))
  assert.equal(strict.ok, true, strict.issues.map(issue => `${issue.path} ${issue.message}`).join('; '))
  assert.equal(typeof loaded.graph.quality?.project.score, 'number')
  assert.equal(typeof loaded.graph.quality?.project.grade, 'string')
  assert.ok((loaded.graph.quality?.project.breakdown.length ?? 0) === 5)
})

test('v1.4.0 fixture is stable, ordered, and accepted by a 1.4.0 reader', () => {
  const frozen = readFileSync(CANARY_V140_GRAPH_PATH, 'utf8')
  const first = serializeGraph(canaryV14())
  assert.equal(first, frozen)
  assert.equal(serializeGraph(JSON.parse(first) as Graph), first)
  const loaded = readGraph(frozen)
  assert.equal(loaded.version, '1.4.0')
  assert.equal(loaded.newerMinor, false)
  assert.equal(serializeGraph(loaded.graph), frozen)
  const strict = validateStrict(JSON.parse(frozen))
  assert.equal(strict.ok, true, strict.issues.map(issue => `${issue.path} ${issue.message}`).join('; '))
  assert.equal(typeof loaded.graph.quality?.project.score, 'number')
  // The canary sources are too small to form a duplicate group; the field stays omitted.
  assert.equal(loaded.graph.duplicates, undefined)
})

test('v1.1.0 closed objects reject extra keys and reserved or overlong values', () => {
  const parsed = JSON.parse(serializeGraph(canaryV11())) as {
    nodes: Array<Record<string, unknown>>
    edges: Array<Record<string, unknown>>
    coverage: Record<string, unknown>
  }
  const call = parsed.edges.find(item => item.type === 'calls' && item.provenance === 'EXTRACTED')
  if (!call) throw new Error('missing extracted call')
  call.specifier = './nope'
  assert.equal(validateStrict(parsed).ok, false)
  delete call.specifier

  const inferred = parsed.edges.find(item => item.type === 'calls' && item.provenance === 'INFERRED')
  if (!inferred) throw new Error('missing inferred call')
  delete inferred.reason
  assert.equal(validateStrict(parsed).ok, false)
  inferred.reason = 'src-subpath'

  const count = parsed.nodes.find(item => item.id === 'sym:src/app.ts#count')
  if (!count) throw new Error('missing count symbol')
  count.scope = 'local'
  assert.equal(validateStrict(parsed).ok, false)
  count.scope = 'module'

  const file = parsed.nodes.find(item => item.id === 'file:src/app.ts')
  if (!file) throw new Error('missing file')
  file.docSummary = 'x'.repeat(161)
  assert.equal(validateStrict(parsed).ok, false)
  file.docSummary = 'Application entry.'

  const calls = parsed.coverage.calls as Record<string, unknown>
  calls.extra = 1
  assert.equal(validateStrict(parsed).ok, false)
  delete calls.extra
  assert.equal(validateStrict(parsed).ok, true)
})
