import { describe, expect, it } from 'vitest'
import type { ReportFinding } from '../../src/api/scan-report-types'
import { resolveGraphFindings, resolvePathSeverityCounts } from '../../src/viewer/project-findings'

const sample: ReportFinding[] = [
  {
    id: 'f1',
    section: 'violations',
    severity: 'high',
    file: 'src/main.ts',
    message: 'example',
    provenance: 'EXTRACTED'
  }
]

describe('resolveGraphFindings', () => {
  it('prefers findings passed from a report page', () => {
    expect(resolveGraphFindings({ passedFindings: sample, fetchedFindings: [] })).toEqual(sample)
  })

  it('uses the fetched scan report on the project route when none were passed', () => {
    expect(resolveGraphFindings({ passedFindings: undefined, fetchedFindings: sample })).toEqual(sample)
  })

  it('returns an empty list when nothing is available (never invents findings)', () => {
    expect(resolveGraphFindings({ passedFindings: undefined, fetchedFindings: null })).toEqual([])
  })
})

describe('resolvePathSeverityCounts', () => {
  it('keeps counts already built by the report panel', () => {
    const passed = new Map()
    expect(resolvePathSeverityCounts({ passedCounts: passed, findings: sample })).toBe(passed)
  })

  it('builds counts from findings when the project route fetched the report', () => {
    const counts = resolvePathSeverityCounts({ findings: sample })
    expect(counts?.has('src/main.ts')).toBe(true)
  })

  it('returns undefined when there are no findings', () => {
    expect(resolvePathSeverityCounts({ findings: [] })).toBeUndefined()
  })
})
