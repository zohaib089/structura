import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import Fastify from 'fastify'
import { registerWorkspaceRoutes } from './workspace-routes.js'
import type {
  WorkspaceDatabase,
  WorkspaceQuery,
  WorkspaceTransaction
} from '../db/types.js'

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function createMemberApi(
  initial: Array<{ userId: string; role: string; workspaceId?: string }>
) {
  const sessions = new Map([
    [digest('owner-session'), 'owner-1'],
    [digest('owner-2-session'), 'owner-2'],
    [digest('admin-session'), 'admin-1'],
    [digest('member-session'), 'member-1'],
    [digest('outsider-session'), 'outsider-1']
  ])

  const memberships = new Map<string, string>()
  for (const row of initial) {
    memberships.set(`${row.workspaceId ?? 'workspace-1'}:${row.userId}`, row.role)
  }

  const membersIn = (workspaceId: string) =>
    [...memberships.entries()]
      .filter(([key]) => key.startsWith(`${workspaceId}:`))
      .map(([key, role]) => ({ user_id: key.slice(workspaceId.length + 1), role }))

  const query: WorkspaceQuery = async (text, params = []) => {
    if (text.startsWith('SELECT user_id FROM auth_sessions')) {
      const userId = sessions.get(String(params[0]))
      return { rows: userId ? [{ user_id: userId }] : [] }
    }
    return { rows: [] }
  }

  const transaction: WorkspaceTransaction = async operation => operation(async (text, params = []) => {
    if (text.includes('FROM workspace_members') && text.includes('FOR UPDATE')) {
      const workspaceId = String(params[0])
      const actorId = String(params[1])
      const targetId = String(params[2])
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
        rows: [{
          user_id: params[1],
          role: params[2],
          created_at: '2026-10-20T00:00:00.000Z'
        }]
      }
    }
    if (text.startsWith('DELETE FROM workspace_members')) {
      const key = `${String(params[0])}:${String(params[1])}`
      if (!memberships.has(key)) return { rows: [] }
      memberships.delete(key)
      return { rows: [{ user_id: params[1] }] }
    }
    return { rows: [] }
  })

  const database: WorkspaceDatabase = { query, transaction }
  const app = Fastify()
  registerWorkspaceRoutes(app, database)
  return { app, memberships }
}

const workspaceMembers = '/api/workspaces/workspace-1/members'

test('owners can change a member role and remove a member', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'member-1', role: 'member' },
    { userId: 'admin-1', role: 'admin' }
  ])
  try {
    const changed = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/member-1`,
      headers: { authorization: 'Bearer owner-session' },
      payload: { role: 'admin' }
    })
    assert.equal(changed.statusCode, 200)
    assert.equal(changed.json().success, true)
    assert.equal(changed.json().member.id, 'member-1')
    assert.equal(changed.json().member.role, 'admin')
    assert.equal(api.memberships.get('workspace-1:member-1'), 'admin')

    const removed = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/admin-1`,
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(removed.statusCode, 200)
    assert.deepEqual(removed.json(), { success: true })
    assert.equal(api.memberships.has('workspace-1:admin-1'), false)
  } finally {
    await api.app.close()
  }
})

