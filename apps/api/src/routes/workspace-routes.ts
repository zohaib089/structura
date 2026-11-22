import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

import type { WorkspaceDatabase } from '../db/types.js'

export type {
  WorkspaceQueryResult,
  WorkspaceQuery,
  WorkspaceTransaction,
  WorkspaceDatabase
} from '../db/types.js'

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


const WORKSPACE_ROLES = ['owner', 'admin', 'member'] as const
type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === 'owner' || value === 'admin' || value === 'member'
}

/**
 * Member-management rule (RBAC step 1):
 * - Owners may change any member's role (including promoting someone to owner)
 *   and may remove any member, subject only to last-owner protection.
 * - Admins may change or remove members and admins, but may not change or
 *   remove owners and may not promote anyone to owner. Only owners manage owners.
 */
function canManageWorkspaceMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
  nextRole?: WorkspaceRole
): boolean {
  if (actorRole === 'owner') return true
  if (actorRole !== 'admin') return false
  if (targetRole === 'owner' || nextRole === 'owner') return false
  return true
}

function memberRoleOf(rows: Array<Record<string, unknown>>, userId: string): WorkspaceRole | null {
  const role = rows.find(row => row.user_id === userId)?.role
  return isWorkspaceRole(role) ? role : null
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 't' || value === 'true'
}

function hasProjectAccess(role: unknown, accessRestricted: unknown, isListed: unknown): boolean {
  if (role === 'owner' || role === 'admin') return true
  if (!isTruthyFlag(accessRestricted)) return true
  return isTruthyFlag(isListed)
}

function readMemberIds(value: unknown): string[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value)) return null
  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string') return null
    const id = item.trim()
    if (!id) return null
    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

async function deleteProjectMemberships(
  query: WorkspaceDatabase['query'],
  workspaceId: string,
  userId: string
) {
  await query(
    `DELETE FROM project_members
     WHERE user_id = $2
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = $1)`,
    [workspaceId, userId]
  )
}

