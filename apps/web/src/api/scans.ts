import { getCurrentSession } from '../services/auth'
import type { GraphDocument } from '../viewer/graph-types'
import { readGraph } from '../viewer/read-graph'

export type ScanStatus = 'queued' | 'running' | 'succeeded' | 'failed'
export type ScanSource = 'git' | 'upload'

export interface Scan {
  id: string
  source: ScanSource
  url: string | null
  branch: string | null
  upload_name: string | null
  status: ScanStatus
  created_at: string
  error: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function parseScan(value: unknown): Scan {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    value.id.trim() !== value.id ||
    (value.source !== 'git' && value.source !== 'upload') ||
    (value.url !== null && typeof value.url !== 'string') ||
    (value.branch !== null && typeof value.branch !== 'string') ||
    (value.upload_name !== null && typeof value.upload_name !== 'string') ||
    (value.status !== 'queued' &&
      value.status !== 'running' &&
      value.status !== 'succeeded' &&
      value.status !== 'failed') ||
    !isTimestamp(value.created_at) ||
    (value.error !== null && typeof value.error !== 'string')
  ) {
    throw new Error('The scan response was invalid.')
  }
  return {
    id: value.id,
    source: value.source,
    url: value.url,
    branch: value.branch,
    upload_name: value.upload_name,
    status: value.status,
    created_at: value.created_at,
    error: value.error
  }
}

async function requestJson(
  path: string,
  method = 'GET',
  payload?: object
): Promise<Record<string, unknown>> {
  const session = getCurrentSession()
  if (!session) throw new Error('Your session has expired. Please sign in again.')

  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.token}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {})
    },
    ...(payload ? { body: JSON.stringify(payload) } : {})
  })
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

  if (!response.ok || result.success !== true) {
    const message = typeof result.message === 'string' ? result.message : null
    throw new Error(message ?? `Request failed with status ${response.status}.`)
  }
  return result
}

function parseUniqueScans(records: unknown[]): Scan[] {
  const parsed = records.map(parseScan)
  const ids = new Set<string>()
  for (const scan of parsed) {
    if (ids.has(scan.id)) throw new Error('The scan response contained duplicate records.')
    ids.add(scan.id)
  }
  return parsed
}

function workspacePath(workspaceId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/scans`
}

export async function listScans(workspaceId: string): Promise<Scan[]> {
  const result = await requestJson(workspacePath(workspaceId))
  if (!Array.isArray(result.scans)) throw new Error('The scan response was invalid.')
  return parseUniqueScans(result.scans)
}

export async function createGitScan(
  workspaceId: string,
  url: string,
  branch?: string
): Promise<Scan> {
  const payload: { source: 'git'; url: string; branch?: string } = { source: 'git', url }
  if (branch?.trim()) payload.branch = branch.trim()
  const result = await requestJson(workspacePath(workspaceId), 'POST', payload)
  return parseScan(result.scan)
}

export async function createUploadScan(
  workspaceId: string,
  archive: Blob,
  filename: string
): Promise<Scan> {
  const session = getCurrentSession()
  if (!session) throw new Error('Your session has expired. Please sign in again.')

  const form = new FormData()
  form.append('source', 'upload')
  form.append('archive', archive, filename)

  const response = await fetch(`/api${workspacePath(workspaceId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}` },
    body: form
  })
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
  if (!response.ok || result.success !== true) {
    const message = typeof result.message === 'string' ? result.message : null
    throw new Error(message ?? `Request failed with status ${response.status}.`)
  }
  return parseScan(result.scan)
}

export async function getScan(workspaceId: string, scanId: string): Promise<Scan> {
  const result = await requestJson(
    `${workspacePath(workspaceId)}/${encodeURIComponent(scanId)}`
  )
  return parseScan(result.scan)
}

export async function getScanGraph(workspaceId: string, scanId: string): Promise<GraphDocument> {
  const result = await requestJson(
    `${workspacePath(workspaceId)}/${encodeURIComponent(scanId)}/graph`
  )
  if (!isRecord(result.graph)) throw new Error('The scan graph response was invalid.')
  const parsed = readGraph(JSON.stringify(result.graph))
  if (!parsed.ok) throw new Error('The scan graph failed validation.')
  return parsed.graph
}
