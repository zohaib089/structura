import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GRAPH_STRING_MAX, JSON_MAX_ERRORS } from '../../src/viewer/caps'
import { readGraph } from '../../src/viewer/read-graph'

function coverage(files: number, skipped = 0) {
  const discovered = files + skipped
  return {
    files: { discovered, parsed: files, partial: 0, failed: 0, skipped, ignored: 0 },
    byLanguage: [],
    skipped: [],
    ignored: [],
    unresolved: [],
    accounting: { discovered, accounted: discovered }
  }
}

function document(nodes: unknown[], edges: unknown[] = [], extra: Record<string, unknown> = {}) {
  const files = nodes.filter((node) => (node as { kind?: string }).kind === 'file').length
  return JSON.stringify({
    schemaVersion: '1.0.0',
    summary: { nodes: nodes.length, edges: edges.length, files },
    coverage: coverage(files),
    nodes,
    edges,
    ...extra
  })
}

const root = { id: 'dir:.', kind: 'directory', path: '.', label: '.' }
const file = {
  id: 'file:src/app.ts',
  kind: 'file',
  path: 'src/app.ts',
  label: 'app.ts',
  language: 'typescript',
  lineCount: 20,
  parse: { status: 'parsed' }
}

describe('readGraph', () => {
  it('accepts the committed sample and a higher minor with an unknown kind', () => {
    const sample = readGraph(readFileSync(resolve('fixtures/sample-graph.json'), 'utf8'))
    expect(sample.ok).toBe(true)
    const raw = JSON.parse(document(
      [{ id: 'dir:.', kind: 'directory', path: '.', label: '.', extra: true }, { id: 'pkg:1', kind: 'package', label: 'pkg' }],
      [{ source: 'dir:.', type: 'contains', target: 'pkg:1', provenance: 'EXTRACTED' }]
    )) as { schemaVersion: string; nodes: { extra?: boolean }[] }
    raw.schemaVersion = '1.4.0'
    const result = readGraph(JSON.stringify(raw))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.graph.nodes[0]).not.toHaveProperty('extra')
      expect(result.graph.nodes.some((node) => node.kind === 'package')).toBe(true)
    }
  })

  it('refuses an unsupported major before reporting node errors', () => {
    const result = readGraph(document([{ id: 'nope' }], [], { schemaVersion: '2.0.0' }).replace('"1.0.0"', '"2.0.0"'))
    expect(result).toEqual({ ok: false, error: { code: 'unsupported-version', found: '2.0.0', supportedMajor: 1 } })
  })

  it('treats a missing or non-semver schemaVersion as a version error', () => {
    expect(readGraph('{"nodes":[]}').ok && false).toBe(false)
    const missing = readGraph('{"nodes":[]}')
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.error).toMatchObject({ code: 'unsupported-version', found: null })
    const numeric = readGraph('{"schemaVersion":1}')
    expect(numeric.ok).toBe(false)
    if (!numeric.ok && numeric.error.code === 'unsupported-version') expect(numeric.error.found).toBe('1')
  })

  it('rejects hostile keys, depth, and duplicate keys before the version check', () => {
    const proto = readGraph('{"__proto__":1,"schemaVersion":"9.0.0"}')
    expect(proto.ok).toBe(false)
    if (!proto.ok) expect(proto.error.code).toBe('invalid-graph')
    const escaped = readGraph('{"\\u005f_proto__":1}')
    expect(escaped.ok).toBe(false)
    if (!escaped.ok) expect(escaped.error.code).toBe('invalid-graph')
    let nested = '0'
    for (let depth = 0; depth < 65; depth += 1) nested = `{"a":${nested}}`
    const deep = readGraph(nested)
    expect(deep.ok).toBe(false)
    if (!deep.ok) expect(deep.error.code).toBe('invalid-graph')
    const duplicate = readGraph('{"schemaVersion":"1.0.0","schemaVersion":"2.0.0"}')
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) expect(duplicate.error.code).toBe('invalid-graph')
  })

  it('fails the whole load for span, provenance, cycle, and count errors', () => {
    const containsSpan = readGraph(document([root, file], [{
      source: 'dir:.', type: 'contains', target: 'file:src/app.ts', provenance: 'EXTRACTED', span: { start: { line: 1, col: 1 }, end: { line: 1, col: 2 } }
    }]))
    expect(containsSpan.ok).toBe(false)
    const missingSpan = readGraph(document([root, file], [{
      source: 'file:src/app.ts', type: 'imports', target: 'dir:.', provenance: 'EXTRACTED', specifier: './app'
    }]))
    expect(missingSpan.ok).toBe(false)
    const inferred = readGraph(document([root, file], [{
      source: 'file:src/app.ts', type: 'imports', target: 'dir:.', provenance: 'INFERRED', specifier: './app',
      span: { start: { line: 1, col: 1 }, end: { line: 1, col: 2 } }
    }]))
    expect(inferred.ok).toBe(false)
    const extractedConfidence = readGraph(document([root, file], [{
      source: 'file:src/app.ts', type: 'imports', target: 'dir:.', provenance: 'EXTRACTED', specifier: './app',
      confidence: 0.2, span: { start: { line: 1, col: 1 }, end: { line: 1, col: 2 } }
    }]))
    expect(extractedConfidence.ok).toBe(false)
    const zeroCol = readGraph(document([root, file], [{
      source: 'file:src/app.ts', type: 'imports', target: 'dir:.', provenance: 'EXTRACTED', specifier: './app',
      span: { start: { line: 1, col: 0 }, end: { line: 1, col: 1 } }
    }]))
    expect(zeroCol.ok).toBe(false)
    const negativeZero = readGraph(document([root, file], [{
      source: 'file:src/app.ts', type: 'imports', target: 'dir:.', provenance: 'EXTRACTED', specifier: './app',
      span: { start: { line: 1, col: 1 }, end: { line: 1, col: 2 } }
    }]).replace('"col":1', '"col":-0'))
    expect(negativeZero.ok).toBe(false)
    const cycle = readGraph(document(
      [root, { id: 'dir:a', kind: 'directory', path: 'a', label: 'a' }],
      [
        { source: 'dir:.', type: 'contains', target: 'dir:a', provenance: 'EXTRACTED' },
        { source: 'dir:a', type: 'contains', target: 'dir:.', provenance: 'EXTRACTED' }
      ]
    ))
    expect(cycle.ok).toBe(false)
    const self = readGraph(document([root], [{ source: 'dir:.', type: 'contains', target: 'dir:.', provenance: 'EXTRACTED' }]))
    expect(self.ok).toBe(false)
    const dangling = readGraph(document([root], [{ source: 'dir:.', type: 'contains', target: 'dir:missing', provenance: 'EXTRACTED' }]))
    expect(dangling.ok).toBe(false)
    const raw = JSON.parse(document([root])) as { summary: { nodes: number } }
    raw.summary.nodes = 9
    expect(readGraph(JSON.stringify(raw)).ok).toBe(false)
  })

  it('keeps an empty graph and rejects an over-long label and invalid JSON', () => {
    const empty = readGraph(document([]))
    expect(empty.ok).toBe(true)
    const long = { ...file, label: 'a'.repeat(GRAPH_STRING_MAX + 1) }
    expect(readGraph(document([root, long], [{ source: 'dir:.', type: 'contains', target: file.id, provenance: 'EXTRACTED' }])).ok).toBe(false)
    const broken = readGraph('{')
    expect(broken.ok).toBe(false)
    if (!broken.ok) expect(broken.error.code).toBe('invalid-json')
  })

  it('caps schema paths at 20 and accepts exponent integers after JSON.parse', () => {
    const nodes = [root]
    const edges = []
    for (let index = 0; index < 25; index += 1) {
      nodes.push({ id: `dir:../b${index}`, kind: 'directory', path: `../b${index}`, label: 'bad' })
      edges.push({ source: 'dir:.', type: 'contains', target: `dir:../b${index}`, provenance: 'EXTRACTED' })
    }
    const result = readGraph(document(nodes, edges))
    expect(result.ok).toBe(false)
    if (!result.ok && result.error.code === 'invalid-graph') expect(result.error.paths).toHaveLength(JSON_MAX_ERRORS)
    const exponent = document([root, { ...file, lineCount: 200 }], [{
      source: file.id,
      type: 'imports',
      target: root.id,
      provenance: 'EXTRACTED',
      specifier: './root',
      span: { start: { line: 1, col: 1 }, end: { line: 150, col: 2 } }
    }]).replace('"line":1', '"line":1e2')
    const accepted = readGraph(exponent)
    expect(accepted.ok).toBe(true)
  })

  it('defaults import fields and drops metadata that belongs outside the graph', () => {
    const span = { start: { line: 1, col: 1 }, end: { line: 1, col: 2 } }
    const omitted = readGraph(document([root, file], [{
      source: file.id, type: 'reexports', target: root.id, provenance: 'EXTRACTED', specifier: './root', span
    }]))
    expect(omitted.ok).toBe(true)
    if (omitted.ok) {
      const edge = omitted.graph.edges[0]
      expect(edge).toMatchObject({ type: 'reexports', importKind: 'static', typeOnly: false })
    }

    const explicit = readGraph(document([root, file], [{
      source: file.id, type: 'imports', target: root.id, provenance: 'EXTRACTED', specifier: './root',
      importKind: 'dynamic', typeOnly: true, span
    }]))
    expect(explicit.ok).toBe(true)
    if (explicit.ok) expect(explicit.graph.edges[0]).toMatchObject({ importKind: 'dynamic', typeOnly: true })

    const badKind = readGraph(document([root, file], [{
      source: file.id, type: 'imports', target: root.id, provenance: 'EXTRACTED', specifier: './root',
      importKind: 'eval', span
    }]))
    expect(badKind.ok).toBe(false)

    const badFlag = readGraph(document([root, file], [{
      source: file.id, type: 'imports', target: root.id, provenance: 'EXTRACTED', specifier: './root',
      typeOnly: 'false', span
    }]))
    expect(badFlag.ok).toBe(false)
    const writtenStatic = readGraph(document([root, file], [{
      source: file.id, type: 'imports', target: root.id, provenance: 'EXTRACTED', specifier: './root',
      importKind: 'static', span
    }]))
    expect(writtenStatic.ok).toBe(false)
    const writtenFalse = readGraph(document([root, file], [{
      source: file.id, type: 'imports', target: root.id, provenance: 'EXTRACTED', specifier: './root',
      typeOnly: false, span
    }]))
    expect(writtenFalse.ok).toBe(false)

    const stripped = JSON.parse(document([root, file], [{
      source: 'dir:.', type: 'contains', target: file.id, provenance: 'EXTRACTED', importKind: 'static', typeOnly: true
    }])) as { toolVersion?: string; generatedAt?: string; brand?: string; edges: { importKind?: string }[] }
    stripped.toolVersion = '9.9.9'
    stripped.generatedAt = '2026-01-01T00:00:00Z'
    stripped.brand = 'Atlasmith'
    const result = readGraph(JSON.stringify(stripped))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.graph).not.toHaveProperty('toolVersion')
      expect(result.graph).not.toHaveProperty('generatedAt')
      expect(result.graph).not.toHaveProperty('brand')
      expect(result.graph.edges[0]).not.toHaveProperty('importKind')
      expect(result.graph.edges[0]).not.toHaveProperty('typeOnly')
    }
  })

  it('loads the engine canary and keeps entryCandidate', () => {
    const result = readGraph(readFileSync(resolve('fixtures/v1.0.0.graph.json'), 'utf8'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const fileNode = result.graph.nodes.find((node) => node.id === 'file:src/app.ts')
    expect(fileNode).toMatchObject({
      kind: 'file',
      language: 'typescript',
      lineCount: 2,
      entryCandidate: { reason: 'conventional-name', provenance: 'INFERRED' }
    })
    const imported = result.graph.edges.find((edge) => edge.type === 'imports')
    expect(imported).toMatchObject({
      specifier: 'left-pad',
      importKind: 'static',
      typeOnly: false,
      provenance: 'EXTRACTED'
    })
    expect(result.graph.summary).toEqual({ nodes: 5, edges: 4, files: 1 })
  })
})
