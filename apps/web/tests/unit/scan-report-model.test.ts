import { describe, expect, it, vi } from 'vitest'
import { buildReportFileTree, highestSeverity } from '../../src/services/scan-report-tree'
import type { ReportFinding } from '../../src/api/scan-report-types'
import {
  buildFilteredReportExport,
  defaultReportFilters,
  filterFindings
} from '../../src/services/scan-report-filters'
import { exportFilteredReportMarkdown } from '../../src/services/scan-report-export'

function finding(overrides: Partial<ReportFinding> = {}): ReportFinding {
  return {
    id: 'f-1',
    section: 'violations',
    severity: 'medium',
    file: 'src/app/main.ts',
    message: 'Example',
    provenance: 'EXTRACTED',
    ...overrides
  }
}

describe('scan report model helpers', () => {
  it('aggregates severity counts up the folder tree', () => {
    const root = buildReportFileTree([
      finding({ id: 'a', file: 'src/a.ts', severity: 'high' }),
      finding({ id: 'b', file: 'src/lib/b.ts', severity: 'low' })
    ])
    expect(root.counts.total).toBe(2)
    const srcFolder = root.children.find(node => node.name === 'src')
    expect(srcFolder?.counts.total).toBe(2)
    expect(highestSeverity(srcFolder?.counts ?? root.counts)).toBe('high')
  })

  it('applies severity and path filters consistently', () => {
    const filters = defaultReportFilters()
    filters.severities = new Set(['high'])
    filters.pathQuery = 'lib'
    const rows = filterFindings(
      [
        finding({ id: '1', file: 'src/lib/a.ts', severity: 'high' }),
        finding({ id: '2', file: 'src/app/a.ts', severity: 'high' }),
        finding({ id: '3', file: 'src/lib/a.ts', severity: 'low' })
      ],
      filters
    )
    expect(rows.map(row => row.id)).toEqual(['1'])
  })

  it('builds markdown export text for filtered findings', () => {
    const anchor = document.createElement('a')
    const click = vi.fn()
    anchor.click = click
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    exportFilteredReportMarkdown(
      buildFilteredReportExport(
        {
          schemaVersion: '1.0.0',
          generatedAt: '2026-11-02T12:00:00.000Z',
          analysers: {},
          history: null,
          findings: [finding({ id: 'x', message: 'Lint issue' })],
          improvements: []
        },
        defaultReportFilters()
      ),
      'scan-9'
    )

    expect(click).toHaveBeenCalled()
  })
})
