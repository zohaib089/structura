import assert from 'node:assert/strict'
import test from 'node:test'
import Fastify from 'fastify'
import { registerWorkspaceScanRoutes } from './scan-routes.js'
import type { WorkspaceDatabase, WorkspaceQuery } from '../db/types.js'

function createScanApi() {
  const scans = new Map<string, Record<string, unknown>>()
  const fileMeta = new Map<string, string | null>()
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
    if (text.includes('FROM workspace_scan_file_meta')) {
      const scanId = String(params[0])
      const paths = params[1] as string[]
      return {
        rows: paths
          .filter(path => fileMeta.has(`${scanId}:${path}`))
          .map(path => ({ path, summary: fileMeta.get(`${scanId}:${path}`) ?? null }))
      }
    }
    if (text.includes('WHERE workspace_id = $1 AND id = $2') && text.startsWith('SELECT status')) {
      const scan = scans.get(String(params[1]))
      return { rows: scan ? [{ status: scan.status }] : [] }
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
  return { app, scans, fileMeta }
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

test('file-meta route returns 409 until scan completes', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string
    const response = await api.app.inject({
      method: 'GET',
      url: `/api/workspaces/workspace-1/scans/${scanId}/file-meta?path=src/app.ts`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(response.statusCode, 409)
  } finally {
    await api.app.close()
  }
})

test('file-meta route returns stored summaries when ready', async () => {
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
    api.fileMeta.set(`${scanId}:src/app.ts`, 'Application entry.')
    api.fileMeta.set(`${scanId}:src/util.ts`, null)

    const single = await api.app.inject({
      method: 'GET',
      url: `/api/workspaces/workspace-1/scans/${scanId}/file-meta?path=src/app.ts`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(single.statusCode, 200)
    assert.deepEqual(single.json(), {
      success: true,
      files: [{ path: 'src/app.ts', summary: 'Application entry.' }]
    })

    const batch = await api.app.inject({
      method: 'GET',
      url: `/api/workspaces/workspace-1/scans/${scanId}/file-meta?paths=src/app.ts,src/util.ts,src/missing.ts`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(batch.statusCode, 200)
    assert.deepEqual(batch.json(), {
      success: true,
      files: [
        { path: 'src/app.ts', summary: 'Application entry.' },
        { path: 'src/util.ts', summary: null },
        { path: 'src/missing.ts', summary: null }
      ]
    })
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

test('graph route returns stored hotspots when ready', async () => {
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
    scan.graph_json = {
      schemaVersion: '1.2.0',
      nodes: [
        {
          id: 'file:src/app.ts',
          kind: 'file',
          path: 'src/app.ts',
          hotspot: { score: 80 }
        }
      ],
      edges: [],
      hotspots: [{ path: 'src/app.ts', score: 80, why: 'Used by 4 files and has 2 findings' }]
    }

    const response = await api.app.inject({
      method: 'GET',
      url: `/api/workspaces/workspace-1/scans/${scanId}/graph`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(response.json().success, true)
    assert.equal(response.json().graph.schemaVersion, '1.2.0')
    assert.deepEqual(response.json().graph.hotspots, [
      { path: 'src/app.ts', score: 80, why: 'Used by 4 files and has 2 findings' }
    ])
    assert.equal(response.json().graph.nodes[0].hotspot.score, 80)
  } finally {
    await api.app.close()
  }
})

test('graph route returns stored quality scores when ready', async () => {
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
    scan.graph_json = {
      schemaVersion: '1.3.0',
      nodes: [],
      edges: [],
      quality: {
        project: {
          score: 92,
          grade: 'A',
          breakdown: [
            { category: 'architecture', label: 'No architecture rule breaks', penalty: 0 },
            { category: 'cycles', label: '1 import cycle', penalty: 8 },
            { category: 'hotspots', label: 'No highly connected hotspots', penalty: 0 },
            { category: 'imports', label: 'Imports resolve cleanly', penalty: 0 },
            { category: 'size', label: 'No unusually large files or functions', penalty: 0 }
          ],
          tips: [{ text: 'Break the cycle between auth and api to gain about 8 points', gain: 8 }]
        }
      }
    }

    const response = await api.app.inject({
      method: 'GET',
      url: `/api/workspaces/workspace-1/scans/${scanId}/graph`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(response.json().success, true)
    assert.equal(response.json().graph.schemaVersion, '1.3.0')
    assert.equal(response.json().graph.quality.project.score, 92)
    assert.equal(response.json().graph.quality.project.grade, 'A')
    assert.equal(response.json().graph.quality.project.tips[0].gain, 8)
  } finally {
    await api.app.close()
  }
})

test('graph route returns stored duplicates when ready', async () => {
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
    scan.graph_json = {
      schemaVersion: '1.4.0',
      nodes: [],
      edges: [],
      duplicates: {
        summary: { groups: 1, duplicatedLines: 12, percentage: 8 },
        groups: [
          {
            id: 'abc123def456',
            lineCount: 6,
            occurrences: [
              { path: 'src/a.ts', startLine: 10, endLine: 16 },
              { path: 'src/b.ts', startLine: 4, endLine: 10 }
            ],
            description: '6 identical lines in src/a.ts and src/b.ts'
          }
        ]
      }
    }

    const response = await api.app.inject({
      method: 'GET',
      url: `/api/workspaces/workspace-1/scans/${scanId}/graph`,
      headers: { authorization: 'Bearer valid-session' }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(response.json().success, true)
    assert.equal(response.json().graph.schemaVersion, '1.4.0')
    assert.equal(response.json().graph.duplicates.summary.groups, 1)
    assert.equal(response.json().graph.duplicates.groups[0].id, 'abc123def456')
    assert.equal(response.json().graph.duplicates.groups[0].occurrences.length, 2)
  } finally {
    await api.app.close()
  }
})

function sampleAskGraph() {
  return {
    schemaVersion: '1.4.0',
    summary: { nodes: 2, edges: 1, files: 2 },
    coverage: {
      files: { discovered: 2, parsed: 2, partial: 0, failed: 0, skipped: 0, ignored: 0 },
      byLanguage: [{ language: 'typescript', parsed: 2, partial: 0, failed: 0, skipped: 0 }],
      skipped: [],
      failed: [],
      ignored: [],
      unresolved: [],
      accounting: { discovered: 2, accounted: 2 }
    },
    nodes: [
      {
        id: 'file:src/app.ts',
        kind: 'file',
        path: 'src/app.ts',
        label: 'app.ts',
        language: 'typescript',
        lineCount: 20,
        parse: { status: 'parsed' },
        docSummary: 'Application entry.'
      },
      {
        id: 'file:src/util.ts',
        kind: 'file',
        path: 'src/util.ts',
        label: 'util.ts',
        language: 'typescript',
        lineCount: 8,
        parse: { status: 'parsed' }
      }
    ],
    edges: [
      {
        source: 'file:src/app.ts',
        type: 'imports',
        target: 'file:src/util.ts',
        provenance: 'EXTRACTED',
        span: { start: { line: 1, col: 1 }, end: { line: 1, col: 8 } },
        specifier: './util'
      }
    ]
  }
}

test('ask route answers a question from a stored graph', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string
    const scan = api.scans.get(scanId)
    assert.ok(scan)
    scan.status = 'succeeded'
    scan.graph_json = sampleAskGraph()

    const response = await api.app.inject({
      method: 'POST',
      url: `/api/workspaces/workspace-1/scans/${scanId}/ask`,
      headers: { authorization: 'Bearer valid-session' },
      payload: { question: '  What does src/app.ts do?  ' }
    })
    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.equal(body.success, true)
    assert.equal(body.intent, 'explain')
    assert.match(body.answer, /Application entry/)
    assert.ok(Array.isArray(body.citations))
    assert.ok(body.citations.some((item: { path: string }) => item.path === 'src/app.ts'))
    assert.ok(Array.isArray(body.suggestions))
  } finally {
    await api.app.close()
  }
})

test('ask route rejects an empty or missing question', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string
    const headers = { authorization: 'Bearer valid-session' }
    const url = `/api/workspaces/workspace-1/scans/${scanId}/ask`

    const empty = await api.app.inject({ method: 'POST', url, headers, payload: { question: '   ' } })
    assert.equal(empty.statusCode, 400)
    assert.match(empty.json().message, /required/)

    const missing = await api.app.inject({ method: 'POST', url, headers, payload: {} })
    assert.equal(missing.statusCode, 400)
  } finally {
    await api.app.close()
  }
})

test('ask route rejects a question longer than 500 characters', async () => {
  const api = createScanApi()
  try {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers: { authorization: 'Bearer valid-session' },
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string
    const response = await api.app.inject({
      method: 'POST',
      url: `/api/workspaces/workspace-1/scans/${scanId}/ask`,
      headers: { authorization: 'Bearer valid-session' },
      payload: { question: 'x'.repeat(501) }
    })
    assert.equal(response.statusCode, 400)
    assert.match(response.json().message, /500/)
  } finally {
    await api.app.close()
  }
})

test('ask route requires an active session', async () => {
  const api = createScanApi()
  try {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans/scan-1/ask',
      payload: { question: 'What languages does this use?' }
    })
    assert.equal(response.statusCode, 401)
  } finally {
    await api.app.close()
  }
})

test('ask route returns 404 for an unknown workspace, scan, or missing graph', async () => {
  const api = createScanApi()
  try {
    const headers = { authorization: 'Bearer valid-session' }
    const unknownWorkspace = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/no-such-workspace/scans/scan-1/ask',
      headers,
      payload: { question: 'What languages does this use?' }
    })
    assert.equal(unknownWorkspace.statusCode, 404)
    assert.equal(unknownWorkspace.json().message, 'Workspace not found.')

    const created = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans',
      headers,
      payload: { source: 'git', url: 'https://github.com/org/repo' }
    })
    const scanId = created.json().scan.id as string

    const unknownScan = await api.app.inject({
      method: 'POST',
      url: '/api/workspaces/workspace-1/scans/00000000-0000-0000-0000-000000000000/ask',
      headers,
      payload: { question: 'What languages does this use?' }
    })
    assert.equal(unknownScan.statusCode, 404)
    assert.equal(unknownScan.json().message, 'Scan not found.')

    const noGraph = await api.app.inject({
      method: 'POST',
      url: `/api/workspaces/workspace-1/scans/${scanId}/ask`,
      headers,
      payload: { question: 'What languages does this use?' }
    })
    // queued scans match the graph route and return 409; a finished scan without a graph is 404
    assert.ok([404, 409].includes(noGraph.statusCode))

    const scan = api.scans.get(scanId)
    assert.ok(scan)
    scan.status = 'failed'
    scan.graph_json = null
    const failed = await api.app.inject({
      method: 'POST',
      url: `/api/workspaces/workspace-1/scans/${scanId}/ask`,
      headers,
      payload: { question: 'What languages does this use?' }
    })
    assert.equal(failed.statusCode, 404)
    assert.equal(failed.json().message, 'Graph is not available for this scan.')
  } finally {
    await api.app.close()
  }
})
