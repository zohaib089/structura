import { GRAPH_BYTE_LIMIT } from './caps'
import type { ReadResult } from './graph-types'

export interface ParseHandle {
  promise: Promise<ReadResult>
  cancel: () => void
}

export function parseGraphFile(file: Blob): ParseHandle {
  if (file.size > GRAPH_BYTE_LIMIT) {
    return {
      cancel: () => undefined,
      promise: Promise.resolve({
        ok: false,
        error: { code: 'too-large', limitBytes: GRAPH_BYTE_LIMIT, actualBytes: file.size }
      })
    }
  }

  let worker: Worker | null = null
  let cancelled = false
  const promise = import('./graph.worker.ts?worker&inline').then((module) => {
    if (cancelled) {
      return { ok: false, error: { code: 'invalid-json', where: 'line 1, column 1' } } as ReadResult
    }
    worker = new module.default()
    return new Promise<ReadResult>((resolve) => {
      if (!worker) return
      worker.onmessage = (event: MessageEvent<ReadResult>) => {
        worker?.terminate()
        resolve(event.data)
      }
      worker.onerror = () => {
        worker?.terminate()
        resolve({ ok: false, error: { code: 'invalid-json', where: 'line 1, column 1' } })
      }
      worker.postMessage({ file })
    })
  })

  return {
    promise,
    cancel: () => {
      cancelled = true
      worker?.terminate()
    }
  }
}
