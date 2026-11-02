import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pollScanUntilTerminal } from '../../src/services/scan-poll'

vi.mock('../../src/api/scans', () => ({
  getScan: vi.fn()
}))

import { getScan } from '../../src/api/scans'

describe('pollScanUntilTerminal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.mocked(getScan).mockReset()
  })

  it('backs off until the scan reaches a terminal status', async () => {
    vi.mocked(getScan)
      .mockResolvedValueOnce({
        id: 'scan-1',
        source: 'git',
        url: 'https://github.com/acme/app',
        branch: null,
        upload_name: null,
        status: 'queued',
        created_at: new Date().toISOString(),
        error: null
      })
      .mockResolvedValueOnce({
        id: 'scan-1',
        source: 'git',
        url: 'https://github.com/acme/app',
        branch: null,
        upload_name: null,
        status: 'running',
        created_at: new Date().toISOString(),
        error: null
      })
      .mockResolvedValueOnce({
        id: 'scan-1',
        source: 'git',
        url: 'https://github.com/acme/app',
        branch: null,
        upload_name: null,
        status: 'succeeded',
        created_at: new Date().toISOString(),
        error: null
      })

    const updates: string[] = []
    const promise = pollScanUntilTerminal('workspace-1', 'scan-1', {
      initialDelayMs: 100,
      onUpdate: scan => updates.push(scan.status)
    })

    await vi.runAllTimersAsync()
    const scan = await promise
    expect(scan.status).toBe('succeeded')
    expect(updates).toEqual(['queued', 'running', 'succeeded'])
  })
})
