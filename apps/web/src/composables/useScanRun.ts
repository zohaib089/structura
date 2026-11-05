import { onUnmounted, ref, type Ref } from 'vue'
import { cancelScan, type Scan } from '../api/scans'
import { pollScanUntilTerminal } from '../services/scan-poll'
import {
  apiStepToPhase,
  isScanInFlight,
  isScanTerminal,
  resolveActivePhase,
  sanitizeScanErrorMessage,
  type ScanLocalPhase,
  type ScanStepperPhase
} from '../services/scan-step-display'

export interface UseScanRunOptions {
  workspaceId: Ref<string>
  onFinished?: (scan: Scan) => void
  scanFailedMessage: string
}

export function useScanRun(options: UseScanRunOptions) {
  const activeScan = ref<Scan | null>(null)
  const localPhase = ref<ScanLocalPhase>('idle')
  const cancelling = ref(false)
  const error = ref('')
  const lastFailedPhase = ref<ScanStepperPhase | null>(null)
  const phaseStartedAt = ref<Partial<Record<ScanStepperPhase, number>>>({})
  const phaseElapsedMs = ref<Partial<Record<ScanStepperPhase, number>>>({})
  const prepareDetail = ref('')
  let pollAbort: AbortController | null = null
  let lastRun: (() => Promise<void>) | null = null
  let elapsedTimer: ReturnType<typeof setInterval> | null = null

  const preparing = ref(false)

  function clearElapsedTimer() {
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
  }

  function stampPhase(phase: ScanStepperPhase | null) {
    if (!phase) return
    const now = Date.now()
    const started = phaseStartedAt.value[phase]
    if (started == null) {
      phaseStartedAt.value = { ...phaseStartedAt.value, [phase]: now }
    }
    // Close out earlier open phases
    for (const id of Object.keys(phaseStartedAt.value) as ScanStepperPhase[]) {
      if (id === phase) continue
      const start = phaseStartedAt.value[id]
      if (start != null && phaseElapsedMs.value[id] == null) {
        phaseElapsedMs.value = { ...phaseElapsedMs.value, [id]: Math.max(0, now - start) }
      }
    }
  }

  function tickActiveElapsed() {
    const phase = resolveActivePhase(activeScan.value, localPhase.value)
    if (!phase) return
    const start = phaseStartedAt.value[phase]
    if (start == null) return
    phaseElapsedMs.value = {
      ...phaseElapsedMs.value,
      [phase]: Math.max(0, Date.now() - start)
    }
  }

  function startElapsedTicker() {
    clearElapsedTimer()
    elapsedTimer = setInterval(tickActiveElapsed, 1000)
  }

  function markLocalPhase(next: ScanLocalPhase, detail = '') {
    localPhase.value = next
    preparing.value = next === 'prepare'
    if (next === 'prepare' || next === 'upload') {
      stampPhase(next)
      prepareDetail.value = detail
      startElapsedTicker()
    }
    if (next === 'idle') {
      preparing.value = false
    }
  }

  function trackScan(scan: Scan) {
    if (scan.step) lastFailedPhase.value = apiStepToPhase(scan.step)
    else if (scan.status === 'queued') lastFailedPhase.value = 'queued'
    activeScan.value = scan
    const phase = resolveActivePhase(scan, 'idle')
    stampPhase(phase)
  }

  async function pollToTerminal(scan: Scan) {
    markLocalPhase('idle')
    trackScan(scan)
    startElapsedTicker()
    pollAbort?.abort()
    pollAbort = new AbortController()
    const finished = await pollScanUntilTerminal(options.workspaceId.value, scan.id, {
      signal: pollAbort.signal,
      onUpdate(updated: Scan) {
        trackScan(updated)
      }
    })
    trackScan(finished)
    const finalPhase = resolveActivePhase(finished, 'idle')
    if (finalPhase) stampPhase(finalPhase)
    // Seal the active phase elapsed on terminal
    tickActiveElapsed()
    clearElapsedTimer()
    if (finished.status === 'failed') {
      error.value = sanitizeScanErrorMessage(
        finished.errorMessage ?? options.scanFailedMessage,
        options.scanFailedMessage
      )
      if (!lastFailedPhase.value) lastFailedPhase.value = 'analysing'
    }
    if (finished.status === 'succeeded') {
      // Mark every phase done with sealed times
      for (const id of ['prepare', 'upload', 'queued', 'analysing', 'building'] as ScanStepperPhase[]) {
        if (phaseStartedAt.value[id] != null && phaseElapsedMs.value[id] == null) {
          phaseElapsedMs.value = {
            ...phaseElapsedMs.value,
            [id]: Math.max(0, Date.now() - (phaseStartedAt.value[id] as number))
          }
        }
      }
    }
    options.onFinished?.(finished)
    return finished
  }

  function resetTiming() {
    phaseStartedAt.value = {}
    phaseElapsedMs.value = {}
    prepareDetail.value = ''
    clearElapsedTimer()
  }

  async function runAfterCreate(create: () => Promise<Scan>) {
    error.value = ''
    lastFailedPhase.value = null
    resetTiming()
    markLocalPhase('upload')
    lastRun = () => runAfterCreate(create)
    try {
      const scan = await create()
      await pollToTerminal(scan)
    } catch (cause) {
      markLocalPhase('idle')
      clearElapsedTimer()
      lastFailedPhase.value = 'upload'
      error.value = sanitizeScanErrorMessage(
        cause instanceof Error ? cause.message : options.scanFailedMessage,
        options.scanFailedMessage
      )
    } finally {
      const status = activeScan.value?.status
      if (status && isScanTerminal(status)) {
        pollAbort?.abort()
        pollAbort = null
      }
    }
  }

  async function runWithPrepare(
    prepare: () => Promise<void>,
    create: () => Promise<Scan>,
    prepareLabel = ''
  ) {
    error.value = ''
    lastFailedPhase.value = null
    resetTiming()
    markLocalPhase('prepare', prepareLabel)
    lastRun = () => runWithPrepare(prepare, create, prepareLabel)
    try {
      await prepare()
      markLocalPhase('upload')
      const scan = await create()
      await pollToTerminal(scan)
    } catch (cause) {
      const failed: ScanStepperPhase = localPhase.value === 'prepare' ? 'prepare' : 'upload'
      lastFailedPhase.value = failed
      markLocalPhase('idle')
      clearElapsedTimer()
      error.value = sanitizeScanErrorMessage(
        cause instanceof Error ? cause.message : options.scanFailedMessage,
        options.scanFailedMessage
      )
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
      trackScan(updated)
      pollAbort?.abort()
      pollAbort = null
      clearElapsedTimer()
      if (isScanTerminal(updated.status)) {
        options.onFinished?.(updated)
      }
    } catch (cause) {
      error.value = sanitizeScanErrorMessage(
        cause instanceof Error ? cause.message : options.scanFailedMessage,
        options.scanFailedMessage
      )
    } finally {
      cancelling.value = false
    }
  }

  function retryLastRun() {
    if (!lastRun) return
    activeScan.value = null
    lastFailedPhase.value = null
    error.value = ''
    resetTiming()
    return lastRun()
  }

  function resetRunState() {
    pollAbort?.abort()
    pollAbort = null
    activeScan.value = null
    markLocalPhase('idle')
    cancelling.value = false
    lastFailedPhase.value = null
    resetTiming()
  }

  onUnmounted(() => {
    pollAbort?.abort()
    clearElapsedTimer()
  })

  return {
    activeScan,
    preparing,
    localPhase,
    cancelling,
    error,
    lastFailedPhase,
    phaseElapsedMs,
    prepareDetail,
    runAfterCreate,
    runWithPrepare,
    cancelActiveScan,
    retryLastRun,
    resetRunState
  }
}
