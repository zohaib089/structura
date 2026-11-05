import type { Scan, ScanStep } from '../api/scans'

/**
 * Phases shown in ScanStepper (loading-and-toasts.md §1.4 + open mock):
 * Prepare → Upload → Queued → Analysing → Building report.
 *
 * Prepare/Upload are client-side for folder/zip. Once a scan exists they stay done.
 * API `step` values map onto Analysing (fetching|scanning|analysing) and Building (saving).
 */
export type ScanStepperPhase = 'prepare' | 'upload' | 'queued' | 'analysing' | 'building'

export const SCAN_STEPPER_PHASES: readonly ScanStepperPhase[] = [
  'prepare',
  'upload',
  'queued',
  'analysing',
  'building'
]

/** Local-only phases before the API has created a scan. */
export type ScanLocalPhase = 'idle' | 'prepare' | 'upload'

export type StepVisualState = 'pending' | 'active' | 'done' | 'error' | 'cancelled'

export interface ScanStepperItem {
  id: ScanStepperPhase
  state: StepVisualState
  index: number
}

export interface BuildScanStepperOptions {
  localPhase?: ScanLocalPhase
  failedPhase?: ScanStepperPhase | null
  cancelling?: boolean
}

function phaseIndex(phase: ScanStepperPhase): number {
  return SCAN_STEPPER_PHASES.indexOf(phase)
}

export function isScanInFlight(status: Scan['status']): boolean {
  return status === 'queued' || status === 'running'
}

export function isScanTerminal(status: Scan['status']): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled'
}

/** Map an API step onto a stepper phase (after the scan exists). */
export function apiStepToPhase(step: ScanStep | null | undefined): ScanStepperPhase {
  if (step === 'saving') return 'building'
  if (step === 'fetching' || step === 'scanning' || step === 'analysing') return 'analysing'
  return 'analysing'
}

export function resolveActivePhase(
  scan: Scan | null,
  localPhase: ScanLocalPhase = 'idle'
): ScanStepperPhase | null {
  if (localPhase === 'prepare') return 'prepare'
  if (localPhase === 'upload') return 'upload'
  if (!scan) return null
  if (scan.status === 'queued') return 'queued'
  if (scan.status === 'running') return apiStepToPhase(scan.step)
  return null
}

function itemsWithActive(activeIdx: number): ScanStepperItem[] {
  return SCAN_STEPPER_PHASES.map((id, index) => ({
    id,
    index: index + 1,
    state: index < activeIdx ? 'done' : index === activeIdx ? 'active' : 'pending'
  }))
}

export function buildScanStepperItems(
  scan: Scan | null,
  options: BuildScanStepperOptions = {}
): ScanStepperItem[] {
  const localPhase = options.localPhase ?? 'idle'
  const cancelling = options.cancelling === true
  const failedPhase = options.failedPhase ?? null
  const phases = SCAN_STEPPER_PHASES

  if (localPhase === 'prepare') return itemsWithActive(phaseIndex('prepare'))
  if (localPhase === 'upload') return itemsWithActive(phaseIndex('upload'))

  if (!scan) {
    return phases.map((id, index) => ({ id, index: index + 1, state: 'pending' as const }))
  }

  if (scan.status === 'succeeded') {
    return phases.map((id, index) => ({ id, index: index + 1, state: 'done' as const }))
  }

  if (scan.status === 'failed') {
    const failIdx = failedPhase ? phaseIndex(failedPhase) : phaseIndex('analysing')
    return phases.map((id, index) => ({
      id,
      index: index + 1,
      state: index < failIdx ? 'done' : index === failIdx ? 'error' : 'pending'
    }))
  }

  if (scan.status === 'cancelled') {
    const stopIdx = failedPhase ? phaseIndex(failedPhase) : phaseIndex('queued')
    return phases.map((id, index) => ({
      id,
      index: index + 1,
      state: index < stopIdx ? 'done' : index === stopIdx ? 'cancelled' : 'pending'
    }))
  }

  if (scan.status === 'queued') return itemsWithActive(phaseIndex('queued'))

  const activePhase = apiStepToPhase(scan.step)
  const activeIdx = phaseIndex(activePhase)
  return phases.map((id, index) => ({
    id,
    index: index + 1,
    state:
      cancelling && index === activeIdx
        ? 'cancelled'
        : index < activeIdx
          ? 'done'
          : index === activeIdx
            ? 'active'
            : 'pending'
  }))
}

export function scanStepperLiveMessage(
  scan: Scan | null,
  labels: Record<ScanStepperPhase, string>,
  options: {
    localPhase?: ScanLocalPhase
    cancelling?: boolean
    cancellingLabel?: string
    queuedLabel: string
    terminalLabels: Record<'succeeded' | 'failed' | 'cancelled', string>
  }
): string {
  if (options.cancelling && scan?.status === 'running') {
    return options.cancellingLabel ?? 'Cancelling scan…'
  }
  if (options.localPhase === 'prepare') return labels.prepare
  if (options.localPhase === 'upload') return labels.upload
  if (!scan) return ''
  if (scan.status === 'queued') return options.queuedLabel
  if (scan.status === 'succeeded') return options.terminalLabels.succeeded
  if (scan.status === 'failed') return options.terminalLabels.failed
  if (scan.status === 'cancelled') return options.terminalLabels.cancelled
  if (scan.status === 'running') return labels[apiStepToPhase(scan.step)]
  return labels.queued
}

/** Format elapsed milliseconds as m:ss (mock open stepper). */
export function formatStepElapsed(elapsedMs: number | null | undefined): string {
  if (elapsedMs == null || !Number.isFinite(elapsedMs) || elapsedMs < 0) return '—'
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatArchiveLimitLabel(maxBytes: number): string {
  const mb = maxBytes / (1024 * 1024)
  const rounded = Number.isInteger(mb) ? String(mb) : mb.toFixed(0)
  return `${rounded} MB`
}

/** Strip HTTP status codes / endpoints from messages shown in product UI. */
export function sanitizeScanErrorMessage(raw: string, fallback: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return fallback
  if (/\bHTTP\s*\d{3}\b/i.test(trimmed) || /\bstatus\s*\d{3}\b/i.test(trimmed)) return fallback
  if (/^\/api\//i.test(trimmed) || /\b(GET|POST|PUT|PATCH|DELETE)\s+\/api\b/i.test(trimmed)) {
    return fallback
  }
  return trimmed
}
