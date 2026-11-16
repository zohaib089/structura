import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NodeDetail from '../../src/viewer/components/NodeDetail.vue'
import { viewerMessages } from '../../src/viewer/messages'
import { buildNodeDetailSections, symbolKindCounts, symbolKindGroup, symbolsForFile } from '../../src/viewer/node-detail-data'
import { indexGraph } from '../../src/viewer/overview'
import { readGraph } from '../../src/viewer/read-graph'
import sampleGraph from '../../fixtures/sample-graph.json'

const span = (line: number, col = 1) => ({ start: { line, col }, end: { line: line + 2, col: 2 } })
const fileNode = (path: string) => ({ id: `file:${path}`, kind: 'file', path, label: path.split('/').pop(), language: 'typescript', lineCount: 60, parse: { status: 'parsed' } })
const graph = {
  ...sampleGraph,
  nodes: [
    fileNode('src/a.ts'),
    fileNode('src/empty.ts'),
    { id: 'sym:src/a.ts#helper', kind: 'symbol', file: 'file:src/a.ts', label: 'helper', symbolKind: 'function', exported: false, span: span(30) },
    { id: 'sym:src/a.ts#Thing', kind: 'symbol', file: 'file:src/a.ts', label: 'Thing', symbolKind: 'class', exported: true, span: span(10) },
    { id: 'sym:src/a.ts#default', kind: 'symbol', file: 'file:src/a.ts', label: 'default', symbolKind: 'default', exported: true, span: span(50) },
    { id: 'sym:src/a.ts#odd', kind: 'symbol', file: 'file:src/a.ts', label: 'odd', symbolKind: 'unknown', exported: false, span: span(40, 3) },
    { id: 'sym:src/a.ts#run', kind: 'symbol', file: 'file:src/a.ts', label: 'run', symbolKind: 'function', exported: true, span: span(2) }
  ],
  edges: [] as unknown[]
}
graph.summary = { nodes: graph.nodes.length, edges: 0, files: 2 }

function loadIndex() {
  const parsed = readGraph(JSON.stringify(graph))
  if (!parsed.ok) throw new Error(`fixture invalid: ${JSON.stringify(parsed)}`)
  return indexGraph(parsed.graph)
}

describe('file panel symbols (data)', () => {
  it('groups kinds: default stays its own group, unknown and unrecognised kinds fold into other', () => {
    expect(symbolKindGroup('function')).toBe('function')
    expect(symbolKindGroup('default')).toBe('default')
    expect(symbolKindGroup('unknown')).toBe('other')
    expect(symbolKindGroup('something-new')).toBe('other')
    expect(symbolKindGroup('other')).toBe('other')
  })

  it('lists symbols in source order with start line/col and exported flag', () => {
    const rows = symbolsForFile(loadIndex(), 'file:src/a.ts')
    expect(rows.map(r => [r.label, r.line, r.col, r.kindGroup, r.exported])).toEqual([
      ['run', 2, 1, 'function', true],
      ['Thing', 10, 1, 'class', true],
      ['helper', 30, 1, 'function', false],
      ['odd', 40, 3, 'other', false],
      ['default', 50, 1, 'default', true]
    ])
  })

  it('counts by kind in a fixed order and skips empty kinds', () => {
    const rows = symbolsForFile(loadIndex(), 'file:src/a.ts')
    expect(symbolKindCounts(rows)).toEqual([
      { kind: 'function', count: 2 },
      { kind: 'class', count: 1 },
      { kind: 'default', count: 1 },
      { kind: 'other', count: 1 }
    ])
  })

  it('builds empty symbol sections for a file with no symbols', () => {
    const sections = buildNodeDetailSections({ index: loadIndex(), nodeId: 'file:src/empty.ts', depth: 0, findings: [] })
    expect(sections.symbols).toEqual([])
    expect(sections.symbolCounts).toEqual([])
  })
})

