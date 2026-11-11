import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

export interface WorkspaceQueryResult {
  rows: Array<Record<string, unknown>>
  rowCount?: number | null
}

export type WorkspaceQuery = (
  text: string,
  params?: unknown[]
) => Promise<WorkspaceQueryResult>

export type WorkspaceTransaction = <T>(
  operation: (query: WorkspaceQuery) => Promise<T>
) => Promise<T>

export interface WorkspaceDatabase {
  query: WorkspaceQuery
  transaction: WorkspaceTransaction
}

export interface WorkspaceInvitationDependencies {
  frontendUrl: string
  deliverInvitation: (
    email: string,
    workspaceName: string,
    inviterName: string,
    acceptanceUrl: string
  ) => Promise<void>
  onDeliveryFailure: (error: unknown) => void
}

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

async function authenticatedUserId(
  authorization: string | undefined,
  database: WorkspaceDatabase
) {
  const token = sessionToken(authorization)
  if (!token) return null

  const result = await database.query(
    'SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()',
    [digest(token)]
  )
  const userId = result.rows[0]?.user_id
  return typeof userId === 'string' ? userId : null
}

function unauthenticated(reply: {
  code: (status: number) => { send: (payload: unknown) => unknown }
}) {
  return reply.code(401).send({ success: false, message: 'An active session is required.' })
}

export function registerWorkspaceRoutes(app: FastifyInstance, database: WorkspaceDatabase) {
  app.get('/api/workspaces', async (request, reply) => {
    const userId = await authenticatedUserId(request.headers.authorization, database)
    if (!userId) return unauthenticated(reply)

    const result = await database.query(
      `SELECT w.id, w.name, wm.role, w.created_at, w.updated_at
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       WHERE wm.user_id = $1
       ORDER BY w.created_at, w.id`,
      [userId]
    )
    return { success: true, workspaces: result.rows }
  })

  app.post('/api/workspaces', async (request, reply) => {
    const userId = await authenticatedUserId(request.headers.authorization, database)
    if (!userId) return unauthenticated(reply)

    const body = readRecord(request.body)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (name.length < 1 || name.length > 120) {
      return reply.code(400).send({
        success: false,
        message: 'Workspace name must be between 1 and 120 characters.'
      })
    }

    const id = randomUUID()
    const workspace = await database.transaction(async query => {
      const result = await query(
        `INSERT INTO workspaces (id, name, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, name, created_at, updated_at`,
        [id, name, userId]
      )
      const createdWorkspace = result.rows[0]
      if (!createdWorkspace) throw new Error('Workspace insert did not return a record.')
      await query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
        [id, userId, 'owner']
      )
      return createdWorkspace
    })

    return reply.code(201).send({
      success: true,
      workspace: { ...workspace, role: 'owner' }
    })
  })

  app.get<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/projects',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const membership = await database.query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [request.params.workspaceId, userId]
      )
      if (membership.rows.length === 0) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const result = await database.query(
        `SELECT id, name, description, created_at, updated_at
         FROM projects
         WHERE workspace_id = $1
           AND EXISTS (
             SELECT 1
             FROM workspace_members
             WHERE workspace_id = $1 AND user_id = $2
           )
         ORDER BY updated_at DESC, id`,
        [request.params.workspaceId, userId]
      )
      return { success: true, projects: result.rows }
    }
  )

  app.post<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/projects',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const membership = await database.query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [request.params.workspaceId, userId]
      )
      const role = membership.rows[0]?.role
      if (typeof role !== 'string') {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Workspace admin access is required to create projects.'
        })
      }

      const body = readRecord(request.body)
      const name = typeof body?.name === 'string' ? body.name.trim() : ''
      const description = typeof body?.description === 'string' ? body.description.trim() : ''
      if (
        name.length < 1 ||
        name.length > 120 ||
        (body?.description !== undefined && typeof body.description !== 'string') ||
        description.length > 2000
      ) {
        return reply.code(400).send({
          success: false,
          message: 'Provide a project name up to 120 characters and a description up to 2000 characters.'
        })
      }

      const id = randomUUID()
      const result = await database.query(
        `INSERT INTO projects (id, workspace_id, name, description, created_by)
         SELECT $1, $2, $3, $4, $5
         WHERE EXISTS (
           SELECT 1
           FROM workspace_members
           WHERE workspace_id = $2 AND user_id = $5 AND role IN ('owner', 'admin')
         )
         RETURNING id, name, description, created_at, updated_at`,
        [id, request.params.workspaceId, name, description, userId]
      )
      const project = result.rows[0]
      if (!project) {
        return reply.code(403).send({
          success: false,
          message: 'Workspace admin access is required to create projects.'
        })
      }
      return reply.code(201).send({ success: true, project })
    }
  )
}

