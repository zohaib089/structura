import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createGitScan,
  createUploadScan,
  getScan,
  getScanGraph,
  listScans,
  type Scan
} from '../../src/api/scans'

function sampleScan(overrides: Partial<Scan> = {}): Scan {
  const now = new Date().toISOString()
  return {
    id: 'scan-1',
    workspaceId: 'workspace-1',
    requestedBy: 'user-1',
    source: 'git',
    url: 'https://github.com/acme/app',
    branch: 'main',
    status: 'queued',
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    ...overrides
  }
}

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
      status: 200,
      json: async () => ({
        success: true,
        scans: [sampleScan({ status: 'succeeded', finishedAt: new Date().toISOString() })]
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

  it('creates git scans as JSON POST bodies and accepts HTTP 202', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        success: true,
        scan: sampleScan({ branch: 'dev' })
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
      status: 202,
      json: async () => ({
        success: true,
        scan: sampleScan({
          source: 'upload',
          url: null,
          branch: null
        })
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
      status: 200,
      json: async () => ({ success: true, graph: JSON.parse(sampleText) })
    } as Response)

    const graph = await getScanGraph('workspace-1', 'scan-1')
    expect(graph.summary.files).toBe(3)
  })

  it('surfaces graph-not-ready 409 responses from the API', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        message: 'Graph is not ready yet.',
        status: 'running'
      })
    } as Response)

    await expect(getScanGraph('workspace-1', 'scan-1')).rejects.toThrow('Graph is not ready yet.')
  })

  it('polls individual scans by id', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        scan: sampleScan({
          id: 'scan-4',
          url: 'https://gitlab.com/acme/app',
          branch: null,
          status: 'running',
          startedAt: new Date().toISOString()
        })
      })
    } as Response)

    const scan = await getScan('workspace-1', 'scan-4')
    expect(scan.status).toBe('running')
  })
})
