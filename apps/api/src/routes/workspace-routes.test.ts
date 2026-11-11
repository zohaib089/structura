import assert from 'node:assert/strict'
import test from 'node:test'
import Fastify from 'fastify'
import {
  registerWorkspaceRoutes,
  type WorkspaceDatabase,
  type WorkspaceQuery,
  type WorkspaceTransaction
} from './workspace-routes.js'

function createWorkspaceApi(initialMemberships: Record<string, string> = {}) {
  const memberships = new Map(Object.entries(initialMemberships))
  const created: string[] = []

  const query: WorkspaceQuery = async (text, params = []) => {
    if (text.startsWith('SELECT user_id FROM auth_sessions')) {
      return { rows: [{ user_id: 'user-1' }] }
    }

    if (text.startsWith('SELECT role FROM workspace_members')) {
      const key = `${String(params[0])}:${String(params[1])}`
      const role = memberships.get(key)
      return { rows: role ? [{ role }] : [] }
    }

    if (text.startsWith('INSERT INTO projects')) {
      return {
        rows: [{
          id: params[0],
          name: params[2],
          description: params[3],
          created_at: '2026-10-20T00:00:00.000Z',
          updated_at: '2026-10-20T00:00:00.000Z'
        }]
      }
    }

    return { rows: [] }
  }

  const transaction: WorkspaceTransaction = async operation => operation(async (text, params = []) => {
    if (text.startsWith('INSERT INTO workspace_members')) {
      memberships.set(`${String(params[0])}:${String(params[1])}`, String(params[2]))
    }
    if (text.startsWith('INSERT INTO workspaces')) {
      created.push(String(params[0]))
      return {
        rows: [{
          id: params[0],
          name: params[1],
          created_at: '2026-10-20T00:00:00.000Z',
          updated_at: '2026-10-20T00:00:00.000Z'
        }]
      }
    }
    return { rows: [] }
  })

  const database: WorkspaceDatabase = { query, transaction }
  const app = Fastify()
  registerWorkspaceRoutes(app, database)

  return { app, memberships, created }
}

test('requires an active session for workspace APIs', async () => {
  const api = createWorkspaceApi()
  try {
    const response = await api.app.inject({ method: 'GET', url: '/api/workspaces' })
    assert.equal(response.statusCode, 401)
  } finally {
    await api.app.close()
  }
})

test('does not reveal a workspace to a user outside its membership', async () => {
  const api = createWorkspaceApi()
  try {
    const response = await api.app.inject({
      method: 'GET',
      url: '/api/workspaces/private-workspace/projects',
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(response.statusCode, 404)
    assert.equal(response.json().message, 'Workspace not found.')
  } finally {
    await api.app.close()
  }
})

test('allows workspace members to read but not create projects', async () => {
  const api = createWorkspaceApi({ 'workspace-1:user-1': 'member' })
  try {
    const list = await api.app.inject({
      method: 'GET',
      url: '/api/workspaces/workspace-1/projects',
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(list.statusCode, 200)
    assert.deepEqual(list.json().projects, [])

    const create = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/projects',
      headers: { authorization: 'Bearer valid-session' },
      payload: { name: 'New project' }
    })
    assert.equal(create.statusCode, 403)
  } finally {
    await api.app.close()
  }
})

test('allows workspace owners to create validated projects', async () => {
  const api = createWorkspaceApi({ 'workspace-1:user-1': 'owner' })
  try {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/projects',
      headers: { authorization: 'Bearer valid-session' },
      payload: { name: '  Source analyzer  ', description: 'Analyze repositories.' }
    })

    assert.equal(response.statusCode, 201)
    assert.equal(response.json().project.name, 'Source analyzer')
    assert.equal(response.json().project.description, 'Analyze repositories.')
  } finally {
    await api.app.close()
  }
})

test('creates a workspace and makes its creator the owner atomically', async () => {
  const api = createWorkspaceApi()
  try {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: { authorization: 'Bearer valid-session' },
      payload: { name: '  Platform Team  ' }
    })
    const result = response.json()

    assert.equal(response.statusCode, 201)
    assert.equal(result.workspace.name, 'Platform Team')
    assert.equal(result.workspace.role, 'owner')
    assert.equal(api.created.length, 1)
    assert.equal(api.memberships.get(`${result.workspace.id}:user-1`), 'owner')
  } finally {
    await api.app.close()
  }
})
