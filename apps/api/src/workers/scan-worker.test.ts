import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  abortRunningWorkspaceScan,
  omitDocSummaries,
  runWorkspaceScan,
  recoverWorkspaceScansOnStartup
} from './scan-worker.js'
import type { WorkspaceQuery } from '../db/types.js'

function createScanStore(entries: Array<[string, Record<string, unknown>]>) {
  const scans = new Map<string, Record<string, unknown>>(entries)
  const fileMeta = new Map<string, string | null>()

  const applyUpdate = (scan: Record<string, unknown>, text: string, params: unknown[]) => {
    const setPart = text.match(/SET (.+?) WHERE/s)?.[1] ?? ''
    for (const assignment of setPart.split(',').map(part => part.trim())) {
      if (assignment === 'updated_at = NOW()') continue
      if (assignment === 'upload_payload = NULL') {
        scan.upload_payload = null
        continue
      }
      const match = assignment.match(/^(\w+) = \$(\d+)$/)
      if (!match) continue
      const field = match[1]
      const value = params[Number(match[2]) - 1]
      scan[field] = value
    }
  }

  const query: WorkspaceQuery = async (text, params = []) => {
    if (text.startsWith('DELETE FROM workspace_scan_file_meta')) {
      const scanId = String(params[0])
      for (const key of [...fileMeta.keys()]) {
        if (key.startsWith(`${scanId}:`)) fileMeta.delete(key)
      }
      return { rows: [] }
    }
    if (text.includes('INSERT INTO workspace_scan_file_meta')) {
      const scanId = String(params[0])
      const paths = params[1] as string[]
      const summaries = params[2] as Array<string | null>
      paths.forEach((path, index) => {
        fileMeta.set(`${scanId}:${path}`, summaries[index] ?? null)
      })
      return { rows: [] }
    }
    if (text.startsWith('SELECT id, workspace_id')) {
      return { rows: scans.get(String(params[0])) ? [scans.get(String(params[0]))!] : [] }
    }
    if (text.startsWith('UPDATE workspace_scans')) {
      const onlyIfRunning = text.includes(' AND status =')
      const scanId = String(params.at(onlyIfRunning ? -2 : -1))
      const scan = scans.get(scanId)
      if (!scan) return { rows: [] }
      if (onlyIfRunning && scan.status !== 'running') return { rows: [] }
      applyUpdate(scan, text, params)
      return { rows: [] }
    }
    if (text.includes(`status IN ('queued', 'running')`)) {
      return { rows: [...scans.values()] }
    }
    return { rows: [] }
  }

  return { scans, query, fileMeta }
}

test('scan worker stores graph json after a mocked successful scan', async () => {
  const { scans, query, fileMeta } = createScanStore([
    [
      'scan-1',
      {
        id: 'scan-1',
        workspace_id: 'workspace-1',
        requested_by: 'user-1',
        source: 'git',
        source_url: 'https://github.com/org/repo',
        source_branch: null,
        upload_payload: null,
        status: 'queued',
        step: null,
        error_message: null,
        graph_json: null,
        created_at: '2026-11-02T00:00:00.000Z',
        updated_at: '2026-11-02T00:00:00.000Z',
        started_at: null,
        finished_at: null
      }
    ]
  ])

  await runWorkspaceScan('scan-1', {
    query,
    now: () => new Date('2026-11-02T00:00:01.000Z'),
    cloneRepository: async () => {
      const directory = await mkdtemp(join(tmpdir(), 'mock-clone-'))
      await mkdir(join(directory, '.git'), { recursive: true })
      await writeFile(join(directory, '.git', 'config'), '[remote "origin"]\n\turl = https://github.com/org/repo.git\n')
      await writeFile(join(directory, 'README.md'), 'hello')
      return { directory, cleanup: async () => undefined }
    },
    runScan: async () => ({
      graphJson: '{"schema":"graph.v1"}',
      graph: {} as never,
      graphPath: '/tmp/graph.json',
      run: {} as never,
      strictFailures: [],
      summary: 'ok',
      elapsedMs: 1,
      root: '/tmp',
      fileSummaries: { 'README.md': 'hello world' }
    }),
    runAnalysis: async () => ({
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-02T00:00:01.000Z',
      analysers: {},
      history: null,
      findings: [],
      improvements: []
    })
  })

  assert.equal(scans.get('scan-1')?.status, 'succeeded')
  assert.equal(scans.get('scan-1')?.step, null)
  assert.deepEqual(scans.get('scan-1')?.graph_json, { schema: 'graph.v1' })
  assert.equal((scans.get('scan-1')?.report_json as { schemaVersion?: string })?.schemaVersion, '1.0.0')
  assert.equal(fileMeta.get('scan-1:README.md'), 'hello world')
})

