import assert from 'node:assert/strict'
import test from 'node:test'
import Fastify from 'fastify'
import { registerWorkspaceScanRoutes } from './scan-routes.js'
import type { WorkspaceDatabase, WorkspaceQuery } from './workspace-routes.js'

function createScanApi() {
  const scans = new Map<string, Record<string, unknown>>()
  const memberships = new Map<string, string>([['workspace-1:user-1', 'member']])

  const query: WorkspaceQuery = async (text, params = []) => {
    if (text.startsWith('SELECT user_id FROM auth_sessions')) {
      return { rows: [{ user_id: 'user-1' }] }
    }
    if (text.startsWith('SELECT 1 FROM workspace_members')) {
      const key = `${String(params[0])}:${String(params[1])}`
      return { rows: memberships.has(key) ? [{ '?column?': 1 }] : [] }
    }
    if (text.startsWith('INSERT INTO workspace_scans')) {
      const scan = {
        id: params[0],
        workspace_id: params[1],
        requested_by: params[2],
        source: text.includes("'git'") ? 'git' : 'upload',
        source_url: text.includes("'git'") ? params[3] : null,
        source_branch: text.includes("'git'") ? params[4] : null,
        status: 'queued',
        step: null,
        error_message: null,
        created_at: '2026-11-02T00:00:00.000Z',
        updated_at: '2026-11-02T00:00:00.000Z',
        started_at: null,
        finished_at: null
      }
      scans.set(String(params[0]), scan)
      return { rows: [scan] }
    }
    if (text.startsWith('SELECT id, workspace_id, requested_by, source, source_url')) {
      const workspaceId = String(params[0])
      const rows = [...scans.values()].filter(scan => scan.workspace_id === workspaceId)
      return { rows }
    }
    if (text.includes('WHERE workspace_id = $1 AND id = $2') && text.includes('graph_json')) {
      const scan = scans.get(String(params[1]))
      return { rows: scan ? [{ status: scan.status, graph_json: scan.graph_json ?? null }] : [] }
    }
    if (text.includes('WHERE workspace_id = $1 AND id = $2') && text.includes('report_json')) {
      const scan = scans.get(String(params[1]))
      return { rows: scan ? [{ status: scan.status, report_json: scan.report_json ?? null }] : [] }
    }
    if (text.includes('WHERE workspace_id = $1 AND id = $2')) {
      const scan = scans.get(String(params[1]))
      return { rows: scan ? [scan] : [] }
    }
    if (text.startsWith('UPDATE workspace_scans') && text.includes(`status = 'cancelled'`)) {
      const scan = scans.get(String(params[2]))
      if (!scan) return { rows: [] }
      if (text.includes(`status = 'queued'`) && scan.status !== 'queued') return { rows: [] }
      if (text.includes(`status = 'running'`) && scan.status !== 'running') return { rows: [] }
      scan.status = 'cancelled'
      scan.step = null
      scan.finished_at = params[0]
      return { rows: [scan] }
    }
    return { rows: [] }
  }

  const database: WorkspaceDatabase = {
    query,
    transaction: async operation => operation(query)
  }

  const app = Fastify()
  registerWorkspaceScanRoutes(app, database)
  return { app, scans }
}

test('scan routes require auth and workspace membership', async () => {
  const api = createScanApi()
  try {
    const unauthenticated = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    assert.equal(unauthenticated.statusCode, 401)
  } finally {
    await api.app.close()
  }
})

test('scan routes reject unsupported git URLs', async () => {
  const api = createScanApi()
  try {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://evil.example.com/org/repo' }
    })
    assert.equal(response.statusCode, 400)
  } finally {
    await api.app.close()
  }
})

test('scan routes accept allowlisted git sources', async () => {
  const api = createScanApi()
  try {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo', branch: 'main' }
    })
    assert.equal(response.statusCode, 202)
    assert.equal(response.json().scan.status, 'queued')
    assert.equal(response.json().scan.branch, 'main')
  } finally {
    await api.app.close()
  }
})

test('graph route returns 409 until scan completes', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://gitlab.com/group/project' }
    })
    const scanId = created.json().scan.id as string
    const graph = await api.app.inject({
      method: 'GET',
      url: `/api/workspaces/workspace-1/scans/${scanId}/graph`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(graph.statusCode, 409)
  } finally {
    await api.app.close()
  }
})

test('report route returns 409 until scan completes', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string
    const report = await api.app.inject({
      method: 'GET',
      url: `/api/workspaces/workspace-1/scans/${scanId}/report`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(report.statusCode, 409)
  } finally {
    await api.app.close()
  }
})

test('cancel route cancels a queued scan', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string
    const cancelled = await api.app.inject({
      method: 'POST',
      url: `/api/workspaces/workspace-1/scans/${scanId}/cancel`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(cancelled.statusCode, 200)
    assert.equal(cancelled.json().scan.status, 'cancelled')
    assert.equal(cancelled.json().scan.step, null)
    assert.ok(cancelled.json().scan.finishedAt)
  } finally {
    await api.app.close()
  }
})

test('cancel route cancels a running scan', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string
    const scan = api.scans.get(scanId)!
    scan.status = 'running'
    scan.step = 'scanning'

    const cancelled = await api.app.inject({
      method: 'POST',
      url: `/api/workspaces/workspace-1/scans/${scanId}/cancel`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(cancelled.statusCode, 200)
    assert.equal(cancelled.json().scan.status, 'cancelled')
  } finally {
    await api.app.close()
  }
})

test('cancel route returns 409 when scan already finished', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string
    api.scans.get(scanId)!.status = 'succeeded'

    const cancelled = await api.app.inject({
      method: 'POST',
      url: `/api/workspaces/workspace-1/scans/${scanId}/cancel`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(cancelled.statusCode, 409)
    assert.equal(cancelled.json().success, false)
  } finally {
    await api.app.close()
  }
})

test('report route returns stored report when ready', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string
    const scan = api.scans.get(scanId)!
    scan.status = 'succeeded'
    scan.report_json = { schemaVersion: '1.0.0', findings: [] }

    const report = await api.app.inject({
      method: 'GET',
      url: `/api/workspaces/workspace-1/scans/${scanId}/report`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(report.statusCode, 200)
    assert.equal(report.json().report.schemaVersion, '1.0.0')
  } finally {
    await api.app.close()
  }
})
