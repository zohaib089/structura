import { scanRepository } from '@atlasmith/engine'
import { runScanAnalysis } from '@atlasmith/scan-analysis'
import {
  assertAllowlistedGitHttpsUrl,
  createTempWorkspace,
  extractArchiveToDirectory,
  limitsFromEnv,
  redactKnownToken,
  redactSecrets,
  shallowCloneRepository,
  type SourceIngestLimits
} from '@atlasmith/source-ingest'
import { writeFile } from 'node:fs/promises'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import type { ScanStatus, WorkspaceScanRecord } from './scan-contracts.js'
import type { WorkspaceQuery } from './workspace-routes.js'

export interface ScanWorkerDependencies {
  query: WorkspaceQuery
  limits?: SourceIngestLimits
  now?: () => Date
  runScan?: typeof scanRepository
  runAnalysis?: typeof runScanAnalysis
  cloneRepository?: typeof shallowCloneRepository
  extractArchive?: typeof extractArchiveToDirectory
}

const queue = new Set<string>()
let draining = false

export function enqueueWorkspaceScan(scanId: string, dependencies: ScanWorkerDependencies): void {
  queue.add(scanId)
  void drainScanQueue(dependencies).catch(error => {
    logScanWorkerError('scan queue drain failed', error)
  })
}

async function drainScanQueue(dependencies: ScanWorkerDependencies): Promise<void> {
  if (draining) return
  draining = true
  try {
    while (queue.size > 0) {
      const scanId = queue.values().next().value as string
      queue.delete(scanId)
      try {
        await runWorkspaceScan(scanId, dependencies)
      } catch (error) {
        logScanWorkerError(`scan ${scanId} failed unexpectedly`, error)
      }
    }
  } finally {
    draining = false
  }
}

async function runWorkspaceScan(scanId: string, dependencies: ScanWorkerDependencies): Promise<void> {
  const limits = dependencies.limits ?? limitsFromEnv()
  const now = dependencies.now ?? (() => new Date())
  const runScan = dependencies.runScan ?? scanRepository
  const runAnalysis = dependencies.runAnalysis ?? runScanAnalysis
  const cloneRepository = dependencies.cloneRepository ?? shallowCloneRepository
  const extractArchive = dependencies.extractArchive ?? extractArchiveToDirectory

  const scan = await loadScan(dependencies.query, scanId)
  if (!scan || scan.status !== 'queued') return

  const uploadPayload = scan.upload_payload

  try {
    await updateScan(dependencies.query, scanId, {
      status: 'running',
      started_at: now(),
      error_message: null,
      upload_payload: null
    })
  } catch (error) {
    await failScanSafely(dependencies.query, scanId, error, now)
    return
  }

  let cleanupSource: (() => Promise<void>) | undefined

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Scan timed out.')), limits.timeoutMs)
      void (async () => {
        try {
    let sourceRoot: string
    if (scan.source === 'git') {
      const parsed = assertAllowlistedGitHttpsUrl(String(scan.source_url))
      const clone = await cloneRepository({
        url: parsed,
        branch: scan.source_branch ?? undefined,
        limits,
        githubToken: process.env.GITHUB_TOKEN,
        gitlabToken: process.env.GITLAB_TOKEN
      })
      sourceRoot = clone.directory
      cleanupSource = clone.cleanup
    } else {
      const workspace = await createTempWorkspace('structura-upload-')
      const archivePath = join(workspace.directory, 'upload.archive')
      if (!uploadPayload) throw new Error('Upload scan is missing its payload.')
      await writeFile(archivePath, Buffer.from(uploadPayload, 'base64'))
      const extracted = await extractArchive(archivePath, join(workspace.directory, 'root'), { limits })
      sourceRoot = extracted.rootDir
      cleanupSource = workspace.cleanup
    }

    const output = await runScan(sourceRoot, { noCache: true, limits: { jobs: 1 } })
    const graph = JSON.parse(output.graphJson) as unknown
    const hasGit =
      scan.source === 'git' ||
      (await access(join(sourceRoot, '.git')).then(() => true).catch(() => false))
    const report = await runAnalysis({
      rootDir: sourceRoot,
      graph,
      hasGit,
      limits: { allowNetwork: Boolean(process.env.SCAN_ANALYSIS_ALLOW_NETWORK) }
    })
    await updateScan(dependencies.query, scanId, {
      status: 'succeeded',
      graph_json: graph,
      report_json: report,
      finished_at: now(),
      error_message: null
    })
          resolve()
        } catch (error) {
          reject(error)
        } finally {
          clearTimeout(timer)
        }
      })()
    })
  } catch (error) {
    await failScanSafely(dependencies.query, scanId, error, now)
  } finally {
    await cleanupSource?.()
  }
}

