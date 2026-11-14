export interface VsCodeApi {
  postMessage(message: unknown): void
  getState(): unknown
  setState(state: unknown): unknown
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi
  }
}

let cached: VsCodeApi | undefined
let acquired = false

/** acquireVsCodeApi may be called only once in a webview. */
export function getVsCodeApi(): VsCodeApi | undefined {
  if (acquired) return cached
  acquired = true
  try {
    cached = window.acquireVsCodeApi?.()
  } catch {
    cached = undefined
  }
  return cached
}
