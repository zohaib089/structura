import { createHash, randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import { answerGraphQuestion, GRAPH_QA_MAX_QUESTION_LENGTH, isGraphLike } from '@atlasmith/engine'
import {
  assertAllowlistedGitHttpsUrl,
  limitsFromEnv
} from '@atlasmith/source-ingest'
import { serializeScan } from '../workers/scan-contracts.js'
import {
  abortRunningWorkspaceScan,
  encodeUploadPayload,
  enqueueWorkspaceScan,
  removeQueuedWorkspaceScan
} from '../workers/scan-worker.js'
import { canAccessProjectScan, hasProjectAccess } from '../services/project-access.js'
import { loadScanFileMeta } from '../services/scan-file-meta.js'
import type { WorkspaceDatabase, WorkspaceQuery } from '../db/types.js'

const SCAN_COLUMNS = `id, workspace_id, requested_by, source, source_url, source_branch, status, step,
                error_message, created_at, updated_at, started_at, finished_at, project_id`

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

async function loadWorkspaceMembership(
  database: WorkspaceDatabase,
  workspaceId: string,
  userId: string
): Promise<{ role: string } | null> {
  const membership = await database.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  )
  const role = membership.rows[0]?.role
  return typeof role === 'string' && role.length > 0 ? { role } : null
}

function unauthenticated(reply: { code: (status: number) => { send: (payload: unknown) => unknown } }) {
  return reply.code(401).send({ success: false, message: 'An active session is required.' })
}

function readOptionalProjectId(
  value: unknown
): { ok: true; projectId: string | null } | { ok: false; message: string } {
  if (value === undefined || value === null) return { ok: true, projectId: null }
  if (typeof value !== 'string') {
    return { ok: false, message: 'project_id must be a string.' }
  }
  const projectId = value.trim()
  if (!projectId) return { ok: true, projectId: null }
  return { ok: true, projectId }
}

async function resolveAccessibleProject(
  query: WorkspaceQuery,
  workspaceId: string,
  projectId: string,
  userId: string,
  role: string
): Promise<{ id: string } | null> {
  const result = await query(
    `SELECT p.id, p.access_restricted,
            EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = $3
            ) AS is_listed
     FROM projects p
     WHERE p.id = $1 AND p.workspace_id = $2`,
    [projectId, workspaceId, userId]
  )
  const project = result.rows[0]
  if (!project || !hasProjectAccess(role, project.access_restricted, project.is_listed)) return null
  return { id: String(project.id) }
}

async function insertScanWithOptionalProject(
  database: WorkspaceDatabase,
  workspaceId: string,
  userId: string,
  role: string,
  projectId: string | null,
  insert: (query: WorkspaceQuery, resolvedProjectId: string | null) => ReturnType<WorkspaceQuery>
): Promise<{ denied: true } | { denied: false; row: Record<string, unknown> }> {
  return database.transaction(async query => {
    let resolved = projectId
    if (resolved) {
      const project = await resolveAccessibleProject(query, workspaceId, resolved, userId, role)
      if (!project) return { denied: true as const }
      resolved = project.id
    }
    const inserted = await insert(query, resolved)
    return { denied: false as const, row: inserted.rows[0] as Record<string, unknown> }
  })
}

