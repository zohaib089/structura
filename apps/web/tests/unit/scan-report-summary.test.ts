import { describe, expect, it } from 'vitest'
import type { ReportFinding, ScanReportV1 } from '../../src/api/scan-report-types'
import {
  TOP_FINDINGS_LIMIT,
  buildReportSummary,
  computeCoverage
} from '../../src/services/scan-report-summary'
import type { GraphDocument } from '../../src/viewer/graph-types'
import { formatRelativeTime, shortScanId } from '../../src/services/scan-report-format'

function finding(id: string, overrides: Partial<ReportFinding> = {}): ReportFinding {
  return {
    id,
    section: 'violations',
    severity: 'medium',
    file: `src/${id}.ts`,
    message: id,
    provenance: 'EXTRACTED',
    ...overrides
  }
}

function report(overrides: Partial<ScanReportV1> = {}): ScanReportV1 {
  return {
    schemaVersion: '1.0.0',
    generatedAt: '2026-11-02T12:00:00.000Z',
    analysers: {},
    history: null,
    findings: [],
    improvements: [],
    ...overrides
  }
}

function graph(files: Partial<GraphDocument['coverage']['files']>, unresolved: Array<{ reason: string; count: number }> = []) {
  return {
    schemaVersion: '1.0.0',
    summary: { nodes: 0, edges: 0, files: 0 },
    coverage: {
      files: { discovered: 0, parsed: 0, partial: 0, failed: 0, skipped: 0, ignored: 0, ...files },
      byLanguage: [],
      skipped: [],
      ignored: [],
      unresolved,
      accounting: { discovered: 0, accounted: 0 }
    },
    nodes: [],
    edges: []
  } satisfies GraphDocument
}

describe('scan report summary', () => {
  it('computes file coverage from the graph, ignoring ignored files', () => {
    const coverage = computeCoverage(report(), graph({ discovered: 1390, parsed: 1200, partial: 84, ignored: 0 }))
    expect(coverage).toEqual({ percent: 92, analysed: 1284, total: 1390, basis: 'files' })

    const withIgnored = computeCoverage(report(), graph({ discovered: 120, parsed: 100, ignored: 20 }))
    expect(withIgnored?.percent).toBe(100)
    expect(withIgnored?.total).toBe(100)
  })

  it('falls back to analyser runs when there is no graph, and to null when there is no data', () => {
    const fallback = computeCoverage(
      report({
        analysers: {
          eslint: { status: 'ran', durationMs: 1 },
          semgrep: { status: 'failed', durationMs: 1 },
          swift: { status: 'skipped', durationMs: 0 }
        }
      }),
      null
    )
    expect(fallback).toEqual({ percent: 50, analysed: 1, total: 2, basis: 'checks' })
    expect(computeCoverage(report(), null)).toBeNull()
  })

  it('counts severities separately and orders top findings critical first', () => {
    const rows = [
      finding('a', { severity: 'high' }),
      finding('b', { severity: 'critical' }),
      finding('c', { severity: 'critical', file: 'aaa.ts' }),
      ...Array.from({ length: 6 }, (_, index) => finding(`low-${index}`, { severity: 'low' }))
    ]
    const summary = buildReportSummary(report({ findings: rows }), null)
    expect(summary.severity.critical).toBe(2)
    expect(summary.severity.high).toBe(1)
    expect(summary.totalFindings).toBe(9)
    expect(summary.topFindings).toHaveLength(TOP_FINDINGS_LIMIT)
    expect(summary.topFindings.map(row => row.id).slice(0, 3)).toEqual(['c', 'b', 'a'])
  })

  it('splits skipped analysers, failed checks and unresolved imports into secondary data', () => {
    const summary = buildReportSummary(
      report({
        analysers: {
          eslint: { status: 'ran', durationMs: 1 },
          'swift-modules': { status: 'skipped', durationMs: 0, reason: 'No Swift sources' },
          semgrep: { status: 'timeout', durationMs: 9 }
        }
      }),
      graph({ discovered: 10, parsed: 10 }, [
        { reason: 'protobuf import missing', count: 3 },
        { reason: 'none', count: 0 }
      ])
    )
    expect(summary.skippedAnalysers.map(row => row.name)).toEqual(['swift-modules'])
    expect(summary.problemAnalysers.map(row => row.name)).toEqual(['semgrep'])
    expect(summary.unresolved).toEqual([{ reason: 'protobuf import missing', count: 3 }])
    expect(summary.unresolvedTotal).toBe(3)
  })

  it('formats header meta without raw timestamps', () => {
    expect(shortScanId('0123456789abcdef')).toBe('01234567')
    const now = Date.parse('2026-11-05T12:00:00.000Z')
    expect(formatRelativeTime('2026-11-05T10:00:00.000Z', 'en', now)).toBe('2 hours ago')
    expect(formatRelativeTime('nonsense', 'en', now)).toBe('')
    expect(formatRelativeTime(null, 'en', now)).toBe('')
  })
})
