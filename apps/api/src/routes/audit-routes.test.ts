import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import Fastify from 'fastify'
import {
  registerWorkspaceInvitationRoutes,
  registerWorkspaceRoutes
} from './workspace-routes.js'
import {
  encodeAuditCursor,
  type AuditEventRecord
} from '../services/workspace-audit.js'
import type {
  WorkspaceDatabase,
  WorkspaceQuery,
  WorkspaceTransaction
} from '../db/types.js'

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

const NOW = '2026-11-23T00:00:00.000Z'
const auditPath = '/api/workspaces/workspace-1/audit'

type StoredEvent = AuditEventRecord & { workspace_id: string }

function createAuditApi() {
  const sessions = new Map([
    [digest('owner-session'), 'owner-1'],
    [digest('admin-session'), 'admin-1'],
    [digest('member-session'), 'member-1'],
    [digest('member-2-session'), 'member-2'],
    [digest('outsider-session'), 'outsider-1'],
    [digest('invitee-session'), 'invitee-1']
  ])
  const memberships = new Map<string, string>([
    ['workspace-1:owner-1', 'owner'],
    ['workspace-1:admin-1', 'admin'],
    ['workspace-1:member-1', 'member'],
    ['workspace-1:member-2', 'member']
  ])
  const events: StoredEvent[] = []
  const invitations = new Map<string, Record<string, unknown>>()
  let inviteTokenHash = ''

  const membersIn = (workspaceId: string) =>
    [...memberships.entries()]
      .filter(([key]) => key.startsWith(`${workspaceId}:`))
      .map(([key, role]) => ({ user_id: key.slice(workspaceId.length + 1), role }))

  const handle: WorkspaceQuery = async (text, params = []) => {
    if (text.startsWith('SELECT user_id FROM auth_sessions')) {
      const userId = sessions.get(String(params[0]))
      return { rows: userId ? [{ user_id: userId }] : [] }
    }

    if (text.startsWith('INSERT INTO audit_events')) {
      const details = JSON.parse(String(params[6] ?? '{}'))
      events.push({
        id: String(params[0]),
        workspace_id: String(params[1]),
        actor_user_id: String(params[2]),
        action: String(params[3]),
        target_type: String(params[4]),
        target_id: String(params[5]),
        details,
        created_at: new Date(Date.now() + events.length).toISOString()
      })
      return { rows: [] }
    }

    if (text.includes('FROM audit_events')) {
      const workspaceId = String(params[0])
      const action = params[1] == null ? null : String(params[1])
      const projectId = params[2] == null ? null : String(params[2])
      const cursorCreatedAt = params[3] == null ? null : String(params[3])
      const cursorId = params[4] == null ? null : String(params[4])
      const limit = Number(params[5])
      const rows = events
        .filter(event => event.workspace_id === workspaceId)
        .filter(event => action === null || event.action === action)
        .filter(event => projectId === null || (event.target_type === 'project' && event.target_id === projectId))
        .filter(event => {
          if (!cursorCreatedAt) return true
          return event.created_at < cursorCreatedAt ||
            (event.created_at === cursorCreatedAt && event.id < String(cursorId))
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
        .slice(0, limit)
      return { rows: rows.map(({ workspace_id: _workspaceId, ...event }) => event) }
    }

    if (text.includes('FROM workspaces w') && text.includes('JOIN workspace_members')) {
      const role = memberships.get(`${String(params[0])}:${String(params[1])}`)
      return {
        rows: role
          ? [{ workspace_name: 'Platform', role, inviter_name: 'Workspace Owner' }]
          : []
      }
    }

    if (
      text.includes('FROM workspace_members') &&
      text.includes('AND user_id = $2') &&
      !text.includes('AS id')
    ) {
      const role = memberships.get(`${String(params[0])}:${String(params[1])}`)
      return { rows: role ? [{ role }] : [] }
    }

    if (text.includes('FROM workspace_members') && text.includes('ANY($2::text[])')) {
      const workspaceId = String(params[0])
      const ids = Array.isArray(params[1]) ? params[1].map(String) : []
      return {
        rows: ids
          .filter(userId => memberships.has(`${workspaceId}:${userId}`))
          .map(user_id => ({ user_id }))
      }
    }

    if (text.includes('FROM workspace_members') && text.includes('FOR UPDATE')) {
      const workspaceId = String(params[0])
      const actorId = String(params[1])
      const targetId = String(params[2] ?? '')
      return {
        rows: membersIn(workspaceId).filter(row =>
          row.role === 'owner' || row.user_id === actorId || row.user_id === targetId
        )
      }
    }

    if (text.startsWith('UPDATE workspace_members')) {
      const key = `${String(params[0])}:${String(params[1])}`
      if (!memberships.has(key)) return { rows: [] }
      memberships.set(key, String(params[2]))
      return {
        rows: [{ user_id: params[1], role: params[2], created_at: NOW }]
      }
    }

    if (text.startsWith('DELETE FROM workspace_members')) {
      const key = `${String(params[0])}:${String(params[1])}`
      if (!memberships.has(key)) return { rows: [] }
      memberships.delete(key)
      return { rows: [{ user_id: params[1] }] }
    }

    if (text.includes('FROM projects p') && text.includes('p.access_restricted')) {
      return {
        rows: [{
          id: params[1],
          access_restricted: false,
          is_listed: false
        }]
      }
    }

    if (text.startsWith('SELECT user_id FROM project_members')) {
      return { rows: [{ user_id: 'member-1' }] }
    }

    if (text.includes('UPDATE projects') && text.includes('access_restricted')) {
      return { rows: [] }
    }

    if (text.startsWith('DELETE FROM project_members')) {
      return { rows: [] }
    }

    if (text.includes('INSERT INTO project_members')) {
      return { rows: [] }
    }

    if (text.includes('FROM project_members pm') && text.includes('AS id')) {
      const ids = Array.isArray(params[1]) ? [] : []
      void ids
      return { rows: [] }
    }

    if (text.includes('FROM workspace_members wm') && text.includes('JOIN users u')) {
      return { rows: [] }
    }

    if (text.startsWith('SELECT 1 FROM workspace_invitations')) {
      const active = [...invitations.values()].some(row =>
        row.email === params[1] && !row.revoked && !row.accepted
      )
      return { rows: active ? [{ one: 1 }] : [] }
    }

    if (text.startsWith('INSERT INTO workspace_invitations')) {
      inviteTokenHash = String(params[3])
      const row = {
        id: String(params[0]),
        email: String(params[2]),
        role: 'member',
        created_at: NOW,
        expires_at: '2026-11-30T00:00:00.000Z'
      }
      invitations.set(row.id, { ...row, revoked: false, accepted: false })
      return { rows: [row] }
    }

    if (text.startsWith('UPDATE workspace_invitations SET revoked_at')) {
      const invitation = invitations.get(String(params[0]))
      if (invitation) invitation.revoked = true
      return { rows: [{ id: params[0], email: invitation?.email ?? 'invitee@example.test' }] }
    }

    if (text.includes('SELECT id, workspace_id, email FROM workspace_invitations')) {
      const invitation = [...invitations.values()].find(row =>
        inviteTokenHash === String(params[0]) && !row.revoked && !row.accepted
      )
      return {
        rows: invitation
          ? [{ id: invitation.id, workspace_id: 'workspace-1', email: invitation.email }]
          : []
      }
    }

    if (text.startsWith('UPDATE workspace_invitations SET accepted_at')) {
      const invitation = invitations.get(String(params[0]))
      if (!invitation || invitation.revoked || invitation.accepted) return { rows: [] }
      invitation.accepted = true
      return { rows: [{ workspace_id: 'workspace-1' }] }
    }

    if (text.startsWith('INSERT INTO workspace_members')) {
      memberships.set(`${String(params[0])}:${String(params[1])}`, 'member')
      return { rows: [] }
    }

    if (text.startsWith('SELECT email, verified FROM users')) {
      return {
        rows: [{
          email: String(params[0]) === 'invitee-1' ? 'invitee@example.test' : 'owner@example.test',
          verified: true
        }]
      }
    }

    return { rows: [] }
  }

  const transaction: WorkspaceTransaction = async operation => operation(handle)
  const database: WorkspaceDatabase = { query: handle, transaction }
  const app = Fastify()
  registerWorkspaceRoutes(app, database)
  let invitationToken = ''
  registerWorkspaceInvitationRoutes(app, database, {
    frontendUrl: 'https://atlasmith.example.test',
    deliverInvitation: async (_email, _workspaceName, _inviterName, acceptanceUrl) => {
      invitationToken = new URL(acceptanceUrl).searchParams.get('invitation') ?? ''
    },
    onDeliveryFailure: () => {}
  })

  return {
    app,
    events,
    memberships,
    get invitationToken() { return invitationToken },
    seed(event: StoredEvent) { events.push(event) }
  }
}

function event(partial: Partial<StoredEvent> & Pick<StoredEvent, 'id' | 'action' | 'created_at'>): StoredEvent {
  return {
    workspace_id: 'workspace-1',
    actor_user_id: 'owner-1',
    target_type: partial.action === 'project.access_changed' ? 'project' : 'member',
    target_id: partial.target_id ?? 'target-1',
    details: {},
    ...partial
  }
}

test('requires an owner or admin to read the audit log', async () => {
  const api = createAuditApi()
  try {
    const anonymous = await api.app.inject({ method: 'GET', url: auditPath })
    const outsider = await api.app.inject({
      method: 'GET',
      url: auditPath,
      headers: { authorization: 'Bearer outsider-session' }
    })
    const member = await api.app.inject({
      method: 'GET',
      url: auditPath,
      headers: { authorization: 'Bearer member-session' }
    })
    const owner = await api.app.inject({
      method: 'GET',
      url: auditPath,
      headers: { authorization: 'Bearer owner-session' }
    })
    const admin = await api.app.inject({
      method: 'GET',
      url: auditPath,
      headers: { authorization: 'Bearer admin-session' }
    })
    assert.equal(anonymous.statusCode, 401)
    assert.equal(outsider.statusCode, 404)
    assert.equal(outsider.json().message, 'Workspace not found.')
    assert.equal(member.statusCode, 403)
    assert.equal(member.json().message, 'Workspace admin access is required.')
    assert.equal(owner.statusCode, 200)
    assert.deepEqual(owner.json().events, [])
    assert.equal(owner.json().next_cursor, null)
    assert.equal(admin.statusCode, 200)
  } finally {
    await api.app.close()
  }
})

test('lists audit events newest first and paginates with a cursor', async () => {
  const api = createAuditApi()
  api.seed(event({ id: 'event-1', action: 'member.removed', created_at: '2026-11-21T00:00:00.000Z' }))
  api.seed(event({ id: 'event-2', action: 'member.role_changed', created_at: '2026-11-22T00:00:00.000Z' }))
  api.seed(event({ id: 'event-3', action: 'ownership.transferred', created_at: '2026-11-23T00:00:00.000Z' }))
  try {
    const first = await api.app.inject({
      method: 'GET',
      url: `${auditPath}?limit=2`,
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(first.statusCode, 200)
    assert.deepEqual(first.json().events.map((row: { id: string }) => row.id), ['event-3', 'event-2'])
    assert.equal(first.json().next_cursor, encodeAuditCursor('2026-11-22T00:00:00.000Z', 'event-2'))

    const second = await api.app.inject({
      method: 'GET',
      url: `${auditPath}?limit=2&cursor=${first.json().next_cursor}`,
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(second.statusCode, 200)
    assert.deepEqual(second.json().events.map((row: { id: string }) => row.id), ['event-1'])
    assert.equal(second.json().next_cursor, null)

    const tooBig = await api.app.inject({
      method: 'GET',
      url: `${auditPath}?limit=101`,
      headers: { authorization: 'Bearer owner-session' }
    })
    const badCursor = await api.app.inject({
      method: 'GET',
      url: `${auditPath}?cursor=nope`,
      headers: { authorization: 'Bearer owner-session' }
    })
    const badAction = await api.app.inject({
      method: 'GET',
      url: `${auditPath}?action=scan.started`,
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(tooBig.statusCode, 400)
    assert.equal(badCursor.statusCode, 400)
    assert.equal(badAction.statusCode, 400)
  } finally {
    await api.app.close()
  }
})

test('filters audit events by action and project', async () => {
  const api = createAuditApi()
  api.seed(event({
    id: 'event-role',
    action: 'member.role_changed',
    created_at: '2026-11-22T00:00:00.000Z',
    target_id: 'member-1'
  }))
  api.seed(event({
    id: 'event-project-a',
    action: 'project.access_changed',
    created_at: '2026-11-22T01:00:00.000Z',
    target_type: 'project',
    target_id: 'project-a',
    details: { restricted: true }
  }))
  api.seed(event({
    id: 'event-project-b',
    action: 'project.access_changed',
    created_at: '2026-11-22T02:00:00.000Z',
    target_type: 'project',
    target_id: 'project-b'
  }))
  try {
    const byAction = await api.app.inject({
      method: 'GET',
      url: `${auditPath}?action=project.access_changed`,
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(byAction.statusCode, 200)
    assert.deepEqual(
      byAction.json().events.map((row: { id: string }) => row.id),
      ['event-project-b', 'event-project-a']
    )

    const byProject = await api.app.inject({
      method: 'GET',
      url: `${auditPath}?project=project-a`,
      headers: { authorization: 'Bearer admin-session' }
    })
    assert.equal(byProject.statusCode, 200)
    assert.deepEqual(
      byProject.json().events.map((row: { id: string }) => row.id),
      ['event-project-a']
    )
  } finally {
    await api.app.close()
  }
})

test('writes in-transaction audit events for member, ownership, access and invitation changes', async () => {
  const api = createAuditApi()
  try {
    const headers = { authorization: 'Bearer owner-session' }
    const role = await api.app.inject({
      method: 'PATCH',
      url: '/api/workspaces/workspace-1/members/member-1',
      headers,
      payload: { role: 'admin' }
    })
    const removed = await api.app.inject({
      method: 'DELETE',
      url: '/api/workspaces/workspace-1/members/member-2',
      headers,
    })
    // re-add member-2 so transfer can use admin? transfer uses member-1 now admin
    api.memberships.set('workspace-1:member-2', 'member')
    const transferred = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/transfer-ownership',
      headers,
      payload: { memberId: 'admin-1', stayAsAdmin: true }
    })
    const access = await api.app.inject({
      method: 'PUT',
      url: '/api/workspaces/workspace-1/projects/project-1/access',
      headers: { authorization: 'Bearer admin-session' },
      payload: { restricted: true, member_ids: ['member-1'] }
    })
    const invited = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer admin-session' },
      payload: { email: 'invitee@example.test' }
    })
    const invitationId = invited.json().invitation.id
    const revoked = await api.app.inject({
      method: 'DELETE',
      url: `/api/workspaces/workspace-1/invitations/${invitationId}`,
      headers: { authorization: 'Bearer admin-session' }
    })

    assert.equal(role.statusCode, 200)
    assert.equal(removed.statusCode, 200)
    assert.equal(transferred.statusCode, 200)
    assert.equal(access.statusCode, 200)
    assert.equal(invited.statusCode, 201)
    assert.equal(revoked.statusCode, 200)

    const actions = api.events.map(row => row.action)
    assert.deepEqual(actions, [
      'member.role_changed',
      'member.removed',
      'ownership.transferred',
      'project.access_changed',
      'member.invited',
      'invite.revoked'
    ])
    assert.deepEqual(api.events[0]?.details, { from: 'member', to: 'admin' })
    assert.deepEqual(api.events[1]?.details, { role: 'member', self: false })
    assert.equal(api.events[2]?.target_id, 'admin-1')
    assert.deepEqual(api.events[3]?.details, {
      restricted: true,
      previous_restricted: false,
      member_ids: ['member-1'],
      previous_member_ids: ['member-1']
    })
    assert.equal(api.events[4]?.details.email, 'invitee@example.test')
    assert.equal(api.events[4]?.target_id, invitationId)
    const serialized = JSON.stringify(api.events)
    assert.ok(api.invitationToken.length >= 32)
    assert.equal(serialized.includes(api.invitationToken), false)
    assert.equal(serialized.includes('token_hash'), false)
    assert.equal(/"token"/.test(serialized), false)
    assert.equal(invited.json().invitation.token, undefined)
  } finally {
    await api.app.close()
  }
})

test('writes an invite.accepted event without storing the invitation token', async () => {
  const api = createAuditApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'invitee@example.test' }
    })
    assert.equal(created.statusCode, 201)
    assert.ok(api.invitationToken.length >= 32)

    const accept = await api.app.inject({
      method: 'POST',
      url: '/api/workspace-invitations/accept',
      headers: { authorization: 'Bearer invitee-session' },
      payload: { token: api.invitationToken }
    })
    assert.equal(accept.statusCode, 200)
    assert.equal(accept.json().workspaceId, 'workspace-1')

    const accepted = api.events.find(row => row.action === 'invite.accepted')
    assert.ok(accepted)
    assert.equal(accepted?.target_id, created.json().invitation.id)
    assert.deepEqual(accepted?.details, {
      email: 'invitee@example.test',
      member_id: 'invitee-1'
    })
    const serialized = JSON.stringify(api.events)
    assert.equal(serialized.includes(api.invitationToken), false)
    assert.equal(serialized.includes('token_hash'), false)
  } finally {
    await api.app.close()
  }
})
