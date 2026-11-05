import { getCurrentSession } from '../services/auth'

export interface ScanFileMetaEntry {
  path: string
  summary: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  let result: unknown
  try {
    result = await response.json()
  } catch (cause) {
    if (cause instanceof SyntaxError) {
      throw new Error(`The API returned invalid JSON (HTTP ${response.status}).`)
    }
    throw cause
  }
  if (!isRecord(result)) {
    throw new Error(`The API response was invalid (HTTP ${response.status}).`)
  }
  return result
}

function apiFailureMessage(result: Record<string, unknown>, status: number): string {
  const message = typeof result.message === 'string' ? result.message : null
  return message ?? `Request failed with status ${status}.`
}

function fileMetaPath(workspaceId: string, scanId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/scans/${encodeURIComponent(scanId)}/file-meta`
}

function parseFileMetaEntry(value: unknown): ScanFileMetaEntry | null {
  if (!isRecord(value) || typeof value.path !== 'string') return null
  const summary = value.summary === null || typeof value.summary === 'string' ? value.summary : null
  return { path: value.path, summary }
}

export function parseScanFileMetaResponse(result: Record<string, unknown>): ScanFileMetaEntry[] {
  if (!Array.isArray(result.files)) throw new Error('The file-meta response was invalid.')
  const files: ScanFileMetaEntry[] = []
  for (const row of result.files) {
    const parsed = parseFileMetaEntry(row)
    if (parsed) files.push(parsed)
  }
  return files
}

export async function getScanFileMeta(
  workspaceId: string,
  scanId: string,
  path: string
): Promise<ScanFileMetaEntry | null> {
  const files = await getScanFileMetaBatch(workspaceId, scanId, [path])
  return files.find(entry => entry.path === path) ?? files[0] ?? null
}

export async function getScanFileMetaBatch(
  workspaceId: string,
  scanId: string,
  paths: string[]
): Promise<ScanFileMetaEntry[]> {
  const trimmed = [...new Set(paths.map(item => item.trim()).filter(item => item.length > 0))]
  if (trimmed.length === 0) return []

  const session = getCurrentSession()
  if (!session) throw new Error('Your session has expired. Please sign in again.')

  const query =
    trimmed.length === 1
      ? `path=${encodeURIComponent(trimmed[0]!)}`
      : `paths=${encodeURIComponent(trimmed.join(','))}`

  const response = await fetch(`/api${fileMetaPath(workspaceId, scanId)}?${query}`, {
    headers: { Authorization: `Bearer ${session.token}` }
  })
  const result = await readJsonResponse(response)

  if (response.status === 409) {
    throw new Error(apiFailureMessage(result, response.status))
  }
  if (!response.ok || result.success !== true) {
    throw new Error(apiFailureMessage(result, response.status))
  }
  return parseScanFileMetaResponse(result)
}
