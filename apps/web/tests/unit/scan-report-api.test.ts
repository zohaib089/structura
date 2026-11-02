import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getScanReport } from '../../src/api/scan-report'
import { parseScanReportV1 } from '../../src/api/scan-report-parse'
import type { ScanReportV1 } from '../../src/api/scan-report-types'

function sampleReport(overrides: Partial<ScanReportV1> = {}): ScanReportV1 {
  return {
    schemaVersion: '1.0.0',
    generatedAt: '2026-11-02T12:00:00.000Z',
    analysers: { eslint: { status: 'ran', durationMs: 12 } },
    history: null,
    findings: [],
    improvements: [],
    ...overrides
  }
}

describe('scan report API client', () => {
  beforeEach(() => {
    localStorage.setItem(
      'structura-auth-session-v2',
      JSON.stringify({
        token: 'scan-session',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: { id: 'user-1' }
      })
    )
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('loads reports with bearer auth and validates the payload', async () => {
    const report = sampleReport({
      findings: [
        {
          id: 'f-1',
          section: 'violations',
          severity: 'high',
          file: 'src/a.ts',
          message: 'Unexpected any',
          provenance: 'EXTRACTED'
        }
      ]
    })
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, report })
    } as Response)

    const loaded = await getScanReport('workspace-1', 'scan-1')
    expect(loaded.findings).toHaveLength(1)
    expect(fetch).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/scans/scan-1/report',
      expect.objectContaining({
        headers: { Authorization: 'Bearer scan-session' }
      })
    )
  })

  it('surfaces report-not-ready 409 responses from the API', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        message: 'Report is not ready yet.',
        status: 'running'
      })
    } as Response)

    await expect(getScanReport('workspace-1', 'scan-1')).rejects.toThrow('Report is not ready yet.')
  })

  it('rejects malformed report payloads', () => {
    expect(() => parseScanReportV1({ schemaVersion: '2.0.0' })).toThrow(
      'The scan report response was invalid.'
    )
  })
})
