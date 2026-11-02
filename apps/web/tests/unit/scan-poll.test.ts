import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pollScanUntilTerminal } from '../../src/services/scan-poll'

vi.mock('../../src/api/scans', () => ({
  getScan: vi.fn()
}))

import { getScan } from '../../src/api/scans'

const now = new Date().toISOString()

function mockScan(status: 'queued' | 'running' | 'succeeded') {
  return {
    id: 'scan-1',
    workspaceId: 'workspace-1',
    requestedBy: 'user-1',
    source: 'git' as const,
    url: 'https://github.com/acme/app',
    branch: null,
    status,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: status === 'queued' ? null : now,
    finishedAt: status === 'succeeded' ? now : null
  }
}

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
      .mockResolvedValueOnce(mockScan('queued'))
      .mockResolvedValueOnce(mockScan('running'))
      .mockResolvedValueOnce(mockScan('succeeded'))

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
