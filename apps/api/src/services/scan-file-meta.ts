import type { WorkspaceQuery } from '../routes/workspace-routes.js'

const BATCH_SIZE = 500

export interface ScanFileMetaEntry {
  path: string
  summary: string | null
}

export async function replaceScanFileMeta(
  query: WorkspaceQuery,
  scanId: string,
  entries: readonly ScanFileMetaEntry[]
): Promise<void> {
  await query('DELETE FROM workspace_scan_file_meta WHERE scan_id = $1', [scanId])
  for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
    const batch = entries.slice(offset, offset + BATCH_SIZE)
    const paths: string[] = []
    const summaries: Array<string | null> = []
    for (const entry of batch) {
      paths.push(entry.path)
      summaries.push(entry.summary)
    }
    await query(
      `INSERT INTO workspace_scan_file_meta (scan_id, path, summary)
       SELECT $1, path, summary
       FROM UNNEST($2::text[], $3::text[]) AS rows(path, summary)`,
      [scanId, paths, summaries]
    )
  }
}

export async function loadScanFileMeta(
  query: WorkspaceQuery,
  scanId: string,
  paths: readonly string[]
): Promise<Map<string, string | null>> {
  if (paths.length === 0) return new Map()
  const result = await query(
    `SELECT path, summary
     FROM workspace_scan_file_meta
     WHERE scan_id = $1 AND path = ANY($2::text[])`,
    [scanId, paths]
  )
  const out = new Map<string, string | null>()
  for (const row of result.rows) {
    out.set(String(row.path), row.summary == null ? null : String(row.summary))
  }
  return out
}
