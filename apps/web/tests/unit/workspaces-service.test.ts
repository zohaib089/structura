import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loginUser } from '../../src/services/auth'
import { listProjects, listWorkspaces, removeWorkspaceMember, updateWorkspaceMemberRole, WorkspaceApiError } from '../../src/services/workspaces'

describe('workspace service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('loads projects with the current bearer session and encodes workspace ids', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Signed in.',
          token: 'current-session',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          user: {
            id: 'user-1',
            fullName: 'Taylor Engineer',
            email: 'taylor@example.test',
            company: 'Example',
            accountType: 'individual',
            verified: true,
            createdAt: new Date().toISOString()
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, projects: [] })
      } as Response)

    await loginUser({ email: 'taylor@example.test', password: 'StrongPassword1!' })
    await expect(listProjects('workspace/id')).resolves.toEqual([])

    expect(fetch).toHaveBeenLastCalledWith(
      '/api/workspaces/workspace%2Fid/projects',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: ['Bearer', 'current-session'].join(' ') }
      })
    )
  })

  it('surfaces API authorization failures rather than treating them as an empty project list', async () => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Workspace not found.' })
    } as Response)

    await expect(listProjects('private-workspace')).rejects.toThrow('Workspace not found.')
  })

  it('rejects malformed workspace records returned by the API', async () => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        workspaces: [{
          id: 'workspace-1',
          name: 'Platform',
          role: 'superuser',
          created_at: '2026-10-20T00:00:00.000Z',
          updated_at: '2026-10-20T00:00:00.000Z'
        }]
      })
    } as Response)

    await expect(listWorkspaces()).rejects.toThrow('The workspace response was invalid.')
  })

  it('rejects project records with invalid timestamps or unnormalized names', async () => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        projects: [{
          id: 'project-1',
          name: ' Analyzer ',
          description: '',
          created_at: 'not-a-timestamp',
          updated_at: '2026-10-20T00:00:00.000Z'
        }]
      })
    } as Response)

    await expect(listProjects('workspace-1')).rejects.toThrow('The project response was invalid.')
  })

  it('rejects malformed project records and strips undeclared server fields', async () => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        projects: [{
          id: 'project-1',
          name: 'Analyzer',
          description: '',
          created_at: '2026-10-20T00:00:00.000Z',
          updated_at: '2026-10-20T00:00:00.000Z',
          unexpected: 'not part of the project contract'
        }]
      })
    } as Response)

    await expect(listProjects('workspace-1')).resolves.toEqual([{
      id: 'project-1',
      name: 'Analyzer',
      description: '',
      created_at: '2026-10-20T00:00:00.000Z',
      updated_at: '2026-10-20T00:00:00.000Z'
    }])
  })

  it('rejects a non-object API response explicitly', async () => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => null
    } as Response)

    await expect(listWorkspaces()).rejects.toThrow('The API response was invalid (HTTP 200).')
  })

  it('rejects duplicate project records instead of passing ambiguous IDs to the UI', async () => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    const project = {
      id: 'project-1',
      name: 'Analyzer',
      description: '',
      created_at: '2026-10-20T00:00:00.000Z',
      updated_at: '2026-10-20T00:00:00.000Z'
    }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, projects: [project, project] })
    } as Response)

    await expect(listProjects('workspace-1')).rejects.toThrow(
      'The project response contained duplicate records.'
    )
  })

  it('reports invalid JSON explicitly without converting it to an empty collection', async () => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected token') }
    } as unknown as Response)

    await expect(listWorkspaces()).rejects.toThrow('The API returned invalid JSON (HTTP 200).')
  })

  it('updates a member role and encodes ids', async () => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        member: { id: 'user-2', role: 'admin', created_at: '2026-10-20T00:00:00.000Z' }
      })
    } as Response)

    await expect(updateWorkspaceMemberRole('workspace/id', 'user/2', 'admin')).resolves.toEqual({
      id: 'user-2',
      role: 'admin',
      created_at: '2026-10-20T00:00:00.000Z'
    })
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/workspaces/workspace%2Fid/members/user%2F2',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer current-session',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ role: 'admin' })
      })
    )
  })

  it('surfaces a last-owner refusal with its HTTP status', async () => {
    localStorage.setItem('structura-auth-session-v2', JSON.stringify({
      token: 'current-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ success: false, message: 'A workspace must keep at least one owner.' })
    } as Response)

    try {
      await removeWorkspaceMember('workspace-1', 'user-1')
      throw new Error('expected refusal')
    } catch (cause) {
      expect(cause).toBeInstanceOf(WorkspaceApiError)
      expect((cause as WorkspaceApiError).status).toBe(409)
      expect((cause as WorkspaceApiError).message).toBe('A workspace must keep at least one owner.')
    }
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/workspaces/workspace-1/members/user-1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

})
