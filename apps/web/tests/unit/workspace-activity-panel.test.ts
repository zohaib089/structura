import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkspaceActivityPanel from '../../src/components/dashboard/WorkspaceActivityPanel.vue'
import { WorkspaceApiError } from '../../src/services/workspaces'
import type { Project, WorkspaceAuditEvent, WorkspaceMember } from '../../src/services/workspaces'

const listWorkspaceAudit = vi.fn()
const listWorkspaceMembers = vi.fn()
const listProjects = vi.fn()

vi.mock('../../src/services/workspaces', async () => {
  const actual = await vi.importActual<typeof import('../../src/services/workspaces')>(
    '../../src/services/workspaces'
  )
  return {
    ...actual,
    listWorkspaceAudit: (...args: unknown[]) => listWorkspaceAudit(...args),
    listWorkspaceMembers: (...args: unknown[]) => listWorkspaceMembers(...args),
    listProjects: (...args: unknown[]) => listProjects(...args)
  }
})

const members: WorkspaceMember[] = [
  {
    id: 'user-1',
    full_name: 'Taylor Engineer',
    email: 'taylor@example.test',
    role: 'owner',
    created_at: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'user-2',
    full_name: 'Sam Designer',
    email: 'sam@example.test',
    role: 'member',
    created_at: '2026-03-10T00:00:00.000Z'
  }
]

const projects: Project[] = [
  {
    id: 'project-1',
    name: 'Atlas',
    description: 'Code map',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-11-22T00:00:00.000Z'
  }
]

function event(partial: Partial<WorkspaceAuditEvent> & Pick<WorkspaceAuditEvent, 'id' | 'action'>): WorkspaceAuditEvent {
  return {
    actor_user_id: 'user-1',
    target_type: 'member',
    target_id: 'user-2',
    details: {},
    created_at: '2026-11-23T10:00:00.000Z',
    ...partial
  }
}

const firstPage: WorkspaceAuditEvent[] = [
  event({
    id: 'event-1',
    action: 'member.role_changed',
    details: { from: 'member', to: 'admin' }
  }),
  event({
    id: 'event-2',
    action: 'member.invited',
    target_type: 'invitation',
    target_id: 'invite-1',
    details: { email: 'sam@example.test', role: 'member' }
  })
]

const secondPage: WorkspaceAuditEvent[] = [
  event({
    id: 'event-3',
    action: 'project.access_changed',
    target_type: 'project',
    target_id: 'project-1',
    details: { restricted: true, member_ids: ['user-2', 'user-3'] }
  })
]

describe('WorkspaceActivityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listWorkspaceMembers.mockResolvedValue(members)
    listProjects.mockResolvedValue(projects)
    listWorkspaceAudit.mockResolvedValue({ events: firstPage, next_cursor: 'cursor-2' })
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  async function mountPanel(overrides: Record<string, unknown> = {}) {
    const wrapper = mount(WorkspaceActivityPanel, {
      attachTo: document.body,
      props: {
        locale: 'en',
        workspaceId: 'workspace-1',
        workspaceName: 'Platform team',
        currentRole: 'owner',
        ...overrides
      }
    })
    await flushPromises()
    return wrapper
  }

  it('lists plain-English activity rows, the actor, and a Load more control', async () => {
    const wrapper = await mountPanel()
    const text = wrapper.text()
    expect(wrapper.find('[data-testid="activity-page"]').exists()).toBe(true)
    expect(text).toContain('Taylor Engineer made Sam Designer an admin')
    expect(text).toContain('Taylor Engineer invited sam@example.test')
    expect(wrapper.get('[data-testid="activity-actor"]').text()).toBe('Taylor Engineer')
    expect(wrapper.get('time').attributes('title')).toBeTruthy()
    expect(wrapper.get('time').attributes('aria-label')).toBeTruthy()
    expect(wrapper.get('[data-testid="activity-load-more"]').text()).toBe('Load more')
    expect(listWorkspaceAudit).toHaveBeenCalledWith('workspace-1', {
      limit: 50,
      cursor: undefined,
      action: undefined,
      project: undefined
    })
    wrapper.unmount()
  })

  it('filters by action type and project', async () => {
    const wrapper = await mountPanel()
    listWorkspaceAudit.mockResolvedValue({ events: secondPage, next_cursor: null })

    await wrapper.get('[data-testid="activity-action-filter"]').setValue('project.access_changed')
    await flushPromises()
    expect(listWorkspaceAudit).toHaveBeenLastCalledWith('workspace-1', {
      limit: 50,
      cursor: undefined,
      action: 'project.access_changed',
      project: undefined
    })

    await wrapper.get('[data-testid="activity-project-filter"]').setValue('project-1')
    await flushPromises()
    expect(listWorkspaceAudit).toHaveBeenLastCalledWith('workspace-1', {
      limit: 50,
      cursor: undefined,
      action: 'project.access_changed',
      project: 'project-1'
    })
    expect(wrapper.text()).toContain('Taylor Engineer limited Atlas to 2 members')
    expect(wrapper.find('[data-testid="activity-load-more"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('loads the next page with the cursor and appends rows', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.findAll('[data-testid="activity-row"]')).toHaveLength(2)
    listWorkspaceAudit.mockResolvedValue({ events: secondPage, next_cursor: null })
    await wrapper.get('[data-testid="activity-load-more"]').trigger('click')
    await flushPromises()
    expect(listWorkspaceAudit).toHaveBeenLastCalledWith('workspace-1', {
      limit: 50,
      cursor: 'cursor-2',
      action: undefined,
      project: undefined
    })
    expect(wrapper.findAll('[data-testid="activity-row"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Taylor Engineer limited Atlas to 2 members')
    expect(wrapper.find('[data-testid="activity-load-more"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows a friendly 403 for members and when the server refuses access', async () => {
    const memberView = await mountPanel({ currentRole: 'member' })
    expect(memberView.get('[data-testid="activity-forbidden"]').text()).toBe(
      'Only owners and admins can see workspace activity.'
    )
    expect(listWorkspaceAudit).not.toHaveBeenCalled()
    expect(memberView.find('[data-testid="activity-filters"]').exists()).toBe(false)
    memberView.unmount()

    listWorkspaceAudit.mockRejectedValue(
      new WorkspaceApiError('Workspace admin access is required.', 403)
    )
    const refused = await mountPanel({ currentRole: 'admin' })
    expect(refused.get('[data-testid="activity-forbidden"]').text()).toBe(
      'Only owners and admins can see workspace activity.'
    )
    refused.unmount()
  })

  it('shows an empty state when there is no activity', async () => {
    listWorkspaceAudit.mockResolvedValue({ events: [], next_cursor: null })
    const wrapper = await mountPanel()
    expect(wrapper.get('[data-testid="activity-empty"]').text()).toBe('No activity yet.')
    wrapper.unmount()
  })
})
