import { getCurrentSession } from '../services/auth'
import type { GraphDocument } from '../viewer/graph-types'
import { readGraph } from '../viewer/read-graph'

export type ScanStatus = 'queued' | 'running' | 'succeeded' | 'failed'
export type ScanSource = 'git' | 'upload'

/** Scan job as returned by the workspace scans API (PR #16 contract). */
export interface Scan {
  id: string
  workspaceId: string
  requestedBy: string
  source: ScanSource
  url: string | null
  branch: string | null
  status: ScanStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
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

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value)
}

function parseScan(value: unknown): Scan {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    value.id.trim() !== value.id ||
    !isNonEmptyString(value.workspaceId) ||
    !isNonEmptyString(value.requestedBy) ||
    (value.source !== 'git' && value.source !== 'upload') ||
    (value.url !== null && typeof value.url !== 'string') ||
    (value.branch !== null && typeof value.branch !== 'string') ||
    (value.status !== 'queued' &&
      value.status !== 'running' &&
      value.status !== 'succeeded' &&
      value.status !== 'failed') ||
    (value.errorMessage !== null && typeof value.errorMessage !== 'string') ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    !isNullableTimestamp(value.startedAt) ||
    !isNullableTimestamp(value.finishedAt)
  ) {
    throw new Error('The scan response was invalid.')
  }
  return {
    id: value.id,
    workspaceId: value.workspaceId,
    requestedBy: value.requestedBy,
    source: value.source,
    url: value.url,
    branch: value.branch,
    status: value.status,
    errorMessage: value.errorMessage,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    startedAt: value.startedAt,
    finishedAt: value.finishedAt
  }
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
  const result = await readJsonResponse(response)

  if (!response.ok || result.success !== true) {
    throw new Error(apiFailureMessage(result, response.status))
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
  const result = await readJsonResponse(response)
  if (!response.ok || result.success !== true) {
    throw new Error(apiFailureMessage(result, response.status))
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
  const session = getCurrentSession()
  if (!session) throw new Error('Your session has expired. Please sign in again.')

  const response = await fetch(
    `/api${workspacePath(workspaceId)}/${encodeURIComponent(scanId)}/graph`,
    {
      headers: { Authorization: `Bearer ${session.token}` }
    }
  )
  const result = await readJsonResponse(response)

  if (response.status === 409) {
    throw new Error(apiFailureMessage(result, response.status))
  }
  if (!response.ok || result.success !== true) {
    throw new Error(apiFailureMessage(result, response.status))
  }
  if (!isRecord(result.graph)) throw new Error('The scan graph response was invalid.')
  const parsed = readGraph(JSON.stringify(result.graph))
  if (!parsed.ok) throw new Error('The scan graph failed validation.')
  return parsed.graph
}
