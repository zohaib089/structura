import { getScan, type Scan, type ScanStatus } from '../api/scans'

const TERMINAL: ScanStatus[] = ['succeeded', 'failed']

export interface PollScanOptions {
  initialDelayMs?: number
  maxDelayMs?: number
  onUpdate?: (scan: Scan) => void
  signal?: AbortSignal
}

export async function pollScanUntilTerminal(
  workspaceId: string,
  scanId: string,
  options: PollScanOptions = {}
): Promise<Scan> {
  const initialDelayMs = options.initialDelayMs ?? 800
  const maxDelayMs = options.maxDelayMs ?? 12_000
  let delayMs = initialDelayMs

  while (true) {
    if (options.signal?.aborted) {
      throw new Error('Scan polling was cancelled.')
    }

    const scan = await getScan(workspaceId, scanId)
    options.onUpdate?.(scan)
    if (TERMINAL.includes(scan.status)) return scan

    await sleep(delayMs, options.signal)
    delayMs = Math.min(Math.round(delayMs * 1.6), maxDelayMs)
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      window.clearTimeout(timer)
      reject(new Error('Scan polling was cancelled.'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
