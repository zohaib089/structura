import { createHash, randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import {
  assertAllowlistedGitHttpsUrl,
  limitsFromEnv
} from '@atlasmith/source-ingest'
import { serializeScan } from './scan-contracts.js'
import {
  abortRunningWorkspaceScan,
  encodeUploadPayload,
  enqueueWorkspaceScan,
  removeQueuedWorkspaceScan
} from './scan-worker.js'
import type { WorkspaceDatabase } from './workspace-routes.js'

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function sessionToken(authorization: string | undefined) {
  if (!authorization?.startsWith('Bearer ')) return ''
  return authorization.slice(7).trim()
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

async function authenticatedUserId(authorization: string | undefined, database: WorkspaceDatabase) {
  const token = sessionToken(authorization)
  if (!token) return null
  const result = await database.query(
    'SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()',
    [digest(token)]
  )
  const userId = result.rows[0]?.user_id
  return typeof userId === 'string' ? userId : null
}

async function requireWorkspaceMember(
  database: WorkspaceDatabase,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const membership = await database.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  )
  return membership.rows.length > 0
}

function unauthenticated(reply: { code: (status: number) => { send: (payload: unknown) => unknown } }) {
  return reply.code(401).send({ success: false, message: 'An active session is required.' })
}

type MultipartScanRequest = FastifyRequest & {
  parts: () => AsyncIterableIterator<MultipartFile | { type: 'field'; fieldname: string; value: string }>
}

export function registerWorkspaceScanRoutes(app: FastifyInstance, database: WorkspaceDatabase) {
  const limits = limitsFromEnv()
  const worker = { query: database.query }

  app.post<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/scans',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const workspaceId = request.params.workspaceId
      if (!(await requireWorkspaceMember(database, workspaceId, userId))) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const contentType = String(request.headers['content-type'] ?? '')
      if (contentType.includes('multipart/form-data')) {
        return createUploadScan(request as MultipartScanRequest, reply, database, workspaceId, userId, limits, worker)
      }

      const body = readRecord(request.body)
      const source = body?.source
      if (source !== 'git') {
        return reply.code(400).send({
          success: false,
          message: 'Provide JSON { source: "git", url, branch? } or multipart upload with source=upload.'
        })
      }

      const url = typeof body?.url === 'string' ? body.url.trim() : ''
      const branch = typeof body?.branch === 'string' && body.branch.trim() ? body.branch.trim() : null
      if (!url) {
        return reply.code(400).send({ success: false, message: 'Git scans require a repository URL.' })
      }

      try {
        assertAllowlistedGitHttpsUrl(url)
      } catch (error) {
        return reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Repository URL is not allowed.'
        })
      }

      const id = randomUUID()
      const inserted = await database.query(
        `INSERT INTO workspace_scans (
           id, workspace_id, requested_by, source, source_url, source_branch, status
         ) VALUES ($1, $2, $3, 'git', $4, $5, 'queued')
         RETURNING id, workspace_id, requested_by, source, source_url, source_branch, status, step,
                   error_message, created_at, updated_at, started_at, finished_at`,
        [id, workspaceId, userId, url, branch]
      )
      enqueueWorkspaceScan(id, worker)
      return reply.code(202).send({ success: true, scan: serializeScan(inserted.rows[0] as never) })
    }
  )

  app.get<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/scans',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)
      if (!(await requireWorkspaceMember(database, request.params.workspaceId, userId))) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const result = await database.query(
        `SELECT id, workspace_id, requested_by, source, source_url, source_branch, status, step, error_message,
                created_at, updated_at, started_at, finished_at
         FROM workspace_scans
         WHERE workspace_id = $1
         ORDER BY created_at DESC, id`,
        [request.params.workspaceId]
      )
      return {
        success: true,
        scans: result.rows.map(row => serializeScan(row as never))
      }
    }
  )

  app.get<{ Params: { workspaceId: string; scanId: string } }>(
    '/api/workspaces/:workspaceId/scans/:scanId',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)
      if (!(await requireWorkspaceMember(database, request.params.workspaceId, userId))) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const result = await database.query(
        `SELECT id, workspace_id, requested_by, source, source_url, source_branch, status, step, error_message,
                created_at, updated_at, started_at, finished_at
         FROM workspace_scans
         WHERE workspace_id = $1 AND id = $2`,
        [request.params.workspaceId, request.params.scanId]
      )
      const scan = result.rows[0]
      if (!scan) {
        return reply.code(404).send({ success: false, message: 'Scan not found.' })
      }
      return { success: true, scan: serializeScan(scan as never) }
    }
  )

  app.post<{ Params: { workspaceId: string; scanId: string } }>(
    '/api/workspaces/:workspaceId/scans/:scanId/cancel',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)
      if (!(await requireWorkspaceMember(database, request.params.workspaceId, userId))) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const existing = await database.query(
        `SELECT id, workspace_id, requested_by, source, source_url, source_branch, status, step, error_message,
                created_at, updated_at, started_at, finished_at
         FROM workspace_scans
         WHERE workspace_id = $1 AND id = $2`,
        [request.params.workspaceId, request.params.scanId]
      )
      const scan = existing.rows[0]
      if (!scan) {
        return reply.code(404).send({ success: false, message: 'Scan not found.' })
      }

      const status = String(scan.status)
      if (status === 'succeeded' || status === 'failed' || status === 'cancelled') {
        return reply.code(409).send({
          success: false,
          message: 'Scan has already finished.'
        })
      }

      const finishedAt = new Date()
      if (status === 'queued') {
        removeQueuedWorkspaceScan(request.params.scanId)
        const updated = await database.query(
          `UPDATE workspace_scans
           SET status = 'cancelled', step = NULL, finished_at = $1, updated_at = NOW()
           WHERE workspace_id = $2 AND id = $3 AND status = 'queued'
           RETURNING id, workspace_id, requested_by, source, source_url, source_branch, status, step,
                     error_message, created_at, updated_at, started_at, finished_at`,
          [finishedAt, request.params.workspaceId, request.params.scanId]
        )
        return { success: true, scan: serializeScan(updated.rows[0] as never) }
      }

      const updated = await database.query(
        `UPDATE workspace_scans
         SET status = 'cancelled', step = NULL, finished_at = $1, updated_at = NOW()
         WHERE workspace_id = $2 AND id = $3 AND status = 'running'
         RETURNING id, workspace_id, requested_by, source, source_url, source_branch, status, step,
                   error_message, created_at, updated_at, started_at, finished_at`,
        [finishedAt, request.params.workspaceId, request.params.scanId]
      )
      if (updated.rows.length === 0) {
        return reply.code(409).send({
          success: false,
          message: 'Scan has already finished.'
        })
      }

      abortRunningWorkspaceScan(request.params.scanId)
      return { success: true, scan: serializeScan(updated.rows[0] as never) }
    }
  )

  app.get<{ Params: { workspaceId: string; scanId: string } }>(
    '/api/workspaces/:workspaceId/scans/:scanId/graph',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)
      if (!(await requireWorkspaceMember(database, request.params.workspaceId, userId))) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const result = await database.query(
        `SELECT status, graph_json
         FROM workspace_scans
         WHERE workspace_id = $1 AND id = $2`,
        [request.params.workspaceId, request.params.scanId]
      )
      const scan = result.rows[0]
      if (!scan) {
        return reply.code(404).send({ success: false, message: 'Scan not found.' })
      }
      if (scan.status === 'queued' || scan.status === 'running') {
        return reply.code(409).send({
          success: false,
          message: 'Graph is not ready yet.',
          status: scan.status
        })
      }
      if (scan.status === 'failed' || scan.graph_json == null) {
        return reply.code(404).send({ success: false, message: 'Graph is not available for this scan.' })
      }

      return { success: true, graph: scan.graph_json }
    }
  )

  app.get<{ Params: { workspaceId: string; scanId: string } }>(
    '/api/workspaces/:workspaceId/scans/:scanId/report',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)
      if (!(await requireWorkspaceMember(database, request.params.workspaceId, userId))) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const result = await database.query(
        `SELECT status, report_json
         FROM workspace_scans
         WHERE workspace_id = $1 AND id = $2`,
        [request.params.workspaceId, request.params.scanId]
      )
      const scan = result.rows[0]
      if (!scan) {
        return reply.code(404).send({ success: false, message: 'Scan not found.' })
      }
      if (scan.status === 'queued' || scan.status === 'running') {
        return reply.code(409).send({
          success: false,
          message: 'Report is not ready yet.',
          status: scan.status
        })
      }
      if (scan.status === 'failed' || scan.report_json == null) {
        return reply.code(404).send({ success: false, message: 'Report is not available for this scan.' })
      }

      return { success: true, report: scan.report_json }
    }
  )
}