test('scan worker updates step through scan phases', async () => {
  const { scans, query, fileMeta } = createScanStore([
    [
      'scan-1',
      {
        id: 'scan-1',
        workspace_id: 'workspace-1',
        requested_by: 'user-1',
        source: 'git',
        source_url: 'https://github.com/org/repo',
        source_branch: null,
        upload_payload: null,
        status: 'queued',
        step: null,
        error_message: null,
        graph_json: null,
        report_json: null,
        created_at: '2026-11-02T00:00:00.000Z',
        updated_at: '2026-11-02T00:00:00.000Z',
        started_at: null,
        finished_at: null
      }
    ]
  ])

  const stepsSeen: string[] = []
  const originalApply = query
  const trackingQuery: WorkspaceQuery = async (text, params) => {
    const result = await originalApply(text, params)
    const scan = scans.get('scan-1')
    if (scan?.step) stepsSeen.push(String(scan.step))
    return result
  }

  let releaseScan!: () => void
  const scanGate = new Promise<void>(resolve => {
    releaseScan = resolve
  })

  const runPromise = runWorkspaceScan('scan-1', {
    query: trackingQuery,
    now: () => new Date('2026-11-02T00:00:01.000Z'),
    cloneRepository: async () => {
      const directory = await mkdtemp(join(tmpdir(), 'mock-clone-'))
      await mkdir(join(directory, '.git'), { recursive: true })
      return { directory, cleanup: async () => undefined }
    },
    runScan: async () => {
      await scanGate
      return {
        graphJson: '{"schema":"graph.v1"}',
        graph: {} as never,
        graphPath: '/tmp/graph.json',
        run: {} as never,
        strictFailures: [],
        summary: 'ok',
        elapsedMs: 1,
        root: '/tmp',
        fileSummaries: {}
      }
    },
    runAnalysis: async () => ({
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-02T00:00:01.000Z',
      analysers: {},
      history: null,
      findings: [],
      improvements: []
    })
  })

  await waitUntil(() => scans.get('scan-1')?.step === 'scanning')
  releaseScan()
  await runPromise

  assert.deepEqual([...new Set(stepsSeen)], ['fetching', 'scanning', 'analysing', 'saving'])
})

test('running scan stops cooperatively when aborted after cancel', async () => {
  const { scans, query, fileMeta } = createScanStore([
    [
      'scan-1',
      {
        id: 'scan-1',
        workspace_id: 'workspace-1',
        requested_by: 'user-1',
        source: 'git',
        source_url: 'https://github.com/org/repo',
        source_branch: null,
        upload_payload: null,
        status: 'queued',
        step: null,
        error_message: null,
        graph_json: null,
        report_json: null,
        created_at: '2026-11-02T00:00:00.000Z',
        updated_at: '2026-11-02T00:00:00.000Z',
        started_at: null,
        finished_at: null
      }
    ]
  ])

  let releaseScan!: () => void
  const scanGate = new Promise<void>(resolve => {
    releaseScan = resolve
  })

  const runPromise = runWorkspaceScan('scan-1', {
    query,
    now: () => new Date('2026-11-02T00:00:02.000Z'),
    cloneRepository: async () => {
      const directory = await mkdtemp(join(tmpdir(), 'mock-clone-'))
      await mkdir(join(directory, '.git'), { recursive: true })
      return { directory, cleanup: async () => undefined }
    },
    runScan: async () => {
      await scanGate
      return {
        graphJson: '{}',
        graph: {} as never,
        graphPath: '/tmp/graph.json',
        run: {} as never,
        strictFailures: [],
        summary: 'ok',
        elapsedMs: 1,
        root: '/tmp',
        fileSummaries: {}
      }
    },
    runAnalysis: async () => ({
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-02T00:00:02.000Z',
      analysers: {},
      history: null,
      findings: [],
      improvements: []
    })
  })

  await waitUntil(() => scans.get('scan-1')?.step === 'scanning')
  scans.get('scan-1')!.status = 'cancelled'
  scans.get('scan-1')!.step = null
  abortRunningWorkspaceScan('scan-1')
  releaseScan()
  await runPromise

  assert.equal(scans.get('scan-1')?.status, 'cancelled')
  assert.equal(scans.get('scan-1')?.step, null)
})