function serializeAccessMembers(rows: Array<Record<string, unknown>>) {
  return rows.map(row => ({
    id: row.id,
    role: row.role,
    created_at: row.created_at
  }))
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
        `SELECT p.id, p.name, p.description, p.created_at, p.updated_at
         FROM projects p
         JOIN workspace_members wm
           ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
         WHERE p.workspace_id = $1
           AND (
             wm.role IN ('owner', 'admin')
             OR p.access_restricted IS NOT TRUE
             OR EXISTS (
               SELECT 1
               FROM project_members pm
               WHERE pm.project_id = p.id AND pm.user_id = $2
             )
           )
         ORDER BY p.updated_at DESC, p.id`,
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

  app.get<{ Params: { workspaceId: string; projectId: string } }>(
    '/api/workspaces/:workspaceId/projects/:projectId',
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

      const result = await database.query(
        `SELECT p.id, p.name, p.description, p.created_at, p.updated_at, p.access_restricted,
                EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = p.id AND pm.user_id = $3
                ) AS is_listed
         FROM projects p
         WHERE p.workspace_id = $1 AND p.id = $2`,
        [request.params.workspaceId, request.params.projectId, userId]
      )
      const project = result.rows[0]
      if (!project || !hasProjectAccess(role, project.access_restricted, project.is_listed)) {
        return reply.code(404).send({ success: false, message: 'Project not found.' })
      }

      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          created_at: project.created_at,
          updated_at: project.updated_at
        }
      }
    }
  )

  app.get<{ Params: { workspaceId: string; projectId: string } }>(
    '/api/workspaces/:workspaceId/projects/:projectId/access',
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

      const result = await database.query(
        `SELECT p.id, p.access_restricted,
                EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = p.id AND pm.user_id = $3
                ) AS is_listed
         FROM projects p
         WHERE p.workspace_id = $1 AND p.id = $2`,
        [request.params.workspaceId, request.params.projectId, userId]
      )
      const project = result.rows[0]
      if (!project || !hasProjectAccess(role, project.access_restricted, project.is_listed)) {
        return reply.code(404).send({ success: false, message: 'Project not found.' })
      }

      const listed = await database.query(
        `SELECT wm.user_id AS id, wm.role, pm.created_at
         FROM project_members pm
         JOIN workspace_members wm
           ON wm.user_id = pm.user_id AND wm.workspace_id = $1
         WHERE pm.project_id = $2
         ORDER BY wm.user_id`,
        [request.params.workspaceId, request.params.projectId]
      )
      return {
        success: true,
        access: {
          restricted: isTruthyFlag(project.access_restricted),
          members: serializeAccessMembers(listed.rows)
        }
      }
    }
  )

  app.put<{ Params: { workspaceId: string; projectId: string } }>(
    '/api/workspaces/:workspaceId/projects/:projectId/access',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const body = readRecord(request.body)
      if (!body || typeof body.restricted !== 'boolean') {
        return reply.code(400).send({
          success: false,
          message: 'restricted must be true or false.'
        })
      }
      const memberIds = readMemberIds(body.member_ids)
      if (!memberIds) {
        return reply.code(400).send({
          success: false,
          message: 'member_ids must be an array of member ids.'
        })
      }
      const restricted = body.restricted

      const result = await database.transaction(async query => {
        const membership = await query(
          `SELECT role
           FROM workspace_members
           WHERE workspace_id = $1 AND user_id = $2
           FOR UPDATE`,
          [request.params.workspaceId, userId]
        )
        const actorRole = membership.rows[0]?.role
        if (!isWorkspaceRole(actorRole)) {
          return { status: 404 as const, message: 'Workspace not found.' }
        }

        const locked = await query(
          `SELECT p.id, p.access_restricted,
                  EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = $3
                  ) AS is_listed
           FROM projects p
           WHERE p.workspace_id = $1 AND p.id = $2
           FOR UPDATE`,
          [request.params.workspaceId, request.params.projectId, userId]
        )
        const project = locked.rows[0]
        if (!project || !hasProjectAccess(actorRole, project.access_restricted, project.is_listed)) {
          return { status: 404 as const, message: 'Project not found.' }
        }
        if (actorRole !== 'owner' && actorRole !== 'admin') {
          return {
            status: 403 as const,
            message: 'Workspace admin access is required to update project access.'
          }
        }

        if (memberIds.length > 0) {
          const members = await query(
            `SELECT user_id
             FROM workspace_members
             WHERE workspace_id = $1 AND user_id = ANY($2::text[])`,
            [request.params.workspaceId, memberIds]
          )
          if (members.rows.length !== memberIds.length) {
            return {
              status: 400 as const,
              message: 'Every listed user must be a member of this workspace.'
            }
          }
        }

        await query(
          `UPDATE projects
           SET access_restricted = $3, updated_at = NOW()
           WHERE workspace_id = $1 AND id = $2`,
          [request.params.workspaceId, request.params.projectId, restricted]
        )
        await query(
          'DELETE FROM project_members WHERE project_id = $1',
          [request.params.projectId]
        )
        if (memberIds.length > 0) {
          await query(
            `INSERT INTO project_members (project_id, user_id)
             SELECT $1, user_id
             FROM unnest($2::text[]) AS user_id`,
            [request.params.projectId, memberIds]
          )
        }

        const listed = await query(
          `SELECT wm.user_id AS id, wm.role, pm.created_at
           FROM project_members pm
           JOIN workspace_members wm
             ON wm.user_id = pm.user_id AND wm.workspace_id = $1
           WHERE pm.project_id = $2
           ORDER BY wm.user_id`,
          [request.params.workspaceId, request.params.projectId]
        )
        return {
          status: 200 as const,
          access: {
            restricted,
            members: serializeAccessMembers(listed.rows)
          }
        }
      })

      if (result.status !== 200) {
        return reply.code(result.status).send({ success: false, message: result.message })
      }
      return { success: true, access: result.access }
    }
  )

  app.patch<{ Params: { workspaceId: string; memberId: string } }>(
    '/api/workspaces/:workspaceId/members/:memberId',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const body = readRecord(request.body)
      const role = typeof body?.role === 'string' ? body.role.trim() : ''
      if (!isWorkspaceRole(role)) {
        return reply.code(400).send({
          success: false,
          message: 'Role must be owner, admin, or member.'
        })
      }

      const result = await database.transaction(async query => {
        const locked = await query(
          `SELECT user_id, role
           FROM workspace_members
           WHERE workspace_id = $1
             AND (role = 'owner' OR user_id IN ($2, $3))
           FOR UPDATE`,
          [request.params.workspaceId, userId, request.params.memberId]
        )
        const actorRole = memberRoleOf(locked.rows, userId)
        if (!actorRole) {
          return { status: 404 as const, message: 'Workspace not found.' }
        }
        if (actorRole !== 'owner' && actorRole !== 'admin') {
          return {
            status: 403 as const,
            message: "You don't have permission to manage members."
          }
        }

        const targetRole = memberRoleOf(locked.rows, request.params.memberId)
        if (!targetRole) {
          return { status: 404 as const, message: 'Member not found.' }
        }
        if (!canManageWorkspaceMember(actorRole, targetRole, role)) {
          return {
            status: 403 as const,
            message: "You don't have permission to manage members."
          }
        }
        if (targetRole === 'owner' && role !== 'owner') {
          const ownerCount = locked.rows.filter(row => row.role === 'owner').length
          if (ownerCount <= 1) {
            return { status: 409 as const, message: 'A workspace must keep at least one owner.' }
          }
        }

        const updated = await query(
          `UPDATE workspace_members
           SET role = $3
           WHERE workspace_id = $1 AND user_id = $2
           RETURNING user_id, role, created_at`,
          [request.params.workspaceId, request.params.memberId, role]
        )
        const member = updated.rows[0]
        if (!member) {
          return { status: 404 as const, message: 'Member not found.' }
        }
        return {
          status: 200 as const,
          member: { id: member.user_id, role: member.role, created_at: member.created_at }
        }
      })

      if (result.status !== 200) {
        return reply.code(result.status).send({ success: false, message: result.message })
      }
      return { success: true, member: result.member }
    }
  )

  app.delete<{ Params: { workspaceId: string; memberId: string } }>(
    '/api/workspaces/:workspaceId/members/:memberId',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const result = await database.transaction(async query => {
        const locked = await query(
          `SELECT user_id, role
           FROM workspace_members
           WHERE workspace_id = $1
             AND (role = 'owner' OR user_id IN ($2, $3))
           FOR UPDATE`,
          [request.params.workspaceId, userId, request.params.memberId]
        )
        const actorRole = memberRoleOf(locked.rows, userId)
        if (!actorRole) {
          return { status: 404 as const, message: 'Workspace not found.' }
        }

        const targetRole = memberRoleOf(locked.rows, request.params.memberId)
        if (!targetRole) {
          return { status: 404 as const, message: 'Member not found.' }
        }
        // Self-leave: any member, including admins and owners, may remove
        // themselves via DELETE /api/workspaces/:workspaceId/members/:memberId
        // when memberId equals their own user id. This bypasses the role
        // permission check but keeps last-owner protection in this same
        // locked transaction. A separate /leave route is unnecessary.
        if (
          request.params.memberId !== userId &&
          !canManageWorkspaceMember(actorRole, targetRole)
        ) {
          return {
            status: 403 as const,
            message: "You don't have permission to manage members."
          }
        }
        if (targetRole === 'owner') {
          const ownerCount = locked.rows.filter(row => row.role === 'owner').length
          if (ownerCount <= 1) {
            return { status: 409 as const, message: 'A workspace must keep at least one owner.' }
          }
        }

        const removed = await query(
          `DELETE FROM workspace_members
           WHERE workspace_id = $1 AND user_id = $2
           RETURNING user_id`,
          [request.params.workspaceId, request.params.memberId]
        )
        if (removed.rows.length === 0) {
          return { status: 404 as const, message: 'Member not found.' }
        }
        await deleteProjectMemberships(query, request.params.workspaceId, request.params.memberId)
        return { status: 200 as const }
      })

      if (result.status !== 200) {
        return reply.code(result.status).send({ success: false, message: result.message })
      }
      return { success: true }
    }
  )

  app.post<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/transfer-ownership',
    async (request, reply) => {
      const userId = await authenticatedUserId(request.headers.authorization, database)
      if (!userId) return unauthenticated(reply)

      const body = readRecord(request.body)
      const memberId = typeof body?.memberId === 'string' ? body.memberId.trim() : ''
      if (!memberId) {
        return reply.code(400).send({
          success: false,
          message: 'A member id is required.'
        })
      }
      if (body?.stayAsAdmin !== undefined && typeof body.stayAsAdmin !== 'boolean') {
        return reply.code(400).send({
          success: false,
          message: 'stayAsAdmin must be true or false.'
        })
      }
      const stayAsAdmin = body?.stayAsAdmin !== false
      if (memberId === userId) {
        return reply.code(400).send({
          success: false,
          message: 'You cannot transfer ownership to yourself.'
        })
      }

      const result = await database.transaction(async query => {
        const locked = await query(
          `SELECT user_id, role
           FROM workspace_members
           WHERE workspace_id = $1
             AND (role = 'owner' OR user_id IN ($2, $3))
           FOR UPDATE`,
          [request.params.workspaceId, userId, memberId]
        )
        const actorRole = memberRoleOf(locked.rows, userId)
        if (!actorRole) {
          return { status: 404 as const, message: 'Workspace not found.' }
        }
        if (actorRole !== 'owner') {
          return {
            status: 403 as const,
            message: 'Only an owner can transfer ownership.'
          }
        }

        const targetRole = memberRoleOf(locked.rows, memberId)
        if (!targetRole) {
          return { status: 404 as const, message: 'Member not found.' }
        }

        // Promote the new owner first so last-owner protection holds when the
        // acting owner is then demoted to admin or removed in this transaction.
        const updated = await query(
          `UPDATE workspace_members
           SET role = $3
           WHERE workspace_id = $1 AND user_id = $2
           RETURNING user_id, role, created_at`,
          [request.params.workspaceId, memberId, 'owner']
        )
        const member = updated.rows[0]
        if (!member) {
          return { status: 404 as const, message: 'Member not found.' }
        }

        if (stayAsAdmin) {
          const demoted = await query(
            `UPDATE workspace_members
             SET role = $3
             WHERE workspace_id = $1 AND user_id = $2
             RETURNING user_id, role, created_at`,
            [request.params.workspaceId, userId, 'admin']
          )
          if (!demoted.rows[0]) {
            return { status: 404 as const, message: 'Workspace not found.' }
          }
        } else {
          const removed = await query(
            `DELETE FROM workspace_members
             WHERE workspace_id = $1 AND user_id = $2
             RETURNING user_id`,
            [request.params.workspaceId, userId]
          )
          if (removed.rows.length === 0) {
            return { status: 404 as const, message: 'Workspace not found.' }
          }
          await deleteProjectMemberships(query, request.params.workspaceId, userId)
        }

        return {
          status: 200 as const,
          member: { id: member.user_id, role: member.role, created_at: member.created_at },
          left: !stayAsAdmin
        }
      })

      if (result.status !== 200) {
        return reply.code(result.status).send({ success: false, message: result.message })
      }
      return { success: true, member: result.member, left: result.left }
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
