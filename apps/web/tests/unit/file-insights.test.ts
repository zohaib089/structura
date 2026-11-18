import { describe, expect, it } from 'vitest'
import { buildFileInsights } from '../../src/viewer/file-insights'
import { readGraph } from '../../src/viewer/read-graph'

const span = (line: number) => ({ start: { line, col: 1 }, end: { line, col: 9 } })
const file = (path: string) => ({
  id: `file:${path}`, kind: 'file', path, label: path.split('/').pop(), language: 'typescript', lineCount: 80, parse: { status: 'parsed' }
})

/** Shapes copied from engine graph.json 1.1 output (calls edges, symbol scope/mutable/stateKind/parent/paramCount/docSummary). */
const graph11 = {
  schemaVersion: '1.1.0',
  summary: { nodes: 10, edges: 10, files: 2 },
  coverage: {
    files: { discovered: 2, parsed: 2, partial: 0, failed: 0, skipped: 0, ignored: 0 },
    byLanguage: [{ language: 'typescript', parsed: 2, partial: 0, failed: 0, skipped: 0 }],
    skipped: [], failed: [], ignored: [], unresolved: [], calls: { resolved: 5, unresolved: 1 },
    accounting: { discovered: 2, accounted: 2 }
  },
  nodes: [
    { id: 'dir:.', kind: 'directory', path: '.', label: '.' },
    file('src/a.ts'),
    file('src/b.ts'),
    { id: 'sym:src/a.ts#Cart', kind: 'symbol', file: 'file:src/a.ts', label: 'Cart', symbolKind: 'class', exported: true, span: span(20) },
    { id: 'sym:src/a.ts#Cart.items', kind: 'symbol', file: 'file:src/a.ts', label: 'items', symbolKind: 'variable', exported: false, span: span(21), parent: 'sym:src/a.ts#Cart', scope: 'class', mutable: true },
    { id: 'sym:src/a.ts#Cart.add', kind: 'symbol', file: 'file:src/a.ts', label: 'add', symbolKind: 'function', exported: false, span: span(22), parent: 'sym:src/a.ts#Cart', paramCount: 1 },
    { id: 'sym:src/a.ts#count', kind: 'symbol', file: 'file:src/a.ts', label: 'count', symbolKind: 'variable', exported: false, span: span(2), scope: 'module', mutable: false, stateKind: 'ref' },
    { id: 'sym:src/a.ts#total', kind: 'symbol', file: 'file:src/a.ts', label: 'total', symbolKind: 'function', exported: true, span: span(5), paramCount: 2, docSummary: 'Adds up the cart.' },
    { id: 'sym:src/a.ts#round', kind: 'symbol', file: 'file:src/a.ts', label: 'round', symbolKind: 'function', exported: false, span: span(12), paramCount: 0 },
    { id: 'sym:src/b.ts#format', kind: 'symbol', file: 'file:src/b.ts', label: 'format', symbolKind: 'function', exported: true, span: span(3), paramCount: 1 }
  ],
  edges: [
    { source: 'dir:.', type: 'contains', target: 'file:src/a.ts', provenance: 'EXTRACTED' },
    { source: 'dir:.', type: 'contains', target: 'file:src/b.ts', provenance: 'EXTRACTED' },
    { source: 'file:src/a.ts', type: 'calls', target: 'sym:src/a.ts#round', provenance: 'EXTRACTED', span: span(40) },
    { source: 'file:src/b.ts', type: 'calls', target: 'sym:src/a.ts#total', provenance: 'INFERRED', confidence: 0.8, reason: 'build-output-mapping', span: span(30) },
    { source: 'sym:src/a.ts#Cart.add', type: 'calls', target: 'sym:src/a.ts#total', provenance: 'EXTRACTED', span: span(23) },
    { source: 'sym:src/a.ts#total', type: 'calls', target: 'sym:src/a.ts#round', provenance: 'EXTRACTED', span: span(7) },
    { source: 'sym:src/a.ts#total', type: 'calls', target: 'sym:src/a.ts#round', provenance: 'EXTRACTED', span: span(8) },
    { source: 'sym:src/a.ts#total', type: 'calls', target: 'sym:src/b.ts#format', provenance: 'EXTRACTED', span: span(9) },
    // Recursion: a real 1.1 self-edge the reader must accept.
    { source: 'sym:src/b.ts#format', type: 'calls', target: 'sym:src/b.ts#format', provenance: 'EXTRACTED', span: span(5) },
    { source: 'sym:src/b.ts#format', type: 'calls', target: 'sym:src/a.ts#round', provenance: 'INFERRED', confidence: 0.8, reason: 'build-output-mapping', span: span(4) }
  ]
}