describe('file panel symbols (NodeDetail)', () => {
  const m = viewerMessages('en')
  function mountDetail(nodeId: string, canOpenSymbols: boolean) {
    const sections = buildNodeDetailSections({ index: loadIndex(), nodeId, depth: 0, findings: [] })
    const strings = new Proxy({}, { get: (_t, key) => String(key) }) as Record<string, string>
    const props = {
      ...Object.fromEntries(['empty', 'panelHint', 'kindLabel', 'pathLabel', 'spanLabel', 'provenanceLabel', 'confidenceLabel', 'reasonLabel', 'internalLabel', 'weightLabel', 'importKindLabel', 'typeOnlyLabel', 'focusLabel', 'recentreLabel', 'focusTooltip', 'recentreTooltip', 'depthLabel', 'depthTooltip', 'depsOutLabel', 'depsInLabel', 'findingsLabel', 'findingsSectionLabel', 'purposeLabel', 'importsLabel', 'importersLabel', 'contentsLabel', 'expandContentsLabel', 'expandTooltip', 'noFindingsLabel', 'noFindingsNeedScan', 'noIssuesStat', 'summaryLoading', 'summaryError', 'summaryRetry', 'summaryEmpty', 'emptyImports', 'emptyImporters', 'emptyContents', 'openDetailsLabel', 'kindTagFolder', 'kindTagFile'].map(k => [k, strings[k]])),
      symbolsLabel: m.symbolsLabel,
      emptySymbols: m.emptySymbols,
      symbolExportTag: m.symbolExportTag,
      symbolExportTooltip: m.symbolExportTooltip,
      symbolsHint: canOpenSymbols ? m.symbolsHintOpen : m.symbolsHint,
      symbolLine: m.symbolLine,
      symbolOpenTooltip: m.symbolOpenTooltip,
      symbolKindLabels: m.symbolKindLabels,
      symbolKindCountLabels: m.symbolKindCountLabels,
      showAllSymbolsLabel: m.showAllSymbols,
      canOpenSymbols,
      hasScanReport: false,
      summaryState: 'none' as const,
      severityLabel: (s: string) => s,
      detail: { title: nodeId, kind: 'file', path: nodeId.slice(5), span: '', provenance: '', confidence: '', reason: '', internal: '', weight: '', importKind: '', typeOnly: '' },
      sections,
      findings: []
    }
    return mount(NodeDetail, { props: props as never })
  }

  it('shows counts, plain kind labels, exported tags and lines', () => {
    const w = mountDetail('file:src/a.ts', false)
    expect(w.get('[data-testid="symbol-counts"]').text()).toBe('2 functions1 class1 default export1 other')
    const rows = w.findAll('[data-testid="symbol-list"] li')
    expect(rows).toHaveLength(5)
    expect(rows[0]!.text()).toContain('run')
    expect(rows[0]!.text()).toContain('Function')
    expect(rows[0]!.text()).toContain('Exported')
    expect(rows[0]!.text()).toContain('line 2')
    expect(rows[2]!.text()).not.toContain('Exported')
    expect(rows[3]!.text()).toContain('Other')
    expect(rows[4]!.text()).toContain('Default export')
    expect(w.text()).toContain(m.symbolsHint)
    // Web viewer: rows are read-only (no editor to open).
    expect(w.find('[data-testid="symbol-list"] button').exists()).toBe(false)
  })

  it('emits openSymbol with the row (start line) when the host can open files', async () => {
    const w = mountDetail('file:src/a.ts', true)
    const buttons = w.findAll('[data-testid="symbol-list"] button')
    expect(buttons).toHaveLength(5)
    expect(buttons[1]!.attributes('aria-label')).toBe('Open Thing at line 10')
    await buttons[1]!.trigger('click')
    const emitted = w.emitted('openSymbol') as Array<[{ id: string; line: number }]>
    expect(emitted[0]![0]).toMatchObject({ id: 'sym:src/a.ts#Thing', line: 10 })
    expect(w.text()).toContain(m.symbolsHintOpen)
  })

  it('shows a plain empty state for a file with no symbols', () => {
    const w = mountDetail('file:src/empty.ts', true)
    expect(w.get('[data-testid="symbols-empty"]').text()).toBe(m.emptySymbols)
    expect(w.find('[data-testid="symbol-counts"]').exists()).toBe(false)
  })
})
