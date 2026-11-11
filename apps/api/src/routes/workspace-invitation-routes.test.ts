import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import Fastify from 'fastify'
import {
  registerWorkspaceInvitationRoutes,
  type WorkspaceDatabase,
  type WorkspaceQuery,
  type WorkspaceTransaction
} from './workspace-routes.js'

function createInvitationApi(options: {
  role?: string
  userEmail?: string
  verified?: boolean
  deliveryFails?: boolean
} = {}) {
  const sessionUsers = new Map([
    [createHash('sha256').update('owner-session').digest('hex'), 'owner-1'],
    [createHash('sha256').update('invitee-session').digest('hex'), 'invitee-1']
  ])
  const invitations = new Map<string, Record<string, unknown>>()
  const members: Array<Record<string, unknown>> = []
  let invitedEmail = ''
  let invitationTokenHash = ''
  let invitationToken = ''
  let invitationId = 'invitation-1'
  let userEmail = options.userEmail ?? 'invitee@example.test'
  let invitationAccepted = false
  let invitationRevoked = false
  const delivered: string[] = []

  const query: WorkspaceQuery = async (text, params = []) => {
    if (text.startsWith('SELECT user_id FROM auth_sessions')) {
      const userId = sessionUsers.get(String(params[0]))
      return { rows: userId ? [{ user_id: userId }] : [] }
    }
    if (text.includes('FROM workspaces w') && text.includes('JOIN workspace_members')) {
      return {
        rows: options.role === undefined || options.role === 'owner'
          ? [{ workspace_name: 'Platform', role: 'owner', inviter_name: 'Workspace Owner' }]
          : [{ workspace_name: 'Platform', role: options.role, inviter_name: 'Workspace Owner' }]
      }
    }
    if (text.includes('FROM workspace_members wm') && text.includes('JOIN users u')) {
      return { rows: members }
    }
    if (text.includes('FROM workspace_members') && text.includes('lower(u.email)')) {
      return { rows: [] }
    }
    if (text.startsWith('SELECT 1 FROM workspace_invitations')) {
      const active = [...invitations.values()].some(row =>
        row.email === params[1] && !invitationRevoked && !invitationAccepted
      )
      return { rows: active ? [{ one: 1 }] : [] }
    }
    if (text.startsWith('INSERT INTO workspace_invitations')) {
      const duplicate = [...invitations.values()].some(row =>
        row.email === params[2] && !invitationRevoked && !invitationAccepted
      )
      if (duplicate) return { rows: [] }
      invitationId = String(params[0])
      invitedEmail = String(params[2])
      invitationTokenHash = String(params[3])
      const row = {
        id: invitationId,
        email: invitedEmail,
        role: 'member',
        created_at: '2026-10-21T00:00:00.000Z',
        expires_at: '2026-10-28T00:00:00.000Z',
        inviter_name: 'Workspace Owner'
      }
      invitations.set(invitationId, row)
      return { rows: [{ ...row }] }
    }
    if (text.startsWith('UPDATE workspace_invitations SET revoked_at')) {
      invitationRevoked = true
      return { rows: [{ id: params[0] }] }
    }
    if (text.startsWith('UPDATE workspace_invitations SET revoked_at = NOW()')) {
      invitationRevoked = true
      return { rows: [{ id: params[0] }] }
    }
    if (text.startsWith('SELECT email, verified FROM users')) {
      const userId = String(params[0])
      return {
        rows: [{
          email: userId === 'owner-1' ? 'owner@example.test' : userEmail,
          verified: options.verified ?? true
        }]
      }
    }
    if (text.includes('SELECT role FROM workspace_members')) {
      return { rows: [{ role: options.role ?? 'owner' }] }
    }
    if (text.startsWith('UPDATE workspace_invitations SET revoked_at')) {
      return { rows: [{ id: params[0] }] }
    }
    return { rows: [] }
  }

  const transaction: WorkspaceTransaction = async operation => operation(async (text, params = []) => {
    if (text.includes('SELECT id, workspace_id, email FROM workspace_invitations')) {
      const matched = String(params[0]) === invitationTokenHash &&
        !invitationRevoked && !invitationAccepted
      return {
        rows: matched
          ? [{ id: invitationId, workspace_id: 'workspace-1', email: invitedEmail }]
          : []
      }
    }
    if (text.startsWith('UPDATE workspace_invitations SET accepted_at')) {
      if (invitationRevoked || invitationAccepted) return { rows: [] }
      invitationAccepted = true
      return { rows: [{ workspace_id: 'workspace-1' }] }
    }
    if (text.startsWith('INSERT INTO workspace_members')) {
      members.push({ workspace_id: params[0], user_id: params[1], role: 'member' })
      return { rows: [] }
    }
    return { rows: [] }
  })

  const database: WorkspaceDatabase = { query, transaction }
  const app = Fastify()
  registerWorkspaceInvitationRoutes(app, database, {
    frontendUrl: 'https://structura.example.test',
    deliverInvitation: async (_email, _workspaceName, _inviterName, acceptanceUrl) => {
      if (options.deliveryFails) throw new Error('Mail delivery failed.')
      delivered.push(acceptanceUrl)
      invitationToken = new URL(acceptanceUrl).searchParams.get('invitation') ?? ''
    },
    onDeliveryFailure: () => {}
  })
  return {
    app,
    delivered,
    get invitationToken() { return invitationToken },
    get invitedEmail() { return invitedEmail },
    get members() { return members },
    set userEmail(value: string) { userEmail = value }
  }
}