async function loadAccessibleScan(
  query: WorkspaceQuery,
  workspaceId: string,
  scanId: string,
  userId: string,
  role: string
): Promise<Record<string, unknown> | null> {
  const result = await query(
    `SELECT s.id, s.workspace_id, s.requested_by, s.source, s.source_url, s.source_branch, s.status, s.step,
            s.error_message, s.created_at, s.updated_at, s.started_at, s.finished_at, s.project_id,
            s.graph_json, s.report_json,
            p.access_restricted AS project_access_restricted,
            EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = s.project_id AND pm.user_id = $3
            ) AS project_is_listed
     FROM workspace_scans s
     LEFT JOIN projects p ON p.id = s.project_id
     WHERE s.workspace_id = $1 AND s.id = $2`,
    [workspaceId, scanId, userId]
  )
  const scan = result.rows[0]
  if (!scan) return null
  if (!canAccessProjectScan(role, scan.project_id, scan.project_access_restricted, scan.project_is_listed)) {
    return null
  }
  return scan
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
      const membership = await loadWorkspaceMembership(database, workspaceId, userId)
      if (!membership) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const contentType = String(request.headers['content-type'] ?? '')
      if (contentType.includes('multipart/form-data')) {
        return createUploadScan(
          request as MultipartScanRequest,
          reply,
          database,
          workspaceId,
          userId,
          membership.role,
          limits,
          worker
        )
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

      const projectIdResult = readOptionalProjectId(body?.project_id)
      if (!projectIdResult.ok) {
        return reply.code(400).send({ success: false, message: projectIdResult.message })
      }

      const id = randomUUID()
      const inserted = await insertScanWithOptionalProject(
        database,
        workspaceId,
        userId,
        membership.role,
        projectIdResult.projectId,
        (query, projectId) =>
          query(
            `INSERT INTO workspace_scans (
               id, workspace_id, requested_by, source, source_url, source_branch, project_id, status
             ) VALUES ($1, $2, $3, 'git', $4, $5, $6, 'queued')
             RETURNING ${SCAN_COLUMNS}`,
            [id, workspaceId, userId, url, branch, projectId]
          )
      )
      if (inserted.denied) {
        return reply.code(404).send({ success: false, message: 'Project not found.' })
      }
      enqueueWorkspaceScan(id, worker)
      return reply.code(202).send({ success: true, scan: serializeScan(inserted.row as never) })
    }
  )

  app.get<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/scans',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)
      if (!(await loadWorkspaceMembership(database, request.params.workspaceId, userId))) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const result = await database.query(
        `SELECT s.id, s.workspace_id, s.requested_by, s.source, s.source_url, s.source_branch, s.status, s.step,
                s.error_message, s.created_at, s.updated_at, s.started_at, s.finished_at, s.project_id
         FROM workspace_scans s
         JOIN workspace_members wm
           ON wm.workspace_id = s.workspace_id AND wm.user_id = $2
         LEFT JOIN projects p ON p.id = s.project_id
         WHERE s.workspace_id = $1
           AND (
             s.project_id IS NULL
             OR wm.role IN ('owner', 'admin')
             OR p.access_restricted IS NOT TRUE
             OR EXISTS (
               SELECT 1
               FROM project_members pm
               WHERE pm.project_id = s.project_id AND pm.user_id = $2
             )
           )
         ORDER BY s.created_at DESC, s.id`,
        [request.params.workspaceId, userId]
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
      const membership = await loadWorkspaceMembership(database, request.params.workspaceId, userId)
      if (!membership) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const scan = await loadAccessibleScan(
        database.query,
        request.params.workspaceId,
        request.params.scanId,
        userId,
        membership.role
      )
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
      const membership = await loadWorkspaceMembership(database, request.params.workspaceId, userId)
      if (!membership) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const scan = await loadAccessibleScan(
        database.query,
        request.params.workspaceId,
        request.params.scanId,
        userId,
        membership.role
      )
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
           RETURNING ${SCAN_COLUMNS}`,
          [finishedAt, request.params.workspaceId, request.params.scanId]
        )
        return { success: true, scan: serializeScan(updated.rows[0] as never) }
      }

      const updated = await database.query(
        `UPDATE workspace_scans
         SET status = 'cancelled', step = NULL, finished_at = $1, updated_at = NOW()
         WHERE workspace_id = $2 AND id = $3 AND status = 'running'
         RETURNING ${SCAN_COLUMNS}`,
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
      const membership = await loadWorkspaceMembership(database, request.params.workspaceId, userId)
      if (!membership) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const scan = await loadAccessibleScan(
        database.query,
        request.params.workspaceId,
        request.params.scanId,
        userId,
        membership.role
      )
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

  app.post<{ Params: { workspaceId: string; scanId: string } }>(
    '/api/workspaces/:workspaceId/scans/:scanId/ask',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)
      const membership = await loadWorkspaceMembership(database, request.params.workspaceId, userId)
      if (!membership) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const body = readRecord(request.body)
      const question = typeof body?.question === 'string' ? body.question.trim() : ''
      if (!body || !('question' in body) || typeof body.question !== 'string' || question.length === 0) {
        return reply.code(400).send({ success: false, message: 'A question is required.' })
      }
      if (question.length > GRAPH_QA_MAX_QUESTION_LENGTH) {
        return reply.code(400).send({
          success: false,
          message: `Question must be ${GRAPH_QA_MAX_QUESTION_LENGTH} characters or fewer.`
        })
      }

      const scan = await loadAccessibleScan(
        database.query,
        request.params.workspaceId,
        request.params.scanId,
        userId,
        membership.role
      )
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
      if (scan.status === 'failed' || scan.graph_json == null || !isGraphLike(scan.graph_json)) {
        return reply.code(404).send({ success: false, message: 'Graph is not available for this scan.' })
      }

      const qa = answerGraphQuestion(scan.graph_json, question)
      return {
        success: true,
        intent: qa.intent,
        answer: qa.answer,
        citations: qa.citations,
        suggestions: qa.suggestions
      }
    }
  )

  app.get<{ Params: { workspaceId: string; scanId: string } }>(
    '/api/workspaces/:workspaceId/scans/:scanId/report',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)
      const membership = await loadWorkspaceMembership(database, request.params.workspaceId, userId)
      if (!membership) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const scan = await loadAccessibleScan(
        database.query,
        request.params.workspaceId,
        request.params.scanId,
        userId,
        membership.role
      )
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

  app.get<{ Params: { workspaceId: string; scanId: string }; Querystring: { path?: string; paths?: string } }>(
    '/api/workspaces/:workspaceId/scans/:scanId/file-meta',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)
      const membership = await loadWorkspaceMembership(database, request.params.workspaceId, userId)
      if (!membership) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const singlePath = typeof request.query.path === 'string' ? request.query.path.trim() : ''
      const batchRaw = typeof request.query.paths === 'string' ? request.query.paths.trim() : ''
      const requestedPaths =
        batchRaw.length > 0
          ? batchRaw
              .split(',')
              .map(part => part.trim())
              .filter(part => part.length > 0)
          : singlePath.length > 0
            ? [singlePath]
            : []

      if (requestedPaths.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'Provide path=<repo-relative path> or paths=<comma-separated paths>.'
        })
      }

      const scan = await loadAccessibleScan(
        database.query,
        request.params.workspaceId,
        request.params.scanId,
        userId,
        membership.role
      )
      if (!scan) {
        return reply.code(404).send({ success: false, message: 'Scan not found.' })
      }
      if (scan.status === 'queued' || scan.status === 'running') {
        return reply.code(409).send({
          success: false,
          message: 'File metadata is not ready yet.',
          status: scan.status
        })
      }
      if (scan.status === 'failed') {
        return reply.code(404).send({ success: false, message: 'File metadata is not available for this scan.' })
      }

      const summaries = await loadScanFileMeta(database.query, request.params.scanId, requestedPaths)
      return {
        success: true,
        files: requestedPaths.map(path => ({
          path,
          summary: summaries.get(path) ?? null
        }))
      }
    }
  )
}

async function createUploadScan(
  request: MultipartScanRequest,
  reply: FastifyReply,
  database: WorkspaceDatabase,
  workspaceId: string,
  userId: string,
  role: string,
  limits: ReturnType<typeof limitsFromEnv>,
  worker: { query: WorkspaceDatabase['query'] }
) {
  let source = ''
  let projectIdRaw: unknown
  let uploadBuffer: Buffer | undefined

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      uploadBuffer = await writeUploadBufferFromPart(part, limits)
      continue
    }
    if (part.type === 'field' && part.fieldname === 'source') {
      source = String(part.value)
    }
    if (part.type === 'field' && part.fieldname === 'project_id') {
      projectIdRaw = String(part.value)
    }
  }

  if (source !== 'upload' || !uploadBuffer) {
    return reply.code(400).send({
      success: false,
      message: 'Multipart scans require source=upload and a single archive file field.'
    })
  }

  const projectIdResult = readOptionalProjectId(projectIdRaw)
  if (!projectIdResult.ok) {
    return reply.code(400).send({ success: false, message: projectIdResult.message })
  }

  const id = randomUUID()
  const inserted = await insertScanWithOptionalProject(
    database,
    workspaceId,
    userId,
    role,
    projectIdResult.projectId,
    (query, projectId) =>
      query(
        `INSERT INTO workspace_scans (
           id, workspace_id, requested_by, source, upload_payload, project_id, status
         ) VALUES ($1, $2, $3, 'upload', $4, $5, 'queued')
         RETURNING ${SCAN_COLUMNS}`,
        [id, workspaceId, userId, encodeUploadPayload(uploadBuffer!), projectId]
      )
  )
  if (inserted.denied) {
    return reply.code(404).send({ success: false, message: 'Project not found.' })
  }
  enqueueWorkspaceScan(id, worker)
  return reply.code(202).send({ success: true, scan: serializeScan(inserted.row as never) })
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
