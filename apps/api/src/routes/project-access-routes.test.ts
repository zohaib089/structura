import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import Fastify from 'fastify'
import { registerWorkspaceRoutes } from './workspace-routes.js'
import type {
  WorkspaceDatabase,
  WorkspaceQuery,
  WorkspaceTransaction
} from '../db/types.js'

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

const NOW = '2026-10-20T00:00:00.000Z'
const accessPath = '/api/workspaces/workspace-1/projects/project-restricted/access'
const openAccessPath = '/api/workspaces/workspace-1/projects/project-open/access'
const openProjectPath = '/api/workspaces/workspace-1/projects/project-open'
const restrictedProjectPath = '/api/workspaces/workspace-1/projects/project-restricted'
const listPath = '/api/workspaces/workspace-1/projects'

type ProjectRow = {
  id: string
  workspace_id: string
  name: string
  description: string
  access_restricted: boolean
  created_at: string
  updated_at: string
}

function createProjectAccessApi() {
  const sessions = new Map([
    [digest('owner-session'), 'owner-1'],
    [digest('admin-session'), 'admin-1'],
    [digest('member-session'), 'member-1'],
    [digest('member-2-session'), 'member-2'],
    [digest('outsider-session'), 'outsider-1']
  ])

  const memberships = new Map<string, string>([
    ['workspace-1:owner-1', 'owner'],
    ['workspace-1:admin-1', 'admin'],
    ['workspace-1:member-1', 'member'],
    ['workspace-1:member-2', 'member']
  ])

  const projects = new Map<string, ProjectRow>([
    ['project-open', {
      id: 'project-open',
      workspace_id: 'workspace-1',
      name: 'Open project',
      description: 'Visible to every member',
      access_restricted: false,
      created_at: NOW,
      updated_at: NOW
    }],
    ['project-restricted', {
      id: 'project-restricted',
      workspace_id: 'workspace-1',
      name: 'Restricted project',
      description: 'Limited access',
      access_restricted: true,
      created_at: NOW,
      updated_at: NOW
    }]
  ])

  const projectMembers = new Map<string, Map<string, string>>([
    ['project-restricted', new Map([['member-1', NOW]])]
  ])

  const membersIn = (workspaceId: string) =>
    [...memberships.entries()]
      .filter(([key]) => key.startsWith(`${workspaceId}:`))
      .map(([key, role]) => ({ user_id: key.slice(workspaceId.length + 1), role }))

  const listedMembers = (workspaceId: string, projectId: string) => {
    const listed = projectMembers.get(projectId) ?? new Map()
    return [...listed.entries()]
      .flatMap(([userId, createdAt]) => {
        const role = memberships.get(`${workspaceId}:${userId}`)
        if (!role) return []
        return [{ id: userId, role, created_at: createdAt }]
      })
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  const isListed = (projectId: string, userId: string) =>
    projectMembers.get(projectId)?.has(userId) === true

  const publicProject = (project: ProjectRow) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    created_at: project.created_at,
    updated_at: project.updated_at
  })

  const canSee = (role: string, project: ProjectRow, userId: string) =>
    role === 'owner' || role === 'admin' || !project.access_restricted || isListed(project.id, userId)

  const handle: WorkspaceQuery = async (text, params = []) => {
    if (text.startsWith('SELECT user_id FROM auth_sessions')) {
      const userId = sessions.get(String(params[0]))
      return { rows: userId ? [{ user_id: userId }] : [] }
    }

    if (
      text.includes('FROM workspace_members') &&
      text.includes('AND user_id = $2') &&
      !text.includes('AS id')
    ) {
      const key = `${String(params[0])}:${String(params[1])}`
      const role = memberships.get(key)
      return { rows: role ? [{ role }] : [] }
    }

    if (text.includes('FROM workspace_members') && text.includes('ANY($2::text[])')) {
      const workspaceId = String(params[0])
      const ids = Array.isArray(params[1]) ? params[1].map(String) : []
      return {
        rows: ids
          .filter(userId => memberships.has(`${workspaceId}:${userId}`))
          .map(user_id => ({ user_id }))
      }
    }

    if (text.includes('FROM projects p') && text.includes('JOIN workspace_members wm')) {
      const workspaceId = String(params[0])
      const userId = String(params[1])
      const role = memberships.get(`${workspaceId}:${userId}`)
      if (!role) return { rows: [] }
      return {
        rows: [...projects.values()]
          .filter(project => project.workspace_id === workspaceId && canSee(role, project, userId))
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))
          .map(publicProject)
      }
    }

    if (text.includes('FROM projects p') && text.includes('p.access_restricted')) {
      const workspaceId = String(params[0])
      const projectId = String(params[1])
      const userId = String(params[2])
      const project = projects.get(projectId)
      if (!project || project.workspace_id !== workspaceId) return { rows: [] }
      return {
        rows: [{
          ...project,
          is_listed: isListed(project.id, userId)
        }]
      }
    }

    if (text.includes('FROM project_members pm') && text.includes('AS id')) {
      return { rows: listedMembers(String(params[0]), String(params[1])) }
    }

    if (text.includes('UPDATE projects') && text.includes('access_restricted')) {
      const project = [...projects.values()].find(
        row => row.workspace_id === String(params[0]) && row.id === String(params[1])
      )
      if (!project) return { rows: [] }
      project.access_restricted = Boolean(params[2])
      project.updated_at = NOW
      return { rows: [project] }
    }

    if (text.startsWith('DELETE FROM project_members WHERE project_id = $1')) {
      projectMembers.delete(String(params[0]))
      return { rows: [] }
    }

    if (text.startsWith('DELETE FROM project_members') && text.includes('user_id = $2')) {
      const workspaceId = String(params[0])
      const userId = String(params[1])
      for (const project of projects.values()) {
        if (project.workspace_id === workspaceId) {
          projectMembers.get(project.id)?.delete(userId)
        }
      }
      return { rows: [] }
    }

    if (text.includes('INSERT INTO project_members')) {
      const projectId = String(params[0])
      const ids = Array.isArray(params[1]) ? params[1].map(String) : []
      const listed = projectMembers.get(projectId) ?? new Map<string, string>()
      for (const userId of ids) listed.set(userId, NOW)
      projectMembers.set(projectId, listed)
      return { rows: ids.map(user_id => ({ project_id: projectId, user_id })) }
    }

    if (text.startsWith('DELETE FROM workspace_members')) {
      const key = `${String(params[0])}:${String(params[1])}`
      if (!memberships.has(key)) return { rows: [] }
      memberships.delete(key)
      return { rows: [{ user_id: params[1] }] }
    }

    if (text.includes('FROM workspace_members') && text.includes('FOR UPDATE')) {
      const workspaceId = String(params[0])
      const actorId = String(params[1])
      const targetId = String(params[2] ?? '')
      return {
        rows: membersIn(workspaceId).filter(row =>
          row.role === 'owner' || row.user_id === actorId || row.user_id === targetId
        )
      }
    }

    return { rows: [] }
  }

  const transaction: WorkspaceTransaction = async operation => operation(handle)
  const database: WorkspaceDatabase = { query: handle, transaction }
  const app = Fastify()
  registerWorkspaceRoutes(app, database)
  return { app, memberships, projects, projectMembers }
}

