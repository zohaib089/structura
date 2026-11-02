import type { ReadResult } from './graph-types'
import { handleGraphFile } from './worker-handler'

interface WorkerGlobal {
  onmessage: ((this: WorkerGlobal, event: MessageEvent<{ file: Blob }>) => void) | null
  postMessage: (message: ReadResult) => void
}

const scope = globalThis as typeof globalThis & WorkerGlobal

if (typeof (globalThis as { importScripts?: unknown }).importScripts === 'function') {
  scope.onmessage = (event) => {
    void handleGraphFile(event.data.file).then((result) => {
      scope.postMessage(result)
    })
  }
}
