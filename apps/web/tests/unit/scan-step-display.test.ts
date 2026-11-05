import { describe, expect, it } from 'vitest'
import type { Scan } from '../../src/api/scans'
import {
  buildScanStepperItems,
  scanStepperLiveMessage,
  formatStepElapsed,
  sanitizeScanErrorMessage,
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
  it('uses Prepare → Upload → Queued → Analysing → Building phases', () => {
    const queued = buildScanStepperItems(baseScan({ status: 'queued', step: null }))
    expect(queued.map(item => item.id)).toEqual([
      'prepare',
      'upload',
      'queued',
      'analysing',
      'building'
    ])
    expect(queued.map(item => item.state)).toEqual([
      'done',
      'done',
      'active',
      'pending',
      'pending'
    ])
  })

  it('marks client prepare/upload before a scan exists', () => {
    const preparing = buildScanStepperItems(null, { localPhase: 'prepare' })
    expect(preparing.map(item => item.state)).toEqual([
      'active',
      'pending',
      'pending',
      'pending',
      'pending'
    ])
    const uploading = buildScanStepperItems(null, { localPhase: 'upload' })
    expect(uploading.map(item => item.state)).toEqual([
      'done',
      'active',
      'pending',
      'pending',
      'pending'
    ])
  })

  it('maps API analysing steps onto the Analysing phase', () => {
    const items = buildScanStepperItems(baseScan({ step: 'analysing' }))
    expect(items.map(item => item.state)).toEqual(['done', 'done', 'done', 'active', 'pending'])
  })

  it('maps saving onto Building report', () => {
    const items = buildScanStepperItems(baseScan({ step: 'saving' }))
    expect(items.map(item => item.state)).toEqual(['done', 'done', 'done', 'done', 'active'])
  })

  it('marks the failed phase on terminal failure', () => {
    const items = buildScanStepperItems(baseScan({ status: 'failed', step: null }), {
      failedPhase: 'analysing'
    })
    expect(items[3]?.state).toBe('error')
    expect(items[2]?.state).toBe('done')
    expect(items[0]?.state).toBe('done')
  })

  it('announces cancelling while the scan is still running', () => {
    const message = scanStepperLiveMessage(
      baseScan({ status: 'running', step: 'saving' }),
      {
        prepare: 'Prepare',
        upload: 'Upload',
        queued: 'Queued',
        analysing: 'Analysing',
        building: 'Building'
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

  it('formats elapsed as m:ss and sanitizes HTTP errors', () => {
    expect(formatStepElapsed(4000)).toBe('0:04')
    expect(formatStepElapsed(68000)).toBe('1:08')
    expect(formatStepElapsed(null)).toBe('—')
    expect(sanitizeScanErrorMessage('Request failed with status 500.', 'Scan failed')).toBe(
      'Scan failed'
    )
    expect(sanitizeScanErrorMessage('Archive looked empty.', 'Scan failed')).toBe(
      'Archive looked empty.'
    )
  })

  it('treats cancelled as terminal and in-flight helpers', () => {
    expect(isScanTerminal('cancelled')).toBe(true)
    expect(isScanInFlight('cancelled')).toBe(false)
  })
})
