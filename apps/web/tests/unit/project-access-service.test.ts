import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getProject,
  getProjectAccess,
  updateProjectAccess,
  WorkspaceApiError
} from '../../src/services/workspaces'

const accessPath = '/api/workspaces/workspace%2F1/projects/project%2F9/access'
const projectPath = '/api/workspaces/workspace%2F1/projects/project%2F9'

const validProject = {
  id: 'project/9',
  name: 'Atlas',
  description: 'Code map',
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-11-22T00:00:00.000Z'
}

const validAccess = {
  restricted: true,
  members: [
    { id: 'user-3', role: 'member', created_at: '2026-03-10T00:00:00.000Z' }
  ]
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

describe('project access API client', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('loads a project and its access settings with encoded ids', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, project: validProject }))
      .mockResolvedValueOnce(jsonResponse({ success: true, access: validAccess }))

    await expect(getProject('workspace/1', 'project/9')).resolves.toEqual(validProject)
    await expect(getProjectAccess('workspace/1', 'project/9')).resolves.toEqual(validAccess)

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      projectPath,
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer current-session' }
      })
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      accessPath,
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer current-session' }
      })
    )
  })

  it('saves access settings and returns the updated list', async () => {
    const updated = {
      restricted: true,
      members: [
        { id: 'user-2', role: 'member', created_at: '2026-11-22T00:00:00.000Z' }
      ]
    }
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true, access: updated }))

    await expect(
      updateProjectAccess('workspace/1', 'project/9', {
        restricted: true,
        member_ids: ['user-2']
      })
    ).resolves.toEqual(updated)

    expect(fetch).toHaveBeenCalledWith(
      accessPath,
      expect.objectContaining({
        method: 'PUT',
        headers: {
          Authorization: 'Bearer current-session',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ restricted: true, member_ids: ['user-2'] })
      })
    )
  })

  it('surfaces 403 and 404 failures with their status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, message: 'Workspace admin access is required to update project access.' }, 403)
    )
    const forbidden = updateProjectAccess('workspace/1', 'project/9', {
      restricted: true,
      member_ids: []
    })
    await expect(forbidden).rejects.toBeInstanceOf(WorkspaceApiError)
    await expect(forbidden).rejects.toMatchObject({
      status: 403,
      message: 'Workspace admin access is required to update project access.'
    })

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, message: 'Project not found.' }, 404)
    )
    const missing = getProjectAccess('workspace/1', 'project/9')
    await expect(missing).rejects.toBeInstanceOf(WorkspaceApiError)
    await expect(missing).rejects.toMatchObject({ status: 404, message: 'Project not found.' })
  })

  it('rejects an access payload that is missing restricted or has invalid members', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: true, access: { members: [] } })
    )
    await expect(getProjectAccess('workspace/1', 'project/9')).rejects.toThrow(
      'The project access response was invalid.'
    )

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        success: true,
        access: { restricted: true, members: [{ id: 'user-3', role: 'guest', created_at: '2026-03-10T00:00:00.000Z' }] }
      })
    )
    await expect(getProjectAccess('workspace/1', 'project/9')).rejects.toThrow(
      'The project access response was invalid.'
    )
  })
})
