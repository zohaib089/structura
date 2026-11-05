import { describe, expect, it } from 'vitest'
import type { ReportFinding, ReportSeverity } from '../../src/api/scan-report-types'
import {
  SEVERITY_DESCENDING,
  compareFindingsBySeverity,
  severityRank,
  tallySeverities
} from '../../src/services/scan-report-severity'

function finding(id: string, severity: ReportSeverity, file = 'a.ts', line?: number): ReportFinding {
  return { id, section: 'violations', severity, file, line, message: id, provenance: 'EXTRACTED' }
}

describe('scan report severity', () => {
  it('ranks every severity distinctly, critical above high', () => {
    const ranks = SEVERITY_DESCENDING.map(severityRank)
    expect(new Set(ranks).size).toBe(SEVERITY_DESCENDING.length)
    expect(severityRank('critical')).toBeGreaterThan(severityRank('high'))
    expect([...ranks].sort((a, b) => b - a)).toEqual(ranks)
  })

  it('keeps critical and high in separate buckets when tallying', () => {
    const tally = tallySeverities([
      finding('1', 'critical'),
      finding('2', 'critical'),
      finding('3', 'high'),
      finding('4', 'low')
    ])
    expect(tally).toEqual({ critical: 2, high: 1, medium: 0, low: 1, info: 0 })
  })

  it('sorts most serious first, then by path and line', () => {
    const rows = [
      finding('h', 'high', 'b.ts'),
      finding('c2', 'critical', 'b.ts', 5),
      finding('c1', 'critical', 'a.ts', 9),
      finding('m', 'medium', 'a.ts')
    ].sort(compareFindingsBySeverity)
    expect(rows.map(row => row.id)).toEqual(['c1', 'c2', 'h', 'm'])
  })
})
