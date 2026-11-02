export const SCAN_STATUSES = ['queued', 'running', 'succeeded', 'failed'] as const
export type ScanStatus = typeof SCAN_STATUSES[number]

export interface WorkspaceScanRecord {
  id: string
  workspace_id: string
  requested_by: string
  source: 'git' | 'upload'
  source_url: string | null
  source_branch: string | null
  status: ScanStatus
  error_message: string | null
  graph_json: unknown
  report_json: unknown
  created_at: string | Date
  updated_at: string | Date
  started_at: string | Date | null
  finished_at: string | Date | null
}

export function serializeScan(record: WorkspaceScanRecord) {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    requestedBy: record.requested_by,
    source: record.source,
    url: record.source_url,
    branch: record.source_branch,
    status: record.status,
    errorMessage: record.error_message,
    createdAt: toIso(record.created_at),
    updatedAt: toIso(record.updated_at),
    startedAt: record.started_at ? toIso(record.started_at) : null,
    finishedAt: record.finished_at ? toIso(record.finished_at) : null
  }
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}
