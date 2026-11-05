import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportAnalysers from '../../src/components/dashboard/report/ReportAnalysers.vue'
import { scanReportMessages } from '../../src/services/scan-report-messages'
import {
  buildAnalyserRows,
  isInactiveAnalyserStatus,
  partitionAnalyserRows
} from '../../src/services/scan-report-analysers'
import { parseScanReportV1 } from '../../src/api/scan-report-parse'

describe('scan report analysers', () => {
  it('orders rows by status then name and partitions skipped entries', () => {
    const rows = buildAnalyserRows({
      history: { status: 'skipped', durationMs: 0, reason: 'No git history' },
      eslint: { status: 'ran', durationMs: 120 },
      semgrep: { status: 'failed', durationMs: 40, reason: 'Binary missing' }
    })
    expect(rows.map(row => row.name)).toEqual(['eslint', 'semgrep', 'history'])
    expect(isInactiveAnalyserStatus('ran')).toBe(false)
    expect(isInactiveAnalyserStatus('skipped')).toBe(true)

    const { active, skipped } = partitionAnalyserRows(rows)
    expect(active.map(row => row.name)).toEqual(['eslint', 'semgrep'])
    expect(skipped.map(row => row.name)).toEqual(['history'])
  })

  it('parses analysers from validated report payloads', () => {
    const report = parseScanReportV1({
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-02T12:00:00.000Z',
      analysers: {
        ruff: { status: 'timeout', durationMs: 5000, reason: 'Exceeded limit' }
      },
      history: null,
      findings: [],
      improvements: []
    })
    expect(report.analysers.ruff.reason).toBe('Exceeded limit')
  })

  it('renders analyser rows with plain status words and the reason text', () => {
    const rows = buildAnalyserRows({
      eslint: { status: 'ran', durationMs: 10 },
      gitleaks: { status: 'skipped', durationMs: 0, reason: 'Not installed' },
      ruff: { status: 'timeout', durationMs: 5000 }
    })
    const wrapper = mount(ReportAnalysers, {
      props: { rows, caption: 'Checks', messages: scanReportMessages('en') }
    })

    expect(wrapper.text()).toContain('eslint')
    expect(wrapper.text()).toContain('Ran')
    expect(wrapper.text()).toContain('Skipped')
    expect(wrapper.text()).toContain('Timed out')
    expect(wrapper.text()).toContain('Not installed')
    expect(wrapper.text()).toContain('No reason given')
  })
})
