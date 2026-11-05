import type { Scan, ScanStep } from '../api/scans'

export const SCAN_PROGRESS_STEPS: readonly ScanStep[] = ['fetching', 'scanning', 'analysing', 'saving']

/**
 * Phases shown in ScanStepper (loading-and-toasts.md §1.4): the wait for a worker comes first,
 * then the four steps the API reports. "Queued" is a status, not an API step, so it is added here.
 */
export type ScanStepperPhase = 'queued' | ScanStep
export const SCAN_STEPPER_PHASES: readonly ScanStepperPhase[] = ['queued', ...SCAN_PROGRESS_STEPS]

export type StepVisualState = 'pending' | 'active' | 'done' | 'error' | 'cancelled'

export interface ScanStepperItem {
  id: ScanStepperPhase
  state: StepVisualState
}

function stepIndex(step: ScanStep): number {
  return SCAN_STEPPER_PHASES.indexOf(step)
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
  const phases = SCAN_STEPPER_PHASES

  if (scan.status === 'succeeded') {
    return phases.map(id => ({ id, state: 'done' as const }))
  }

  if (scan.status === 'failed') {
    const failIdx = failedStep ? stepIndex(failedStep) : phases.length - 1
    return phases.map((id, index) => ({
      id,
      state: index < failIdx ? 'done' : index === failIdx ? 'error' : 'pending'
    }))
  }

  if (scan.status === 'cancelled') {
    const stopIdx = failedStep ? stepIndex(failedStep) : 0
    return phases.map((id, index) => ({
      id,
      state: index < stopIdx ? 'done' : index === stopIdx ? 'cancelled' : 'pending'
    }))
  }

  if (scan.status === 'queued') {
    return phases.map((id, index) => ({
      id,
      state: index === 0 ? ('active' as const) : ('pending' as const)
    }))
  }

  const activeIdx = scan.step ? stepIndex(scan.step) : stepIndex('fetching')
  return phases.map((id, index) => ({
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
