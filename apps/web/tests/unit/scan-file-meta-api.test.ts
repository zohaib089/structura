import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getScanFileMeta, parseScanFileMetaResponse } from '../../src/api/scan-file-meta'

describe('scan file-meta API client', () => {
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

  it('parses file-meta payloads', () => {
    const files = parseScanFileMetaResponse({
      success: true,
      files: [
        { path: 'src/a.ts', summary: 'Entry module.' },
        { path: 'src/b.ts', summary: null }
      ]
    })
    expect(files).toEqual([
      { path: 'src/a.ts', summary: 'Entry module.' },
      { path: 'src/b.ts', summary: null }
    ])
  })

  it('loads a single path with bearer auth', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        files: [{ path: 'src/a.ts', summary: 'Hello' }]
      })
    } as Response)

    const entry = await getScanFileMeta('ws-1', 'scan-1', 'src/a.ts')
    expect(entry).toEqual({ path: 'src/a.ts', summary: 'Hello' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/workspaces/ws-1/scans/scan-1/file-meta?path=src%2Fa.ts',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer scan-session' })
      })
    )
  })
})
