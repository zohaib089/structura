import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScanRun } from '../../src/composables/useScanRun'
import type { Scan } from '../../src/api/scans'

vi.mock('../../src/api/scans', () => ({
  cancelScan: vi.fn()
}))

vi.mock('../../src/services/scan-poll', () => ({
  pollScanUntilTerminal: vi.fn()
}))

import { cancelScan } from '../../src/api/scans'
import { pollScanUntilTerminal } from '../../src/services/scan-poll'

const now = new Date().toISOString()

function scan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: 'scan-1',
    workspaceId: 'ws-1',
    requestedBy: 'user-1',
    source: 'git',
    url: 'https://github.com/acme/app',
    branch: null,
    status: 'running',
    step: 'scanning',
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    finishedAt: null,
    ...overrides
  }
}

describe('useScanRun', () => {
  beforeEach(() => {
    vi.mocked(pollScanUntilTerminal).mockReset()
    vi.mocked(cancelScan).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('polls after create and finishes on success', async () => {
    vi.mocked(pollScanUntilTerminal).mockResolvedValue(
      scan({ status: 'succeeded', step: null, finishedAt: now })
    )
    const finished: Scan[] = []
    const run = useScanRun({
      workspaceId: ref('ws-1'),
      scanFailedMessage: 'Scan failed',
      onFinished: s => finished.push(s)
    })

    await run.runAfterCreate(async () => scan({ status: 'queued', step: null }))
    expect(pollScanUntilTerminal).toHaveBeenCalledWith('ws-1', 'scan-1', expect.any(Object))
    expect(finished[0]?.status).toBe('succeeded')
  })

  it('cancels an in-flight scan and applies the API response', async () => {
    vi.mocked(pollScanUntilTerminal).mockImplementation(async (_ws, _id, options) => {
      options?.onUpdate?.(scan({ step: 'analysing' }))
      return new Promise(() => undefined)
    })
    vi.mocked(cancelScan).mockResolvedValue(
      scan({ status: 'cancelled', step: null, finishedAt: now })
    )

    const run = useScanRun({
      workspaceId: ref('ws-1'),
      scanFailedMessage: 'Scan failed'
    })
    run.activeScan.value = scan()
    await run.cancelActiveScan()

    expect(cancelScan).toHaveBeenCalledWith('ws-1', 'scan-1')
    expect(run.activeScan.value?.status).toBe('cancelled')
    expect(run.cancelling.value).toBe(false)
  })

  it('refreshes the scan when cancel returns 409 (already finished)', async () => {
    vi.mocked(cancelScan).mockResolvedValue(
      scan({ status: 'succeeded', step: null, finishedAt: now })
    )
    const run = useScanRun({
      workspaceId: ref('ws-1'),
      scanFailedMessage: 'Scan failed'
    })
    run.activeScan.value = scan()
    await run.cancelActiveScan()
    expect(run.activeScan.value?.status).toBe('succeeded')
  })

  it('retries the last submitted run', async () => {
    vi.mocked(pollScanUntilTerminal).mockResolvedValue(
      scan({ status: 'succeeded', step: null, finishedAt: now })
    )
    const create = vi.fn(async () => scan({ status: 'queued', step: null }))
    const run = useScanRun({
      workspaceId: ref('ws-1'),
      scanFailedMessage: 'Scan failed'
    })

    await run.runAfterCreate(create)
    expect(create).toHaveBeenCalledTimes(1)
    await run.retryLastRun()
    expect(create).toHaveBeenCalledTimes(2)
  })
})
