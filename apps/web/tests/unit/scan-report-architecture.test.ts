import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ScanReportArchitecturePanel from '../../src/components/dashboard/ScanReportArchitecturePanel.vue'
import { scanReportMessages } from '../../src/services/scan-report-messages'
import {
  architectureViolationCount,
  buildModuleDependencyEdges,
  buildModuleRows,
  graphHasArchitectureConfig,
  indexArchitectureFindings
} from '../../src/services/scan-report-architecture'
import { readGraph } from '../../src/viewer/read-graph'
import type { GraphDocument } from '../../src/viewer/graph-types'

const messages = scanReportMessages('en')

function architectureGraph(): GraphDocument {
  const nodes = [
    { id: 'dir:.', kind: 'directory', path: '.', label: '.' },
    { id: 'dir:src', kind: 'directory', path: 'src', label: 'src' },
    {
      id: 'file:src/a.ts',
      kind: 'file',
      path: 'src/a.ts',
      label: 'a.ts',
      language: 'typescript',
      lineCount: 2,
      parse: { status: 'parsed' },
      module: 'alpha'
    },
    {
      id: 'file:src/b.ts',
      kind: 'file',
      path: 'src/b.ts',
      label: 'b.ts',
      language: 'typescript',
      lineCount: 1,
      parse: { status: 'parsed' },
      module: 'beta'
    }
  ]
  const edges = [
    { source: 'dir:.', type: 'contains', target: 'dir:src', provenance: 'EXTRACTED' },
    { source: 'dir:src', type: 'contains', target: 'file:src/a.ts', provenance: 'EXTRACTED' },
    { source: 'dir:src', type: 'contains', target: 'file:src/b.ts', provenance: 'EXTRACTED' },
    {
      source: 'file:src/a.ts',
      type: 'imports',
      target: 'file:src/b.ts',
      provenance: 'EXTRACTED',
      span: { start: { line: 1, col: 1 }, end: { line: 1, col: 8 } },
      specifier: './b'
    }
  ]
  const parsed = readGraph(
    JSON.stringify({
      schemaVersion: '1.0.0',
      summary: { nodes: nodes.length, edges: edges.length, files: 2 },
      coverage: {
        files: { discovered: 2, parsed: 2, partial: 0, failed: 0, skipped: 0, ignored: 0 },
        byLanguage: [],
        skipped: [],
        ignored: [],
        unresolved: [],
        accounting: { discovered: 2, accounted: 2 }
      },
      nodes,
      edges,
      architecture: {
        config: 'structura.yaml',
        modules: [
          { name: 'alpha', paths: ['src/a.ts'] },
          { name: 'beta', paths: ['src/b.ts'] }
        ],
        unassigned: [],
        findings: [
          {
            from: 'alpha',
            to: 'beta',
            edgeKind: 'imports',
            file: 'src/a.ts',
            line: 1,
            rule: 'deny-undeclared',
            provenance: 'EXTRACTED'
          }
        ],
        summary: { violations: 1, unassignedFiles: 0 }
      }
    })
  )
  if (!parsed.ok) throw new Error('fixture graph invalid')
  return parsed.graph
}

describe('scan report architecture helpers', () => {
  it('parses architecture from graph.json via readGraph', () => {
    const graph = architectureGraph()
    if (!graphHasArchitectureConfig(graph)) throw new Error('expected architecture section')
    expect(architectureViolationCount(graph.architecture)).toBe(1)
    expect(buildModuleRows(graph, graph.architecture)[0]?.fileCount).toBe(1)
  })

  it('matches dependency edges to drift findings', () => {
    const graph = architectureGraph()
    if (!graphHasArchitectureConfig(graph)) throw new Error('expected architecture section')
    const keys = indexArchitectureFindings(graph.architecture.findings)
    expect(keys.size).toBe(1)
    const edges = buildModuleDependencyEdges(graph, graph.architecture)
    expect(edges.some(edge => edge.violating)).toBe(true)
    expect(edges.find(edge => edge.violating)?.ariaLabel).toContain('Architecture violation')
  })

  it('renders empty state when architecture is missing', () => {
    const sample = readGraph(readFileSync(resolve('fixtures/sample-graph.json'), 'utf8'))
    expect(sample.ok).toBe(true)
    const wrapper = mount(ScanReportArchitecturePanel, {
      props: { graph: sample.ok ? sample.graph : null, messages }
    })
    expect(wrapper.text()).toContain('No architecture rules configured')
  })

  it('renders module and finding rows when architecture is present', () => {
    const graph = architectureGraph()
    const wrapper = mount(ScanReportArchitecturePanel, {
      props: { graph, messages }
    })
    expect(wrapper.text()).toContain('alpha')
    expect(wrapper.text()).toContain('deny-undeclared')
    expect(wrapper.text()).toContain('src/a.ts:1')
  })
})
