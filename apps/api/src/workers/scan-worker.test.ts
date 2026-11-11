import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  abortRunningWorkspaceScan,
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