test('recoverWorkspaceScansOnStartup fails interrupted running scans', async () => {
  const { scans, query, fileMeta } = createScanStore([
    [
      'scan-running',
      {
        id: 'scan-running',
        source: 'upload',
        source_url: null,
        upload_payload: null,
        status: 'running',
        step: 'scanning'
      }
    ]
  ])

  await recoverWorkspaceScansOnStartup({ query, now: () => new Date('2026-11-03T00:00:00.000Z') })

  assert.equal(scans.get('scan-running')?.status, 'failed')
  assert.match(String(scans.get('scan-running')?.error_message), /interrupted/i)
})

async function waitUntil(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('Timed out waiting for condition.')
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

test('API scans never write docSummary even if the scanner returns or is asked for one', async () => {
  const { scans, query } = createScanStore([
    [
      'scan-docs',
      {
        id: 'scan-docs',
        workspace_id: 'workspace-1',
        requested_by: 'user-1',
        source: 'git',
        source_url: 'https://github.com/org/repo',
        source_branch: null,
        upload_payload: null,
        status: 'queued',
        step: null,
        error_message: null,
        graph_json: null,
        created_at: '2026-11-16T00:00:00.000Z',
        updated_at: '2026-11-16T00:00:00.000Z',
        started_at: null,
        finished_at: null
      }
    ]
  ])

  let capturedOptions: { docSummaries?: boolean } | undefined
  await runWorkspaceScan('scan-docs', {
    query,
    now: () => new Date('2026-11-16T00:00:01.000Z'),
    cloneRepository: async () => {
      const directory = await mkdtemp(join(tmpdir(), 'mock-clone-docs-'))
      await mkdir(join(directory, '.git'), { recursive: true })
      return { directory, cleanup: async () => undefined }
    },
    runScan: async (_root, options) => {
      capturedOptions = { docSummaries: options?.docSummaries }
      return {
        graphJson: JSON.stringify({
          schemaVersion: '1.1.0',
          summary: { nodes: 1, edges: 0, files: 1 },
          coverage: {
            files: { discovered: 1, parsed: 1, partial: 0, failed: 0, skipped: 0, ignored: 0 },
            byLanguage: [],
            skipped: [],
            failed: [],
            ignored: [],
            unresolved: [],
            accounting: { discovered: 1, accounted: 1 }
          },
          nodes: [
            {
              id: 'file:src/app.ts',
              kind: 'file',
              path: 'src/app.ts',
              label: 'app.ts',
              language: 'typescript',
              lineCount: 1,
              parse: { status: 'parsed' },
              docSummary: 'Application entry.'
            }
          ],
          edges: []
        }),
        graph: {} as never,
        graphPath: '/tmp/graph.json',
        run: {} as never,
        strictFailures: [],
        summary: 'ok',
        elapsedMs: 1,
        root: '/tmp',
        fileSummaries: { 'src/app.ts': 'Application entry.' }
      }
    },
    runAnalysis: async () => ({
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-16T00:00:01.000Z',
      analysers: {},
      history: null,
      findings: [],
      improvements: []
    })
  })

  assert.equal(capturedOptions?.docSummaries, false)
  assert.equal(scans.get('scan-docs')?.status, 'succeeded')
  const graph = scans.get('scan-docs')?.graph_json as { nodes: Array<{ docSummary?: string }> }
  assert.equal(Array.isArray(graph.nodes), true)
  assert.equal(graph.nodes.some(node => 'docSummary' in node && node.docSummary !== undefined), false)
})

test('scan worker sanitises hosted fileSummaries with sanitizeDocSummary before persist', async () => {
  const { scans, query, fileMeta } = createScanStore([
    [
      'scan-summaries',
      {
        id: 'scan-summaries',
        workspace_id: 'workspace-1',
        requested_by: 'user-1',
        source: 'git',
        source_url: 'https://github.com/org/repo',
        source_branch: null,
        upload_payload: null,
        status: 'queued',
        step: null,
        error_message: null,
        graph_json: null,
        created_at: '2026-11-18T00:00:00.000Z',
        updated_at: '2026-11-18T00:00:00.000Z',
        started_at: null,
        finished_at: null
      }
    ]
  ])

  await runWorkspaceScan('scan-summaries', {
    query,
    now: () => new Date('2026-11-18T00:00:01.000Z'),
    cloneRepository: async () => {
      const directory = await mkdtemp(join(tmpdir(), 'mock-clone-summaries-'))
      await mkdir(join(directory, '.git'), { recursive: true })
      return { directory, cleanup: async () => undefined }
    },
    runScan: async () => ({
      graphJson: '{"schema":"graph.v1"}',
      graph: {} as never,
      graphPath: '/tmp/graph.json',
      run: {} as never,
      strictFailures: [],
      summary: 'ok',
      elapsedMs: 1,
      root: '/tmp',
      fileSummaries: {
        'safe.ts': 'hello world',
        'aws.ts': 'Uses AKIAIOSFODNN7EXAMPLE in docs.',
        'gitlab.ts': 'Uses glpat-abcdefghijklmnopqrstuvwxyz12 for access.',
        'base64.ts': 'Key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY configured.',
        'prose.ts': 'The password is s3cr3tValue for tests.',
        'zw.ts': 'AKI\u200BAIOSFODNN7EXAMPLE',
        'email.ts': 'Contact support@example.com for help.',
        'phone.ts': 'Call +1 415-555-1212 for support.',
        'html.ts': 'Returns Array<string>.',
        'empty.ts': null
      }
    }),
    runAnalysis: async () => ({
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-18T00:00:01.000Z',
      analysers: {},
      history: null,
      findings: [],
      improvements: []
    })
  })

  assert.equal(scans.get('scan-summaries')?.status, 'succeeded')
  assert.equal(fileMeta.get('scan-summaries:safe.ts'), 'hello world')
  assert.equal(fileMeta.get('scan-summaries:aws.ts'), null)
  assert.equal(fileMeta.get('scan-summaries:gitlab.ts'), null)
  assert.equal(fileMeta.get('scan-summaries:base64.ts'), null)
  assert.equal(fileMeta.get('scan-summaries:prose.ts'), null)
  assert.equal(fileMeta.get('scan-summaries:zw.ts'), null)
  assert.equal(fileMeta.get('scan-summaries:email.ts'), null)
  assert.equal(fileMeta.get('scan-summaries:phone.ts'), null)
  assert.equal(fileMeta.get('scan-summaries:html.ts'), 'Returns Arraystring.')
  assert.equal(fileMeta.get('scan-summaries:empty.ts'), null)
  for (const value of fileMeta.values()) {
    assert.notEqual(value, undefined)
  }
})

test('omitDocSummaries keeps hotspot scores and the hotspots list', () => {
  const graph = omitDocSummaries({
    schemaVersion: '1.2.0',
    nodes: [
      {
        id: 'file:src/app.ts',
        kind: 'file',
        path: 'src/app.ts',
        docSummary: 'Application entry.',
        hotspot: { score: 80 }
      }
    ],
    hotspots: [{ path: 'src/app.ts', score: 80, why: 'Used by 4 files' }]
  }) as {
    nodes: Array<{ docSummary?: string; hotspot?: { score: number } }>
    hotspots: Array<{ path: string; score: number; why: string }>
  }
  assert.equal(graph.nodes[0]?.docSummary, undefined)
  assert.deepEqual(graph.nodes[0]?.hotspot, { score: 80 })
  assert.deepEqual(graph.hotspots, [{ path: 'src/app.ts', score: 80, why: 'Used by 4 files' }])
})

test('omitDocSummaries keeps quality scores', () => {
  const graph = omitDocSummaries({
    schemaVersion: '1.3.0',
    nodes: [
      {
        id: 'file:src/app.ts',
        kind: 'file',
        path: 'src/app.ts',
        docSummary: 'Application entry.',
        hotspot: { score: 80 }
      }
    ],
    quality: {
      project: {
        score: 92,
        grade: 'A',
        breakdown: [{ category: 'cycles', label: '1 import cycle', penalty: 8 }],
        tips: [{ text: 'Break the cycle between auth and api to gain about 8 points', gain: 8 }]
      }
    }
  }) as {
    nodes: Array<{ docSummary?: string }>
    quality: { project: { score: number; grade: string; tips: Array<{ gain: number }> } }
  }
  assert.equal(graph.nodes[0]?.docSummary, undefined)
  assert.equal(graph.quality.project.score, 92)
  assert.equal(graph.quality.project.grade, 'A')
  assert.equal(graph.quality.project.tips[0]?.gain, 8)
})