test('workspace admins can send an expiring email invitation without exposing its token in API output', async () => {
  const api = createInvitationApi()
  try {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: ' Invitee@Example.Test ' }
    })

    assert.equal(response.statusCode, 201)
    assert.equal(response.json().invitation.email, 'invitee@example.test')
    assert.equal(response.json().invitation.role, 'member')
    assert.equal(response.json().invitation.inviter_name, 'Workspace Owner')
    assert.equal(JSON.stringify(response.json()).includes(api.invitationToken), false)
    assert.equal(api.delivered.length, 1)
    assert.equal(api.invitationToken.length, 43)
  } finally {
    await api.app.close()
  }
})

test('non-admins cannot invite members and invalid emails are rejected', async () => {
  const api = createInvitationApi({ role: 'member' })
  try {
    const forbidden = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'invitee@example.test' }
    })
    assert.equal(forbidden.statusCode, 403)
    assert.equal(api.delivered.length, 0)

    const invalid = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'not-an-email' }
    })
    assert.equal(invalid.statusCode, 400)
  } finally {
    await api.app.close()
  }
})

test('duplicate active invitations are rejected without sending a second email', async () => {
  const api = createInvitationApi()
  try {
    const first = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'invitee@example.test' }
    })
    const duplicate = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'invitee@example.test' }
    })

    assert.equal(first.statusCode, 201)
    assert.equal(duplicate.statusCode, 409)
    assert.equal(api.delivered.length, 1)
  } finally {
    await api.app.close()
  }
})

test('failed email delivery revokes the invitation and reports service unavailable', async () => {
  const api = createInvitationApi({ deliveryFails: true })
  try {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'invitee@example.test' }
    })

    assert.equal(response.statusCode, 503)
    assert.equal(api.delivered.length, 0)
    const retry = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'invitee@example.test' }
    })
    assert.equal(retry.statusCode, 503)
  } finally {
    await api.app.close()
  }
})

test('invite acceptance requires a verified account with the invited email', async () => {
  const api = createInvitationApi()
  try {
    const invited = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'invitee@example.test' }
    })
    assert.equal(invited.statusCode, 201)

    api.userEmail = 'other@example.test'
    const mismatch = await api.app.inject({
      method: 'POST',
      url: '/api/workspace-invitations/accept',
      headers: { authorization: 'Bearer invitee-session' },
      payload: { token: api.invitationToken }
    })
    assert.equal(mismatch.statusCode, 400)
    assert.equal(api.members.length, 0)

    api.userEmail = 'invitee@example.test'
    const accepted = await api.app.inject({
      method: 'POST',
      url: '/api/workspace-invitations/accept',
      headers: { authorization: 'Bearer invitee-session' },
      payload: { token: api.invitationToken }
    })
    assert.equal(accepted.statusCode, 200)
    assert.equal(accepted.json().workspaceId, 'workspace-1')
    assert.equal(api.members.length, 1)
    const replay = await api.app.inject({
      method: 'POST',
      url: '/api/workspace-invitations/accept',
      headers: { authorization: 'Bearer invitee-session' },
      payload: { token: api.invitationToken }
    })
    assert.equal(replay.statusCode, 400)
    assert.equal(api.members.length, 1)
  } finally {
    await api.app.close()
  }
})

test('unverified users and revoked invitations cannot create workspace memberships', async () => {
  const unverifiedApi = createInvitationApi({ verified: false })
  const revokedApi = createInvitationApi()
  try {
    const unverifiedInvitation = await unverifiedApi.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'invitee@example.test' }
    })
    assert.equal(unverifiedInvitation.statusCode, 201)
    const unverifiedAcceptance = await unverifiedApi.app.inject({
      method: 'POST',
      url: '/api/workspace-invitations/accept',
      headers: { authorization: 'Bearer invitee-session' },
      payload: { token: unverifiedApi.invitationToken }
    })
    assert.equal(unverifiedAcceptance.statusCode, 403)
    assert.equal(unverifiedApi.members.length, 0)

    const invitation = await revokedApi.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/invitations',
      headers: { authorization: 'Bearer owner-session' },
      payload: { email: 'invitee@example.test' }
    })
    assert.equal(invitation.statusCode, 201)
    const revoked = await revokedApi.app.inject({
      method: 'DELETE',
      url: '/api/workspaces/workspace-1/invitations/invitation-1',
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(revoked.statusCode, 200)

    const acceptance = await revokedApi.app.inject({
      method: 'POST',
      url: '/api/workspace-invitations/accept',
      headers: { authorization: 'Bearer invitee-session' },
      payload: { token: revokedApi.invitationToken }
    })
    assert.equal(acceptance.statusCode, 400)
    assert.equal(revokedApi.members.length, 0)
  } finally {
    await unverifiedApi.app.close()
    await revokedApi.app.close()
  }
})
