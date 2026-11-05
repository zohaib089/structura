import { describe, expect, it } from 'vitest'
import type { LocationQuery } from 'vue-router'
import {
  REPORT_TAB_IDS,
  mergeReportLocationQuery,
  parseReportFiltersFromQuery,
  parseReportNodeQuery,
  parseReportTabParam,
  reportFiltersToQuery,
  reportTabPathSegment
} from '../../src/services/scan-report-url-state'
import { defaultReportFilters } from '../../src/services/scan-report-filters'

describe('scan report URL state', () => {
  it('parses tab params with summary as the default', () => {
    expect(parseReportTabParam(undefined)).toBe('summary')
    expect(parseReportTabParam('graph')).toBe('graph')
    expect(parseReportTabParam('findings')).toBe('findings')
    expect(parseReportTabParam('violations')).toBe('violations')
    expect(parseReportTabParam('not-a-tab')).toBe('summary')
    expect(reportTabPathSegment('summary')).toBeUndefined()
    expect(reportTabPathSegment('violations')).toBe('violations')
    expect(reportTabPathSegment('graph')).toBe('graph')
  })

  it('lists Summary first so it is the first tab people see', () => {
    expect(REPORT_TAB_IDS[0]).toBe('summary')
    expect(new Set(REPORT_TAB_IDS).size).toBe(REPORT_TAB_IDS.length)
  })

  it('round-trips filter query params', () => {
    const filters = defaultReportFilters()
    filters.severities = new Set(['critical', 'high'])
    filters.sections = new Set(['security', 'violations'])
    filters.pathQuery = 'src/api'

    const query = reportFiltersToQuery(filters)
    expect(query).toEqual({
      sev: 'critical,high',
      sec: 'security,violations',
      path: 'src/api'
    })

    const parsed = parseReportFiltersFromQuery(query as LocationQuery)
    expect([...parsed.severities].sort()).toEqual(['critical', 'high'])
    expect([...parsed.sections].sort()).toEqual(['security', 'violations'])
    expect(parsed.pathQuery).toBe('src/api')
  })

  it('omits default filter values from the query string', () => {
    expect(reportFiltersToQuery(defaultReportFilters())).toEqual({})
  })

  it('reads node focus from node and legacy focus params', () => {
    expect(parseReportNodeQuery({ node: 'src/app.ts' })).toBe('src/app.ts')
    expect(parseReportNodeQuery({ focus: 'lib/main' })).toBe('lib/main')
    expect(parseReportNodeQuery({})).toBeNull()
  })

  it('merges node focus into location query', () => {
    const query = mergeReportLocationQuery(defaultReportFilters(), 'src/x.ts', {})
    expect(query.node).toBe('src/x.ts')
  })
})
