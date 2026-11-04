import type { Scan, ScanStep } from '../api/scans'

export const SCAN_PROGRESS_STEPS: readonly ScanStep[] = ['fetching', 'scanning', 'analysing', 'saving']

export type StepVisualState = 'pending' | 'active' | 'done' | 'error' | 'cancelled'

export interface ScanStepperItem {
  id: ScanStep
  state: StepVisualState
}

function stepIndex(step: ScanStep): number {
  return SCAN_PROGRESS_STEPS.indexOf(step)
}

export function isScanInFlight(status: Scan['status']): boolean {
  return status === 'queued' || status === 'running'
}

export function isScanTerminal(status: Scan['status']): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled'
}

export function buildScanStepperItems(
  scan: Scan,
  options: { failedStep?: ScanStep | null; cancelling?: boolean } = {}
): ScanStepperItem[] {
  const cancelling = options.cancelling === true
  const failedStep = options.failedStep ?? null

  if (scan.status === 'succeeded') {
    return SCAN_PROGRESS_STEPS.map(id => ({ id, state: 'done' as const }))
  }

  if (scan.status === 'failed') {
    const failIdx = failedStep ? stepIndex(failedStep) : SCAN_PROGRESS_STEPS.length - 1
    return SCAN_PROGRESS_STEPS.map((id, index) => ({
      id,
      state: index < failIdx ? 'done' : index === failIdx ? 'error' : 'pending'
    }))
  }

  if (scan.status === 'cancelled') {
    const stopIdx = failedStep ? stepIndex(failedStep) : 0
    return SCAN_PROGRESS_STEPS.map((id, index) => ({
      id,
      state:
        index < stopIdx ? 'done' : index === stopIdx ? 'cancelled' : 'pending'
    }))
  }

  if (scan.status === 'queued') {
    return SCAN_PROGRESS_STEPS.map(id => ({ id, state: 'pending' as const }))
  }

  const activeIdx = scan.step ? stepIndex(scan.step) : 0
  return SCAN_PROGRESS_STEPS.map((id, index) => ({
    id,
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
  scan: Scan,
  labels: Record<ScanStep, string>,
  options: {
    cancelling?: boolean
    cancellingLabel?: string
    queuedLabel: string
    terminalLabels: Record<'succeeded' | 'failed' | 'cancelled', string>
  }
): string {
  if (options.cancelling && scan.status === 'running') {
    return options.cancellingLabel ?? 'Cancelling scan…'
  }
  if (scan.status === 'queued') return options.queuedLabel
  if (scan.status === 'succeeded') return options.terminalLabels.succeeded
  if (scan.status === 'failed') return options.terminalLabels.failed
  if (scan.status === 'cancelled') return options.terminalLabels.cancelled
  if (scan.status === 'running' && scan.step) return labels[scan.step]
  return labels.fetching
}
