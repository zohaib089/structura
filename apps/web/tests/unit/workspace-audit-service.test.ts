import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listWorkspaceAudit, WorkspaceApiError } from '../../src/services/workspaces'

function session() {
  localStorage.setItem('structura-auth-session-v2', JSON.stringify({
    token: 'current-session',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: { id: 'user-1' }
  }))
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

const invited = {
  id: 'event-1',
  actor_user_id: 'user-1',
  action: 'member.invited',
  target_type: 'invitation',
  target_id: 'invite-1',
  details: { email: 'sam@example.test', role: 'member' },
  created_at: '2026-11-23T00:00:00.000Z'
}

describe('listWorkspaceAudit', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
    session()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('loads activity with encoded ids, query filters, and a cursor', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({
      success: true,
      events: [invited],
      next_cursor: 'cursor-2'
    }))

    await expect(listWorkspaceAudit('workspace/id', {
      limit: 50,
      cursor: 'cursor-1',
      action: 'member.invited',
      project: 'project/1'
    })).resolves.toEqual({
      events: [invited],
      next_cursor: 'cursor-2'
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/workspaces/workspace%2Fid/audit?limit=50&cursor=cursor-1&action=member.invited&project=project%2F1',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer current-session' }
      })
    )
  })

  it('treats a missing next cursor as the end of the list', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({
      success: true,
      events: [invited]
    }))
    await expect(listWorkspaceAudit('workspace-1')).resolves.toEqual({
      events: [invited],
      next_cursor: null
    })
  })

  it('surfaces a 403 as a WorkspaceApiError', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({
      success: false,
      message: 'Workspace admin access is required.'
    }, 403))

    const error = await listWorkspaceAudit('workspace-1').catch(cause => cause)
    expect(error).toBeInstanceOf(WorkspaceApiError)
    expect(error).toMatchObject({ status: 403, message: 'Workspace admin access is required.' })
  })

  it('rejects malformed activity records', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({
      success: true,
      events: [{ id: 'event-1', action: 'member.invited' }],
      next_cursor: null
    }))
    await expect(listWorkspaceAudit('workspace-1')).rejects.toThrow(
      'The workspace activity response was invalid.'
    )
  })
})
