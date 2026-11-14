/** Typed postMessage protocol between the extension host and the graph webview. */

export const GRAPH_MODES = ['file', 'project'] as const
export type GraphMode = (typeof GRAPH_MODES)[number]

export const HOST_TO_WEBVIEW_TYPES = ['state'] as const
export const WEBVIEW_TO_HOST_TYPES = ['ready', 'openFile', 'scan', 'showProjectGraph', 'openFolder'] as const

export type ViewerKind =
  | 'empty-folder'
  | 'empty-file'
  | 'declined'
  | 'loading'
  | 'error'
  | 'file-missing'
  | 'graph'

export interface GraphPayload {
  schemaVersion: string
  summary: { nodes: number; edges: number; files: number }
  coverage: unknown
  nodes: unknown[]
  edges: unknown[]
  architecture?: unknown
}

export type ViewerState =
  | { kind: 'empty-folder' }
  | { kind: 'empty-file' }
  | { kind: 'declined' }
  | { kind: 'loading'; message?: string }
  | { kind: 'error'; message: string }
  | { kind: 'file-missing'; path: string }
  | {
      kind: 'graph'
      mode: GraphMode
      graph: GraphPayload
      focusPath: string | null
      theme: 'light' | 'dark'
      fileSummaries?: Readonly<Record<string, string | null>>
    }

export interface HostToWebviewMessage {
  type: 'state'
  state: ViewerState
}

export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'openFile'; path: string }
  | { type: 'scan' }
  | { type: 'showProjectGraph' }
  | { type: 'openFolder' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

export function isGraphMode(value: unknown): value is GraphMode {
  return value === 'file' || value === 'project'
}

export function isGraphPayload(value: unknown): value is GraphPayload {
  if (!isRecord(value)) return false
  return (
    typeof value.schemaVersion === 'string' &&
    isRecord(value.summary) &&
    typeof value.summary.nodes === 'number' &&
    typeof value.summary.edges === 'number' &&
    typeof value.summary.files === 'number' &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  )
}

export function isViewerState(value: unknown): value is ViewerState {
  if (!isRecord(value) || typeof value.kind !== 'string') return false
  switch (value.kind) {
    case 'empty-folder':
    case 'empty-file':
    case 'declined':
      return hasOnlyKeys(value, ['kind'])
    case 'loading':
      return (
        hasOnlyKeys(value, ['kind', 'message']) &&
        (value.message === undefined || typeof value.message === 'string')
      )
    case 'error':
      return hasOnlyKeys(value, ['kind', 'message']) && typeof value.message === 'string'
    case 'file-missing':
      return hasOnlyKeys(value, ['kind', 'path']) && typeof value.path === 'string'
    case 'graph':
      return (
        isGraphMode(value.mode) &&
        isGraphPayload(value.graph) &&
        (value.focusPath === null || typeof value.focusPath === 'string') &&
        (value.theme === 'light' || value.theme === 'dark')
      )
    default:
      return false
  }
}

export function isHostToWebviewMessage(value: unknown): value is HostToWebviewMessage {
  if (!isRecord(value) || value.type !== 'state') return false
  return isViewerState(value.state)
}

export function isWebviewToHostMessage(value: unknown): value is WebviewToHostMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false
  switch (value.type) {
    case 'ready':
    case 'scan':
    case 'showProjectGraph':
    case 'openFolder':
      return hasOnlyKeys(value, ['type'])
    case 'openFile':
      return hasOnlyKeys(value, ['type', 'path']) && typeof value.path === 'string' && value.path.trim().length > 0
    default:
      return false
  }
}

/** Keep open-file paths inside the workspace: reject empty, absolute, or parent-escaping paths. */
export function sanitizeWorkspaceRelativePath(path: string): string | null {
  const normalized = path.replace(/\\/g, '/').replace(/^\.\/+/, '').trim()
  if (!normalized) return null
  if (normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) return null
  const parts = normalized.split('/')
  if (parts.some((part) => part === '..' || part === '')) return null
  return parts.join('/')
}
