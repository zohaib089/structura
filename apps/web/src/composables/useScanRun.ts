import { onUnmounted, ref, type Ref } from 'vue'
import { cancelScan, type Scan, type ScanStep } from '../api/scans'
import { pollScanUntilTerminal } from '../services/scan-poll'
import { isScanInFlight, isScanTerminal } from '../services/scan-step-display'

export interface UseScanRunOptions {
  workspaceId: Ref<string>
  onFinished?: (scan: Scan) => void
  scanFailedMessage: string
}

export function useScanRun(options: UseScanRunOptions) {
  const activeScan = ref<Scan | null>(null)
  const preparing = ref(false)
  const cancelling = ref(false)
  const error = ref('')
  const lastFailedStep = ref<ScanStep | null>(null)
  let pollAbort: AbortController | null = null
  let lastRun: (() => Promise<void>) | null = null

  function trackStep(scan: Scan) {
    if (scan.step) lastFailedStep.value = scan.step
  }

  async function pollToTerminal(scan: Scan) {
    lastFailedStep.value = scan.step
    activeScan.value = scan
    pollAbort?.abort()
    pollAbort = new AbortController()
    const finished = await pollScanUntilTerminal(options.workspaceId.value, scan.id, {
      signal: pollAbort.signal,
      onUpdate(updated: Scan) {
        trackStep(updated)
        activeScan.value = updated
      }
    })
    activeScan.value = finished
    if (finished.status === 'failed') {
      error.value = finished.errorMessage ?? options.scanFailedMessage
    }
    options.onFinished?.(finished)
    return finished
  }

  async function runAfterCreate(create: () => Promise<Scan>) {
    error.value = ''
    preparing.value = false
    lastRun = () => runAfterCreate(create)
    try {
      const scan = await create()
      await pollToTerminal(scan)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : options.scanFailedMessage
    } finally {
      const status = activeScan.value?.status
      if (status && isScanTerminal(status)) {
        pollAbort?.abort()
        pollAbort = null
      }
    }
  }

  async function runWithPrepare(prepare: () => Promise<void>, create: () => Promise<Scan>) {
    error.value = ''
    preparing.value = true
    lastRun = () => runWithPrepare(prepare, create)
    try {
      await prepare()
      preparing.value = false
      const scan = await create()
      await pollToTerminal(scan)
    } catch (cause) {
      preparing.value = false
      error.value = cause instanceof Error ? cause.message : options.scanFailedMessage
    } finally {
      const status = activeScan.value?.status
      if (status && isScanTerminal(status)) {
        pollAbort?.abort()
        pollAbort = null
      }
    }
  }

  async function cancelActiveScan() {
    const scan = activeScan.value
    if (!scan || !isScanInFlight(scan.status) || cancelling.value) return
    cancelling.value = true
    error.value = ''
    try {
      const updated = await cancelScan(options.workspaceId.value, scan.id)
      trackStep(updated)
      activeScan.value = updated
      pollAbort?.abort()
      pollAbort = null
      if (isScanTerminal(updated.status)) {
        options.onFinished?.(updated)
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : options.scanFailedMessage
    } finally {
      cancelling.value = false
    }
  }

  function retryLastRun() {
    if (!lastRun) return
    activeScan.value = null
    lastFailedStep.value = null
    error.value = ''
    return lastRun()
  }

  function resetRunState() {
    pollAbort?.abort()
    pollAbort = null
    activeScan.value = null
    preparing.value = false
    cancelling.value = false
    lastFailedStep.value = null
  }

  onUnmounted(() => {
    pollAbort?.abort()
  })

  return {
    activeScan,
    preparing,
    cancelling,
    error,
    lastFailedStep,
    runAfterCreate,
    runWithPrepare,
    cancelActiveScan,
    retryLastRun,
    resetRunState
  }
}
