import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createGitScan,
  createUploadScan,
  getScan,
  getScanGraph,
  listScans
} from '../../src/api/scans'

describe('scans API client', () => {
  beforeEach(() => {
    localStorage.setItem(
      'structura-auth-session-v2',
      JSON.stringify({
        token: 'scan-session',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: { id: 'user-1' }
      })
    )
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('lists scans with bearer auth and validates records', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        scans: [{
          id: 'scan-1',
          source: 'git',
          url: 'https://github.com/acme/app',
          branch: 'main',
          upload_name: null,
          status: 'succeeded',
          created_at: new Date().toISOString(),
          error: null
        }]
      })
    } as Response)

    const scans = await listScans('workspace-1')
    expect(scans).toHaveLength(1)
    expect(scans[0]?.id).toBe('scan-1')
    expect(fetch).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/scans',
      expect.objectContaining({
        headers: { Authorization: 'Bearer scan-session' }
      })
    )
  })

  it('creates git scans as JSON POST bodies', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        scan: {
          id: 'scan-2',
          source: 'git',
          url: 'https://github.com/acme/app',
          branch: null,
          upload_name: null,
          status: 'queued',
          created_at: new Date().toISOString(),
          error: null
        }
      })
    } as Response)

    const scan = await createGitScan('workspace-1', 'https://github.com/acme/app', 'dev')
    expect(scan.status).toBe('queued')
    expect(fetch).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/scans',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ source: 'git', url: 'https://github.com/acme/app', branch: 'dev' })
      })
    )
  })

  it('uploads folder archives as multipart form data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        scan: {
          id: 'scan-3',
          source: 'upload',
          url: null,
          branch: null,
          upload_name: 'repo.zip',
          status: 'queued',
          created_at: new Date().toISOString(),
          error: null
        }
      })
    } as Response)

    const blob = new Blob(['zip'], { type: 'application/zip' })
    const scan = await createUploadScan('workspace-1', blob, 'repo.zip')
    expect(scan.source).toBe('upload')
    const call = vi.mocked(fetch).mock.calls[0]
    expect(call?.[1]?.body).toBeInstanceOf(FormData)
  })

  it('loads scan graphs through the shared graph reader', async () => {
    const sampleText = readFileSync(resolve('fixtures/sample-graph.json'), 'utf8')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, graph: JSON.parse(sampleText) })
    } as Response)

    const graph = await getScanGraph('workspace-1', 'scan-1')
    expect(graph.summary.files).toBe(3)
  })

  it('polls individual scans by id', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        scan: {
          id: 'scan-4',
          source: 'git',
          url: 'https://gitlab.com/acme/app',
          branch: null,
          upload_name: null,
          status: 'running',
          created_at: new Date().toISOString(),
          error: null
        }
      })
    } as Response)

    const scan = await getScan('workspace-1', 'scan-4')
    expect(scan.status).toBe('running')
  })
})