test('requires an active session for project access APIs', async () => {
  const api = createProjectAccessApi()
  try {
    const list = await api.app.inject({ method: 'GET', url: listPath })
    const read = await api.app.inject({ method: 'GET', url: openProjectPath })
    const access = await api.app.inject({ method: 'GET', url: openAccessPath })
    const update = await api.app.inject({
      method: 'PUT',
      url: openAccessPath,
      payload: { restricted: true, member_ids: ['member-1'] }
    })
    assert.equal(list.statusCode, 401)
    assert.equal(read.statusCode, 401)
    assert.equal(access.statusCode, 401)
    assert.equal(update.statusCode, 401)
  } finally {
    await api.app.close()
  }
})

test('hides workspaces and inaccessible projects with 404', async () => {
  const api = createProjectAccessApi()
  try {
    const outsiderHeaders = { authorization: 'Bearer outsider-session' }
    const outsiderList = await api.app.inject({ method: 'GET', url: listPath, headers: outsiderHeaders })
    const outsiderRead = await api.app.inject({ method: 'GET', url: restrictedProjectPath, headers: outsiderHeaders })
    const outsiderAccess = await api.app.inject({ method: 'GET', url: accessPath, headers: outsiderHeaders })
    const outsiderPut = await api.app.inject({
      method: 'PUT',
      url: accessPath,
      headers: outsiderHeaders,
      payload: { restricted: true, member_ids: ['member-1'] }
    })
    assert.equal(outsiderList.statusCode, 404)
    assert.equal(outsiderList.json().message, 'Workspace not found.')
    assert.equal(outsiderRead.statusCode, 404)
    assert.equal(outsiderRead.json().message, 'Workspace not found.')
    assert.equal(outsiderAccess.statusCode, 404)
    assert.equal(outsiderPut.statusCode, 404)
    assert.equal(outsiderPut.json().message, 'Workspace not found.')

    const memberHeaders = { authorization: 'Bearer member-2-session' }
    const hiddenRead = await api.app.inject({ method: 'GET', url: restrictedProjectPath, headers: memberHeaders })
    const hiddenAccess = await api.app.inject({ method: 'GET', url: accessPath, headers: memberHeaders })
    const hiddenPut = await api.app.inject({
      method: 'PUT',
      url: accessPath,
      headers: memberHeaders,
      payload: { restricted: false, member_ids: [] }
    })
    assert.equal(hiddenRead.statusCode, 404)
    assert.equal(hiddenRead.json().message, 'Project not found.')
    assert.equal(hiddenAccess.statusCode, 404)
    assert.equal(hiddenAccess.json().message, 'Project not found.')
    assert.equal(hiddenPut.statusCode, 404)
    assert.equal(hiddenPut.json().message, 'Project not found.')

    const missing = await api.app.inject({
      method: 'GET',
      url: '/api/workspaces/workspace-1/projects/missing',
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(missing.statusCode, 404)
    assert.equal(missing.json().message, 'Project not found.')
  } finally {
    await api.app.close()
  }
})

test('lists only projects a member can access and leaves unrestricted projects visible', async () => {
  const api = createProjectAccessApi()
  try {
    const member2 = await api.app.inject({
      method: 'GET',
      url: listPath,
      headers: { authorization: 'Bearer member-2-session' }
    })
    assert.equal(member2.statusCode, 200)
    assert.deepEqual(member2.json().projects.map((project: { id: string }) => project.id), ['project-open'])

    const listedMember = await api.app.inject({
      method: 'GET',
      url: listPath,
      headers: { authorization: 'Bearer member-session' }
    })
    assert.equal(listedMember.statusCode, 200)
    assert.deepEqual(
      listedMember.json().projects.map((project: { id: string }) => project.id),
      ['project-open', 'project-restricted']
    )

    const owner = await api.app.inject({
      method: 'GET',
      url: listPath,
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(owner.statusCode, 200)
    assert.deepEqual(
      owner.json().projects.map((project: { id: string }) => project.id),
      ['project-open', 'project-restricted']
    )
  } finally {
    await api.app.close()
  }
})

test('allows listed members and workspace admins to read a restricted project', async () => {
  const api = createProjectAccessApi()
  try {
    const listed = await api.app.inject({
      method: 'GET',
      url: restrictedProjectPath,
      headers: { authorization: 'Bearer member-session' }
    })
    assert.equal(listed.statusCode, 200)
    assert.equal(listed.json().project.id, 'project-restricted')
    assert.equal(listed.json().project.name, 'Restricted project')

    const admin = await api.app.inject({
      method: 'GET',
      url: restrictedProjectPath,
      headers: { authorization: 'Bearer admin-session' }
    })
    assert.equal(admin.statusCode, 200)

    const open = await api.app.inject({
      method: 'GET',
      url: openProjectPath,
      headers: { authorization: 'Bearer member-2-session' }
    })
    assert.equal(open.statusCode, 200)
    assert.equal(open.json().project.id, 'project-open')
  } finally {
    await api.app.close()
  }
})

test('lets owners and admins replace project access transactionally', async () => {
  const api = createProjectAccessApi()
  try {
    const initial = await api.app.inject({
      method: 'GET',
      url: accessPath,
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(initial.statusCode, 200)
    assert.equal(initial.json().access.restricted, true)
    assert.deepEqual(
      initial.json().access.members.map((member: { id: string }) => member.id),
      ['member-1']
    )

    const updated = await api.app.inject({
      method: 'PUT',
      url: accessPath,
      headers: { authorization: 'Bearer admin-session' },
      payload: { restricted: true, member_ids: ['member-2', 'member-2', ' owner-1 '] }
    })
    assert.equal(updated.statusCode, 200)
    assert.equal(updated.json().success, true)
    assert.equal(updated.json().access.restricted, true)
    assert.deepEqual(
      updated.json().access.members.map((member: { id: string; role: string }) => [member.id, member.role]),
      [['member-2', 'member'], ['owner-1', 'owner']]
    )
    assert.equal(api.projectMembers.get('project-restricted')?.has('member-1'), false)
    assert.equal(api.projectMembers.get('project-restricted')?.has('member-2'), true)

    const member1List = await api.app.inject({
      method: 'GET',
      url: listPath,
      headers: { authorization: 'Bearer member-session' }
    })
    assert.deepEqual(member1List.json().projects.map((project: { id: string }) => project.id), ['project-open'])

    const opened = await api.app.inject({
      method: 'PUT',
      url: accessPath,
      headers: { authorization: 'Bearer owner-session' },
      payload: { restricted: false, member_ids: [] }
    })
    assert.equal(opened.statusCode, 200)
    assert.equal(opened.json().access.restricted, false)
    assert.deepEqual(opened.json().access.members, [])

    const member1Again = await api.app.inject({
      method: 'GET',
      url: restrictedProjectPath,
      headers: { authorization: 'Bearer member-session' }
    })
    assert.equal(member1Again.statusCode, 200)
  } finally {
    await api.app.close()
  }
})

test('forbids members from updating project access and rejects invalid updates', async () => {
  const api = createProjectAccessApi()
  try {
    const forbidden = await api.app.inject({
      method: 'PUT',
      url: accessPath,
      headers: { authorization: 'Bearer member-session' },
      payload: { restricted: true, member_ids: ['member-2'] }
    })
    assert.equal(forbidden.statusCode, 403)
    assert.equal(forbidden.json().message, 'Workspace admin access is required to update project access.')
    assert.equal(api.projectMembers.get('project-restricted')?.has('member-1'), true)

    const badFlag = await api.app.inject({
      method: 'PUT',
      url: openAccessPath,
      headers: { authorization: 'Bearer owner-session' },
      payload: { member_ids: ['member-1'] }
    })
    assert.equal(badFlag.statusCode, 400)
    assert.equal(badFlag.json().message, 'restricted must be true or false.')

    const badIds = await api.app.inject({
      method: 'PUT',
      url: openAccessPath,
      headers: { authorization: 'Bearer owner-session' },
      payload: { restricted: true, member_ids: 'member-1' }
    })
    assert.equal(badIds.statusCode, 400)
    assert.equal(badIds.json().message, 'member_ids must be an array of member ids.')

    const outsiderMember = await api.app.inject({
      method: 'PUT',
      url: openAccessPath,
      headers: { authorization: 'Bearer owner-session' },
      payload: { restricted: true, member_ids: ['outsider-1'] }
    })
    assert.equal(outsiderMember.statusCode, 400)
    assert.equal(outsiderMember.json().message, 'Every listed user must be a member of this workspace.')
    assert.equal(api.projects.get('project-open')?.access_restricted, false)
  } finally {
    await api.app.close()
  }
})

test('removes project access when a workspace member is removed', async () => {
  const api = createProjectAccessApi()
  try {
    const removed = await api.app.inject({
      method: 'DELETE',
      url: '/api/workspaces/workspace-1/members/member-1',
      headers: { authorization: 'Bearer owner-session' }
    })
    assert.equal(removed.statusCode, 200)
    assert.equal(api.projectMembers.get('project-restricted')?.has('member-1'), false)
  } finally {
    await api.app.close()
  }
})