async function failScanSafely(
  query: WorkspaceQuery,
  scanId: string,
  error: unknown,
  now: () => Date
): Promise<void> {
  const message = redactFailureMessage(error)
  try {
    await updateScan(query, scanId, {
      status: 'failed',
      finished_at: now(),
      error_message: message,
      graph_json: null,
      report_json: null
    })
  } catch (updateError) {
    logScanWorkerError(`could not mark scan ${scanId} as failed`, updateError)
  }
}

function logScanWorkerError(context: string, error: unknown): void {
  console.error(`[scan-worker] ${context}: ${redactFailureMessage(error)}`)
}

function redactFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return redactKnownToken(redactSecrets(message), process.env.GITHUB_TOKEN)
    .slice(0, 2000)
}

export async function recoverWorkspaceScansOnStartup(dependencies: ScanWorkerDependencies): Promise<void> {
  const result = await dependencies.query(
    `SELECT id, source, source_url, upload_payload, status
     FROM workspace_scans
     WHERE status IN ('queued', 'running')`
  )

  for (const row of result.rows) {
    const id = String(row.id)
    const source = String(row.source)
    const status = String(row.status)
    const sourceUrl = row.source_url
    const uploadPayload = row.upload_payload

    const queuedAndRunnable =
      status === 'queued' &&
      ((source === 'git' && typeof sourceUrl === 'string' && sourceUrl.length > 0) ||
        (source === 'upload' && typeof uploadPayload === 'string' && uploadPayload.length > 0))

    if (status === 'running') {
      await failScanSafely(
        dependencies.query,
        id,
        new Error('Scan was interrupted when the server restarted.'),
        dependencies.now ?? (() => new Date())
      )
      continue
    }

    if (!queuedAndRunnable) {
      await failScanSafely(
        dependencies.query,
        id,
        new Error('Scan could not be resumed because required source data is missing.'),
        dependencies.now ?? (() => new Date())
      )
      continue
    }

    enqueueWorkspaceScan(id, dependencies)
  }
}

async function loadScan(query: WorkspaceQuery, scanId: string): Promise<(WorkspaceScanRecord & { upload_payload?: string | null }) | null> {
  const result = await query(
    `SELECT id, workspace_id, requested_by, source, source_url, source_branch, upload_payload, status, error_message,
            graph_json, report_json, created_at, updated_at, started_at, finished_at
     FROM workspace_scans
     WHERE id = $1`,
    [scanId]
  )
  const row = result.rows[0]
  if (!row) return null
  return row as unknown as WorkspaceScanRecord & { upload_payload?: string | null }
}

async function updateScan(
  query: WorkspaceQuery,
  scanId: string,
  patch: Partial<{
    status: ScanStatus
    error_message: string | null
    graph_json: unknown
    report_json: unknown
    started_at: Date
    finished_at: Date
    upload_payload: null
  }>
): Promise<void> {
  const fields: string[] = ['updated_at = NOW()']
  const params: unknown[] = []
  let index = 1

  if (patch.status !== undefined) {
    fields.push(`status = $${index++}`)
    params.push(patch.status)
  }
  if (patch.error_message !== undefined) {
    fields.push(`error_message = $${index++}`)
    params.push(patch.error_message)
  }
  if (patch.graph_json !== undefined) {
    fields.push(`graph_json = $${index++}`)
    params.push(patch.graph_json)
  }
  if (patch.report_json !== undefined) {
    fields.push(`report_json = $${index++}`)
    params.push(patch.report_json)
  }
  if (patch.started_at !== undefined) {
    fields.push(`started_at = $${index++}`)
    params.push(patch.started_at)
  }
  if (patch.finished_at !== undefined) {
    fields.push(`finished_at = $${index++}`)
    params.push(patch.finished_at)
  }
  if (patch.upload_payload === null) {
    fields.push('upload_payload = NULL')
  }

  params.push(scanId)
  await query(`UPDATE workspace_scans SET ${fields.join(', ')} WHERE id = $${index}`, params)
}

export function encodeUploadPayload(payload: Buffer): string {
  return payload.toString('base64')
}

export { runWorkspaceScan }
