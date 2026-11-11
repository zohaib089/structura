import assert from 'node:assert/strict'
import test from 'node:test'
import { loadScanFileMeta, replaceScanFileMeta } from './scan-file-meta.js'
import type { WorkspaceQuery } from '../db/types.js'

test('replaceScanFileMeta stores and reloads summaries by path', async () => {
  const rows = new Map<string, string | null>()

  const query: WorkspaceQuery = async (text, params = []) => {
    if (text.startsWith('DELETE FROM workspace_scan_file_meta')) {
      for (const key of [...rows.keys()]) {
        if (key.startsWith(`${String(params[0])}:`)) rows.delete(key)
      }
      return { rows: [] }
    }
    if (text.includes('INSERT INTO workspace_scan_file_meta')) {
      const scanId = String(params[0])
      const paths = params[1] as string[]
      const summaries = params[2] as Array<string | null>
      paths.forEach((path, index) => {
        rows.set(`${scanId}:${path}`, summaries[index] ?? null)
      })
      return { rows: [] }
    }
    if (text.includes('FROM workspace_scan_file_meta')) {
      const scanId = String(params[0])
      const paths = params[1] as string[]
      return {
        rows: paths
          .filter(path => rows.has(`${scanId}:${path}`))
          .map(path => ({ path, summary: rows.get(`${scanId}:${path}`) ?? null }))
      }
    }
    return { rows: [] }
  }

  await replaceScanFileMeta(query, 'scan-1', [
    { path: 'src/a.ts', summary: 'Module A' },
    { path: 'src/b.ts', summary: null }
  ])

  const loaded = await loadScanFileMeta(query, 'scan-1', ['src/a.ts', 'src/b.ts', 'src/missing.ts'])
  assert.equal(loaded.get('src/a.ts'), 'Module A')
  assert.equal(loaded.get('src/b.ts'), null)
  assert.equal(loaded.has('src/missing.ts'), false)
})
