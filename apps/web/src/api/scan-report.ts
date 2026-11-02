import { getCurrentSession } from '../services/auth'
import type { ScanReportV1 } from './scan-report-types'
import { parseScanReportV1 } from './scan-report-parse'

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

function reportPath(workspaceId: string, scanId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/scans/${encodeURIComponent(scanId)}/report`
}

export async function getScanReport(workspaceId: string, scanId: string): Promise<ScanReportV1> {
  const session = getCurrentSession()
  if (!session) throw new Error('Your session has expired. Please sign in again.')

  const response = await fetch(`/api${reportPath(workspaceId, scanId)}`, {
    headers: { Authorization: `Bearer ${session.token}` }
  })
  const result = await readJsonResponse(response)

  if (response.status === 409) {
    throw new Error(apiFailureMessage(result, response.status))
  }
  if (!response.ok || result.success !== true) {
    throw new Error(apiFailureMessage(result, response.status))
  }
  if (!isRecord(result.report)) throw new Error('The scan report response was invalid.')
  return parseScanReportV1(result.report)
}
