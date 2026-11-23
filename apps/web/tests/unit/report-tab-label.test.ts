import { describe, expect, it } from 'vitest'
import { scanReportMessages } from '../../src/services/scan-report-messages'
import { reportTabBreadcrumbLabel } from '../../src/services/report-tab-label'

describe('reportTabBreadcrumbLabel', () => {
  it('uses the translated tab name, not the raw id', () => {
    expect(reportTabBreadcrumbLabel('summary', scanReportMessages('en'))).toBe('Summary')
    expect(reportTabBreadcrumbLabel('summary', scanReportMessages('fr'))).toBe('Résumé')
    expect(reportTabBreadcrumbLabel('graph', scanReportMessages('fr'))).toBe('Graphe')
    expect(reportTabBreadcrumbLabel('unknown', scanReportMessages('fr'))).toBe('unknown')
  })
})