test('admins can change and remove members and admins but cannot manage owners or promote to owner', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'admin-1', role: 'admin' },
    { userId: 'member-1', role: 'member' }
  ])
  try {
    const headers = { authorization: 'Bearer admin-session' }
    const changed = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/member-1`,
      headers,
      payload: { role: 'admin' }
    })
    assert.equal(changed.statusCode, 200)
    assert.equal(changed.json().member.role, 'admin')

    const removed = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/member-1`,
      headers
    })
    assert.equal(removed.statusCode, 200)
    assert.equal(api.memberships.has('workspace-1:member-1'), false)

    const changeOwner = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/owner-1`,
      headers,
      payload: { role: 'admin' }
    })
    assert.equal(changeOwner.statusCode, 403)
    assert.equal(changeOwner.json().message, "You don't have permission to manage members.")
    assert.equal(api.memberships.get('workspace-1:owner-1'), 'owner')

    const removeOwner = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/owner-1`,
      headers
    })
    assert.equal(removeOwner.statusCode, 403)
    assert.equal(api.memberships.get('workspace-1:owner-1'), 'owner')

    api.memberships.set('workspace-1:member-2', 'member')
    const promote = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/member-2`,
      headers,
      payload: { role: 'owner' }
    })
    assert.equal(promote.statusCode, 403)
    assert.equal(api.memberships.get('workspace-1:member-2'), 'member')
  } finally {
    await api.app.close()
  }
})

test('members cannot change roles or remove members', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'member-1', role: 'member' },
    { userId: 'admin-1', role: 'admin' }
  ])
  try {
    const headers = { authorization: 'Bearer member-session' }
    const changed = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/admin-1`,
      headers,
      payload: { role: 'member' }
    })
    assert.equal(changed.statusCode, 403)
    assert.equal(changed.json().message, "You don't have permission to manage members.")

    const removed = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/admin-1`,
      headers
    })
    assert.equal(removed.statusCode, 403)
    assert.equal(api.memberships.get('workspace-1:admin-1'), 'admin')
  } finally {
    await api.app.close()
  }
})

test('member management requires an active session', async () => {
  const api = createMemberApi([{ userId: 'owner-1', role: 'owner' }])
  try {
    const changed = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/owner-1`,
      payload: { role: 'admin' }
    })
    assert.equal(changed.statusCode, 401)
    assert.equal(changed.json().message, 'An active session is required.')

    const removed = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/owner-1`
    })
    assert.equal(removed.statusCode, 401)
    assert.equal(removed.json().message, 'An active session is required.')
  } finally {
    await api.app.close()
  }
})

test('does not reveal a workspace to a user outside its membership when managing members', async () => {
  const api = createMemberApi([{ userId: 'owner-1', role: 'owner' }])
  try {
    const headers = { authorization: 'Bearer outsider-session' }
    const changed = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/owner-1`,
      headers,
      payload: { role: 'admin' }
    })
    assert.equal(changed.statusCode, 404)
    assert.equal(changed.json().message, 'Workspace not found.')

    const removed = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/owner-1`,
      headers
    })
    assert.equal(removed.statusCode, 404)
    assert.equal(removed.json().message, 'Workspace not found.')
  } finally {
    await api.app.close()
  }
})

test('returns 404 for an unknown member', async () => {
  const api = createMemberApi([{ userId: 'owner-1', role: 'owner' }])
  try {
    const headers = { authorization: 'Bearer owner-session' }
    const changed = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/missing-user`,
      headers,
      payload: { role: 'member' }
    })
    assert.equal(changed.statusCode, 404)
    assert.equal(changed.json().message, 'Member not found.')

    const removed = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/missing-user`,
      headers
    })
    assert.equal(removed.statusCode, 404)
    assert.equal(removed.json().message, 'Member not found.')
  } finally {
    await api.app.close()
  }
})

test('rejects an invalid member role', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'member-1', role: 'member' }
  ])
  try {
    const headers = { authorization: 'Bearer owner-session' }
    const invalid = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/member-1`,
      headers,
      payload: { role: 'superadmin' }
    })
    assert.equal(invalid.statusCode, 400)
    assert.equal(invalid.json().message, 'Role must be owner, admin, or member.')

    const missing = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/member-1`,
      headers,
      payload: {}
    })
    assert.equal(missing.statusCode, 400)
    assert.equal(api.memberships.get('workspace-1:member-1'), 'member')
  } finally {
    await api.app.close()
  }
})

test('blocks demoting, removing, or leaving as the last owner', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'admin-1', role: 'admin' }
  ])
  try {
    const headers = { authorization: 'Bearer owner-session' }
    const demote = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/owner-1`,
      headers,
      payload: { role: 'admin' }
    })
    assert.equal(demote.statusCode, 409)
    assert.equal(demote.json().message, 'A workspace must keep at least one owner.')
    assert.equal(api.memberships.get('workspace-1:owner-1'), 'owner')

    const removed = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/owner-1`,
      headers
    })
    assert.equal(removed.statusCode, 409)
    assert.equal(removed.json().message, 'A workspace must keep at least one owner.')
    assert.equal(api.memberships.get('workspace-1:owner-1'), 'owner')
  } finally {
    await api.app.close()
  }
})

test('allows demoting an owner when another owner exists', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'owner-2', role: 'owner' }
  ])
  try {
    const changed = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/owner-2`,
      headers: { authorization: 'Bearer owner-session' },
      payload: { role: 'admin' }
    })
    assert.equal(changed.statusCode, 200)
    assert.equal(changed.json().member.role, 'admin')
    assert.equal(api.memberships.get('workspace-1:owner-2'), 'admin')
    assert.equal(api.memberships.get('workspace-1:owner-1'), 'owner')
  } finally {
    await api.app.close()
  }
})

test('allows an owner to demote themselves when another owner exists', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'owner-2', role: 'owner' }
  ])
  try {
    const changed = await api.app.inject({
      method: 'PATCH',
      url: `${workspaceMembers}/owner-1`,
      headers: { authorization: 'Bearer owner-session' },
      payload: { role: 'admin' }
    })
    assert.equal(changed.statusCode, 200)
    assert.equal(changed.json().member.id, 'owner-1')
    assert.equal(changed.json().member.role, 'admin')
    assert.equal(api.memberships.get('workspace-1:owner-1'), 'admin')
    assert.equal(api.memberships.get('workspace-1:owner-2'), 'owner')
  } finally {
    await api.app.close()
  }
})

test('a member can leave a workspace', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'member-1', role: 'member' }
  ])
  try {
    const left = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/member-1`,
      headers: { authorization: 'Bearer member-session' }
    })
    assert.equal(left.statusCode, 200)
    assert.deepEqual(left.json(), { success: true })
    assert.equal(api.memberships.has('workspace-1:member-1'), false)
  } finally {
    await api.app.close()
  }
})

test('an admin can leave a workspace', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'admin-1', role: 'admin' }
  ])
  try {
    const left = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/admin-1`,
      headers: { authorization: 'Bearer admin-session' }
    })
    assert.equal(left.statusCode, 200)
    assert.deepEqual(left.json(), { success: true })
    assert.equal(api.memberships.has('workspace-1:admin-1'), false)
  } finally {
    await api.app.close()
  }
})

test('a non-last owner can leave a workspace', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'owner-2', role: 'owner' }
  ])
  try {
    const left = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/owner-1`,
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(left.statusCode, 200)
    assert.deepEqual(left.json(), { success: true })
    assert.equal(api.memberships.has('workspace-1:owner-1'), false)
    assert.equal(api.memberships.get('workspace-1:owner-2'), 'owner')
  } finally {
    await api.app.close()
  }
})

test('the last owner cannot leave a workspace', async () => {
  const api = createMemberApi([
    { userId: 'owner-1', role: 'owner' },
    { userId: 'admin-1', role: 'admin' }
  ])
  try {
    const left = await api.app.inject({
      method: 'DELETE',
      url: `${workspaceMembers}/owner-1`,
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(left.statusCode, 409)
    assert.equal(left.json().message, 'A workspace must keep at least one owner.')
    assert.equal(api.memberships.get('workspace-1:owner-1'), 'owner')
  } finally {
    await api.app.close()
  }
})
