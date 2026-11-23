/** Typed postMessage protocol between the extension host and the graph webview. */

export const GRAPH_MODES = ['file', 'project'] as const
export type GraphMode = (typeof GRAPH_MODES)[number]

export const HOST_TO_WEBVIEW_TYPES = ['state', 'busy', 'theme'] as const
export const WEBVIEW_TO_HOST_TYPES = ['ready', 'openFile', 'scan', 'rescan', 'showImpact', 'showProjectGraph', 'openFolder'] as const

export interface ImpactDependent {
  path: string
  fileId: string
  depth: number
}

/** Downstream dependents of a file, from the engine's impact walk (same as impact_lite). */
export interface ImpactAlert {
  targetPath: string
  targetFileId: string
  dependents: ImpactDependent[]
  truncated: boolean
  depthLimit: number
}

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
  hotspots?: unknown
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
      /** Files that depend on the open or saved file; omitted when none was requested. */
      impact?: ImpactAlert | null
    }

export type HostToWebviewMessage =
  | { type: 'state'; state: ViewerState }
  /** A refresh is running behind the graph that is on screen (Scan again, or a save). */
  | { type: 'busy'; busy: boolean }
  /** VS Code switched between a light and a dark colour theme while the graph is open. */
  | { type: 'theme'; theme: 'light' | 'dark' }

export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'openFile'; path: string; line?: number }
  | { type: 'scan' }
  /** Scan again while a graph is open: keep the same file / project view and refresh it. */
  | { type: 'rescan' }
  /** Compute / show impact for the file open in the editor. */
  | { type: 'showImpact' }
  | { type: 'showProjectGraph' }
  | { type: 'openFolder' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}


function isImpactDependent(value: unknown): value is ImpactDependent {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.fileId === 'string' &&
    typeof value.depth === 'number' &&
    Number.isFinite(value.depth)
  )
}

export function isImpactAlert(value: unknown): value is ImpactAlert {
  return (
    isRecord(value) &&
    typeof value.targetPath === 'string' &&
    typeof value.targetFileId === 'string' &&
    typeof value.truncated === 'boolean' &&
    typeof value.depthLimit === 'number' &&
    Array.isArray(value.dependents) &&
    value.dependents.every(isImpactDependent)
  )
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
        (value.theme === 'light' || value.theme === 'dark') &&
        (value.impact === undefined || value.impact === null || isImpactAlert(value.impact))
      )
    default:
      return false
  }
}

export function isHostToWebviewMessage(value: unknown): value is HostToWebviewMessage {
  if (!isRecord(value)) return false
  if (value.type === 'busy') return hasOnlyKeys(value, ['type', 'busy']) && typeof value.busy === 'boolean'
  if (value.type === 'theme') return hasOnlyKeys(value, ['type', 'theme']) && (value.theme === 'light' || value.theme === 'dark')
  if (value.type !== 'state') return false
  return isViewerState(value.state)
}

export function isWebviewToHostMessage(value: unknown): value is WebviewToHostMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false
  switch (value.type) {
    case 'ready':
    case 'scan':
    case 'rescan':
    case 'showImpact':
    case 'showProjectGraph':
    case 'openFolder':
      return hasOnlyKeys(value, ['type'])
    case 'openFile':
      return (
        hasOnlyKeys(value, ['type', 'path', 'line']) &&
        typeof value.path === 'string' &&
        value.path.trim().length > 0 &&
        // Optional 1-based line from the file panel's symbol list.
        (value.line === undefined || (typeof value.line === 'number' && Number.isInteger(value.line) && value.line >= 1))
      )
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
