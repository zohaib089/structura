import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { runWorkspaceScan } from './scan-worker.js'
import type { WorkspaceQuery } from './workspace-routes.js'

test('scan worker stores graph json after a mocked successful scan', async () => {
  const scans = new Map<string, Record<string, unknown>>([
    ['scan-1', {
      id: 'scan-1',
      workspace_id: 'workspace-1',
      requested_by: 'user-1',
      source: 'git',
      source_url: 'https://github.com/org/repo',
      source_branch: null,
      upload_payload: null,
      status: 'queued',
      error_message: null,
      graph_json: null,
      created_at: '2026-11-02T00:00:00.000Z',
      updated_at: '2026-11-02T00:00:00.000Z',
      started_at: null,
      finished_at: null
    }]
  ])

  const query: WorkspaceQuery = async (text, params = []) => {
    if (text.startsWith('SELECT id, workspace_id')) {
      return { rows: scans.get(String(params[0])) ? [scans.get(String(params[0]))!] : [] }
    }
    if (text.startsWith('UPDATE workspace_scans')) {
      const scan = scans.get(String(params.at(-1)))
      if (!scan) return { rows: [] }
      const statusIndex = text.indexOf('status = $1')
      if (statusIndex >= 0) scan.status = String(params[0])
      if (text.includes('graph_json =')) scan.graph_json = { schema: 'graph.v1' }
      if (text.includes('error_message =')) scan.error_message = params[1]
      return { rows: [] }
    }
    return { rows: [] }
  }

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
      root: directoryPlaceholder()
    })
  })

  assert.equal(scans.get('scan-1')?.status, 'succeeded')
  assert.deepEqual(scans.get('scan-1')?.graph_json, { schema: 'graph.v1' })
})

function directoryPlaceholder(): string {
  return '/tmp'
}
