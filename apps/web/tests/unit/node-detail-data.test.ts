import { describe, expect, it } from 'vitest'
import { readGraph } from '../../src/viewer/read-graph'
import sampleGraph from '../../fixtures/sample-graph.json'
import {
  buildNodeDetailSections,
  directoryContents,
  exportedSymbolFallback,
  findingsForPath,
  importProvenanceLabel,
  symbolsForFile
} from '../../src/viewer/node-detail-data'
import { indexGraph } from '../../src/viewer/overview'

describe('node detail data helpers', () => {
  const parsed = readGraph(JSON.stringify(sampleGraph))
  if (!parsed.ok) throw new Error('fixture invalid')
  const index = indexGraph(parsed.graph)

  it('lists directory contents from contains edges', () => {
    const rows = directoryContents(index, 'dir:apps')
    expect(rows.map(row => row.label)).toEqual(['api', 'web'])
  })

  it('collects symbols for a file node', () => {
    const rows = symbolsForFile(index, 'file:apps/web/main.ts')
    expect(rows).toEqual([
      expect.objectContaining({ label: 'start', symbolKind: 'function', exported: true })
    ])
  })

  it('falls back to exported symbol names when summary is missing', () => {
    expect(exportedSymbolFallback(index, 'file:apps/web/main.ts')).toBe('Exports: start')
  })

  it('humanizes import provenance labels', () => {
    expect(importProvenanceLabel(parsed.graph, 'file:apps/web/main.ts')).toContain('found in source')
  })

  it('builds file sections with imports and export summary', () => {
    const sections = buildNodeDetailSections({
      index,
      nodeId: 'file:apps/web/main.ts',
      depth: 0,
      findings: [],
      apiSummary: null
    })
    expect(sections.summary).toBe('Exports: start')
    expect(sections.imports.some(row => row.label === 'brand.ts')).toBe(true)
    expect(sections.stats.depsOut).toBeGreaterThan(0)
  })

  it('filters findings by normalized path', () => {
    const findings = findingsForPath(
      [
        {
          id: 'f1',
          section: 'violations',
          severity: 'high',
          file: 'apps/web/main.ts',
          message: 'Issue',
          provenance: 'EXTRACTED'
        }
      ],
      'apps/web/main.ts'
    )
    expect(findings).toHaveLength(1)
  })
})