export function registerWorkspaceInvitationRoutes(
  app: FastifyInstance,
  database: WorkspaceDatabase,
  dependencies: WorkspaceInvitationDependencies
) {
  app.get<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/members',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const membership = await database.query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [request.params.workspaceId, userId]
      )
      if (!membership.rows[0]) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }

      const result = await database.query(
        `SELECT u.id, u.full_name, u.email, wm.role, wm.created_at
         FROM workspace_members wm
         JOIN users u ON u.id = wm.user_id
         WHERE wm.workspace_id = $1
         ORDER BY CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.full_name, u.id`,
        [request.params.workspaceId]
      )
      return { success: true, members: result.rows }
    }
  )

  app.get<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/invitations',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const membership = await database.query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [request.params.workspaceId, userId]
      )
      const role = membership.rows[0]?.role
      if (typeof role !== 'string') {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Workspace admin access is required.' })
      }

      const result = await database.query(
        `SELECT i.id, i.email, i.role, i.created_at, i.expires_at, u.full_name AS inviter_name
         FROM workspace_invitations i
         JOIN users u ON u.id = i.created_by
         WHERE i.workspace_id = $1
           AND i.accepted_at IS NULL
           AND i.revoked_at IS NULL
           AND i.expires_at > NOW()
         ORDER BY i.created_at, i.id`,
        [request.params.workspaceId]
      )
      return { success: true, invitations: result.rows }
    }
  )

  app.post<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/invitations',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const body = readRecord(request.body)
      const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.code(400).send({ success: false, message: 'Provide a valid invitation email address.' })
      }

      const workspaceResult = await database.query(
        `SELECT w.name AS workspace_name, wm.role, u.full_name AS inviter_name
         FROM workspaces w
         JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $2
         JOIN users u ON u.id = $2
         WHERE w.id = $1`,
        [request.params.workspaceId, userId]
      )
      const workspace = workspaceResult.rows[0]
      if (!workspace) {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }
      if (workspace.role !== 'owner' && workspace.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Workspace admin access is required.' })
      }

      const existingMember = await database.query(
        `SELECT 1 FROM workspace_members wm
         JOIN users u ON u.id = wm.user_id
         WHERE wm.workspace_id = $1 AND lower(u.email) = $2`,
        [request.params.workspaceId, email]
      )
      if (existingMember.rows.length > 0) {
        return reply.code(409).send({ success: false, message: 'This person is already a workspace member.' })
      }

      const activeInvitation = await database.query(
        `SELECT 1 FROM workspace_invitations
         WHERE workspace_id = $1 AND email = $2
           AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()`,
        [request.params.workspaceId, email]
      )
      if (activeInvitation.rows.length > 0) {
        return reply.code(409).send({ success: false, message: 'An active invitation already exists for this email.' })
      }

      const token = randomBytes(32).toString('base64url')
      const id = randomUUID()
      const invitation = await database.query(
        `INSERT INTO workspace_invitations (id, workspace_id, email, token_hash, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
         ON CONFLICT (workspace_id, email) DO UPDATE
         SET id = EXCLUDED.id,
             token_hash = EXCLUDED.token_hash,
             created_by = EXCLUDED.created_by,
             created_at = NOW(),
             expires_at = EXCLUDED.expires_at,
             accepted_at = NULL,
             revoked_at = NULL
         WHERE workspace_invitations.accepted_at IS NOT NULL
            OR workspace_invitations.revoked_at IS NOT NULL
            OR workspace_invitations.expires_at <= NOW()
         RETURNING id, email, role, created_at, expires_at`,
        [id, request.params.workspaceId, email, digest(token), userId]
      )
      const invitationRecord = invitation.rows[0]
      if (!invitationRecord) {
        return reply.code(409).send({
          success: false,
          message: 'An active invitation already exists for this email.'
        })
      }

      const acceptanceUrl = new URL('/en/dashboard', dependencies.frontendUrl)
      acceptanceUrl.searchParams.set('invitation', token)
      try {
        await dependencies.deliverInvitation(
          email,
          String(workspace.workspace_name),
          String(workspace.inviter_name),
          acceptanceUrl.toString()
        )
      } catch (error) {
        dependencies.onDeliveryFailure(error)
        await database.query(
          'UPDATE workspace_invitations SET revoked_at = NOW() WHERE id = $1 AND token_hash = $2',
          [id, digest(token)]
        )
        return reply.code(503).send({
          success: false,
          message: 'Invitation email could not be delivered. Please try again.'
        })
      }
      return reply.code(201).send({
        success: true,
        invitation: { ...invitationRecord, inviter_name: workspace.inviter_name }
      })
    }
  )

  app.delete<{ Params: { workspaceId: string; invitationId: string } }>(
    '/api/workspaces/:workspaceId/invitations/:invitationId',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const membership = await database.query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [request.params.workspaceId, userId]
      )
      const role = membership.rows[0]?.role
      if (typeof role !== 'string') {
        return reply.code(404).send({ success: false, message: 'Workspace not found.' })
      }
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Workspace admin access is required.' })
      }

      const result = await database.query(
        `UPDATE workspace_invitations SET revoked_at = NOW()
         WHERE id = $1 AND workspace_id = $2 AND accepted_at IS NULL AND revoked_at IS NULL
         RETURNING id`,
        [request.params.invitationId, request.params.workspaceId]
      )
      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, message: 'Active invitation not found.' })
      }
      return { success: true }
    }
  )

  app.post('/api/workspace-invitations/accept', async (request, reply) => {
    const userId = await authenticatedUserId(request.headers.authorization, database)
    if (!userId) return unauthenticated(reply)

    const body = readRecord(request.body)
    const token = typeof body?.token === 'string' ? body.token : ''
    if (token.length < 32 || token.length > 128) {
      return reply.code(400).send({ success: false, message: 'Invitation token is invalid or expired.' })
    }

    const userResult = await database.query(
      'SELECT email, verified FROM users WHERE id = $1',
      [userId]
    )
    const user = userResult.rows[0]
    if (typeof user?.email !== 'string' || user.verified !== true) {
      return reply.code(403).send({ success: false, message: 'Verify your email before accepting an invitation.' })
    }

    const accepted = await database.transaction(async query => {
      const invitationResult = await query(
        `SELECT id, workspace_id, email FROM workspace_invitations
         WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
         FOR UPDATE`,
        [digest(token)]
      )
      const invitation = invitationResult.rows[0]
      if (
        typeof invitation?.id !== 'string' ||
        typeof invitation.workspace_id !== 'string' ||
        typeof invitation.email !== 'string' ||
        normalizeEmail(invitation.email) !== normalizeEmail(user.email as string)
      ) return null

      const updated = await query(
        `UPDATE workspace_invitations SET accepted_at = NOW()
         WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
         RETURNING workspace_id`,
        [invitation.id]
      )
      if (updated.rows.length === 0) return null
      await query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (workspace_id, user_id) DO NOTHING`,
        [invitation.workspace_id, userId]
      )
      return { workspaceId: invitation.workspace_id }
    })
    if (!accepted) {
      return reply.code(400).send({ success: false, message: 'Invitation is invalid, expired, already used, or addressed to another account.' })
    }
    return { success: true, workspaceId: accepted.workspaceId }
  })
}
