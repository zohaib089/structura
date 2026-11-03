import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanReportAnalysers from '../../src/components/dashboard/ScanReportAnalysers.vue'
import { scanReportMessages } from '../../src/services/scan-report-messages'
import {
  buildAnalyserRows,
  isInactiveAnalyserStatus,
  partitionAnalyserRows
} from '../../src/services/scan-report-analysers'
import type { ScanReportV1 } from '../../src/api/scan-report-types'
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

  it('renders skipped analysers in a separate block with reason text', () => {
    const report: ScanReportV1 = {
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-02T12:00:00.000Z',
      analysers: {
        eslint: { status: 'ran', durationMs: 10 },
        gitleaks: { status: 'skipped', durationMs: 0, reason: 'Not installed' }
      },
      history: null,
      findings: [],
      improvements: []
    }
    const wrapper = mount(ScanReportAnalysers, {
      props: { report, messages: scanReportMessages('en') }
    })

    expect(wrapper.get('h3').text()).toBe('Analysers')
    expect(wrapper.text()).toContain('eslint')
    expect(wrapper.text()).toContain('Skipped analysers')
    expect(wrapper.text()).toContain('Not installed')
    expect(wrapper.text()).toContain('Ran')
  })

  it('shows an empty-state message when analysers are missing', () => {
    const report: ScanReportV1 = {
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-02T12:00:00.000Z',
      analysers: {},
      history: null,
      findings: [],
      improvements: []
    }
    const wrapper = mount(ScanReportAnalysers, {
      props: { report, messages: scanReportMessages('en') }
    })
    expect(wrapper.text()).toContain('No analyser run records')
  })
})