function read() {
  const result = readGraph(JSON.stringify(graph11))
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return result.graph
}

describe('graph.json 1.1 symbol fields', () => {
  it('keeps scope, mutable, stateKind, parent, paramCount and docSummary', () => {
    const nodes = new Map(read().nodes.map((node) => [node.id, node]))
    expect(nodes.get('sym:src/a.ts#count')).toMatchObject({ scope: 'module', mutable: false, stateKind: 'ref' })
    expect(nodes.get('sym:src/a.ts#Cart.add')).toMatchObject({ parent: 'sym:src/a.ts#Cart', paramCount: 1 })
    expect(nodes.get('sym:src/a.ts#total')).toMatchObject({ paramCount: 2, docSummary: 'Adds up the cart.' })
  })

  it('reports a wrong-shaped 1.1 field instead of trusting it', () => {
    const bad = structuredClone(graph11)
    ;(bad.nodes[6] as Record<string, unknown>).scope = 'everywhere'
    ;(bad.nodes[7] as Record<string, unknown>).paramCount = -1
    const result = readGraph(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok && result.error.code === 'invalid-graph') {
      expect(result.error.paths).toEqual(expect.arrayContaining(['/nodes/6/scope', '/nodes/7/paramCount']))
    }
  })
})

describe('buildFileInsights', () => {
  it('lists functions in source order with params, summary, calls and callers (same file first, likely marked)', () => {
    const insights = buildFileInsights(read(), 'file:src/a.ts')
    expect(insights.hasInsightData).toBe(true)
    expect(insights.functions.map((fn) => fn.label)).toEqual(['total', 'round', 'add'])
    const total = insights.functions[0]
    expect(total).toMatchObject({ paramCount: 2, docSummary: 'Adds up the cart.', exported: true, parentLabel: null })
    // Two call sites of round fold into one row; the cross-file callee comes after the same-file one.
    expect(total.calls.map((row) => [row.label, row.sameFile, row.count, row.line, row.path])).toEqual([
      ['round', true, 2, 12, 'src/a.ts'],
      ['format', false, 1, 3, 'src/b.ts']
    ])
    // Called by: the method in this file (at its call site), then top-level code of b.ts through an INFERRED edge.
    expect(total.calledBy.map((row) => [row.label, row.sameFile, row.likely, row.line, row.symbolId])).toEqual([
      ['add', true, false, 23, 'sym:src/a.ts#Cart.add'],
      ['b.ts', false, true, 30, null]
    ])
    const round = insights.functions[1]
    expect(round.calledBy.map((row) => [row.label, row.likely])).toEqual([['total', false], ['a.ts', false], ['format', true]])
    expect(insights.functions[2].parentLabel).toBe('Cart')
    expect(insights.topLevelCalls.map((row) => row.label)).toEqual(['round'])
  })

  it('splits state into local (class / object), module and global, keeping mutability and kind', () => {
    const { state } = buildFileInsights(read(), 'file:src/a.ts')
    expect(state.module).toEqual([expect.objectContaining({ label: 'count', mutable: false, stateKind: 'ref' })])
    expect(state.local).toEqual([expect.objectContaining({ label: 'items', mutable: true, stateKind: 'binding', parentLabel: 'Cart' })])
    expect(state.global).toEqual([])
  })

  it('says when a 1.0 graph carries no insight data', () => {
    const old = structuredClone(graph11)
    old.schemaVersion = '1.0.0'
    old.edges = old.edges.filter((edge) => edge.type !== 'calls')
    old.nodes = old.nodes.map((node) => {
      const { paramCount: _p, scope: _s, mutable: _m, stateKind: _k, docSummary: _d, parent: _parent, ...rest } = node as Record<string, unknown>
      return rest
    }) as typeof old.nodes
    const insights = buildFileInsights(JSON.parse(JSON.stringify(old)), 'file:src/a.ts')
    expect(insights.hasInsightData).toBe(false)
    expect(insights.functions.every((fn) => fn.paramCount === null && fn.calls.length === 0)).toBe(true)
  })
})