async function createUploadScan(
  request: MultipartScanRequest,
  reply: FastifyReply,
  database: WorkspaceDatabase,
  workspaceId: string,
  userId: string,
  limits: ReturnType<typeof limitsFromEnv>,
  worker: { query: WorkspaceDatabase['query'] }
) {
  let source = ''
  let uploadBuffer: Buffer | undefined

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      uploadBuffer = await writeUploadBufferFromPart(part, limits)
      continue
    }
    if (part.type === 'field' && part.fieldname === 'source') {
      source = String(part.value)
    }
  }

  if (source !== 'upload' || !uploadBuffer) {
    return reply.code(400).send({
      success: false,
      message: 'Multipart scans require source=upload and a single archive file field.'
    })
  }

  const id = randomUUID()
  const inserted = await database.query(
    `INSERT INTO workspace_scans (
       id, workspace_id, requested_by, source, upload_payload, status
     ) VALUES ($1, $2, $3, 'upload', $4, 'queued')
     RETURNING id, workspace_id, requested_by, source, source_url, source_branch, status, step,
               error_message, created_at, updated_at, started_at, finished_at`,
    [id, workspaceId, userId, encodeUploadPayload(uploadBuffer)]
  )
  enqueueWorkspaceScan(id, worker)
  return reply.code(202).send({ success: true, scan: serializeScan(inserted.rows[0] as never) })
}

async function writeUploadBufferFromPart(
  part: MultipartFile,
  limits: ReturnType<typeof limitsFromEnv>
): Promise<Buffer> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of part.file) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > limits.maxRepoBytes) {
      throw new Error('Upload exceeds the configured size limit.')
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}
