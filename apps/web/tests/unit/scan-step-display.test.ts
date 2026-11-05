import { describe, expect, it } from 'vitest'
import type { Scan } from '../../src/api/scans'
import {
  buildScanStepperItems,
  scanStepperLiveMessage,
  isScanInFlight,
  isScanTerminal
} from '../../src/services/scan-step-display'

const now = new Date().toISOString()

function baseScan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: 'scan-1',
    workspaceId: 'ws-1',
    requestedBy: 'user-1',
    source: 'git',
    url: 'https://github.com/acme/app',
    branch: null,
    status: 'running',
    step: 'fetching',
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    finishedAt: null,
    ...overrides
  }
}

describe('scan step display', () => {
  it('marks earlier steps done and the current step active while running', () => {
    const items = buildScanStepperItems(baseScan({ step: 'analysing' }))
    expect(items.map(item => item.state)).toEqual(['done', 'done', 'done', 'active', 'pending'])
  })

  it('marks the failed step on terminal failure', () => {
    const items = buildScanStepperItems(baseScan({ status: 'failed', step: null }), {
      failedStep: 'scanning'
    })
    expect(items[2]?.state).toBe('error')
    expect(items[1]?.state).toBe('done')
    expect(items[0]?.state).toBe('done')
  })

  it('shows five phases with the queued wait first', () => {
    const queued = buildScanStepperItems(baseScan({ status: 'queued', step: null }))
    expect(queued.map(item => item.id)).toEqual(['queued', 'fetching', 'scanning', 'analysing', 'saving'])
    expect(queued.map(item => item.state)).toEqual(['active', 'pending', 'pending', 'pending', 'pending'])
    const running = buildScanStepperItems(baseScan({ step: 'fetching' }))
    expect(running.map(item => item.state)).toEqual(['done', 'active', 'pending', 'pending', 'pending'])
  })

  it('announces cancelling while the scan is still running', () => {
    const message = scanStepperLiveMessage(
      baseScan({ status: 'running', step: 'saving' }),
      {
        fetching: 'Fetching',
        scanning: 'Scanning',
        analysing: 'Analysing',
        saving: 'Saving'
      },
      {
        cancelling: true,
        cancellingLabel: 'Cancelling scan…',
        queuedLabel: 'Queued',
        terminalLabels: {
          succeeded: 'Done',
          failed: 'Failed',
          cancelled: 'Cancelled'
        }
      }
    )
    expect(message).toBe('Cancelling scan…')
  })

  it('treats cancelled as terminal and in-flight helpers', () => {
    expect(isScanTerminal('cancelled')).toBe(true)
    expect(isScanInFlight('cancelled')).toBe(false)
  })
})
