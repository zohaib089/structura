import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectAccessPanel from '../../src/components/dashboard/ProjectAccessPanel.vue'
import { WorkspaceApiError } from '../../src/services/workspaces'
import type { Project, ProjectAccess, WorkspaceMember } from '../../src/services/workspaces'

const getProject = vi.fn()
const getProjectAccess = vi.fn()
const listWorkspaceMembers = vi.fn()
const updateProjectAccess = vi.fn()
const toastSuccess = vi.fn()

vi.mock('../../src/composables/useToast', () => ({
  useToast: () => ({ success: toastSuccess, error: vi.fn() })
}))

vi.mock('../../src/services/workspaces', async () => {
  const actual = await vi.importActual<typeof import('../../src/services/workspaces')>('../../src/services/workspaces')
  return {
    ...actual,
    getProject: (...args: unknown[]) => getProject(...args),
    getProjectAccess: (...args: unknown[]) => getProjectAccess(...args),
    listWorkspaceMembers: (...args: unknown[]) => listWorkspaceMembers(...args),
    updateProjectAccess: (...args: unknown[]) => updateProjectAccess(...args)
  }
})

const project: Project = {
  id: 'project-1',
  name: 'Atlas',
  description: 'Code map',
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-11-22T00:00:00.000Z'
}

const owner: WorkspaceMember = {
  id: 'user-1',
  full_name: 'Taylor Engineer',
  email: 'taylor@example.test',
  role: 'owner',
  created_at: '2026-01-15T00:00:00.000Z'
}

const admin: WorkspaceMember = {
  id: 'user-2',
  full_name: 'Jordan Writer',
  email: 'jordan@example.test',
  role: 'admin',
  created_at: '2026-02-02T00:00:00.000Z'
}

const member: WorkspaceMember = {
  id: 'user-3',
  full_name: 'Sam Designer',
  email: 'sam@example.test',
  role: 'member',
  created_at: '2026-03-10T00:00:00.000Z'
}

const openAccess: ProjectAccess = { restricted: false, members: [] }
const restrictedAccess: ProjectAccess = {
  restricted: true,
  members: [{ id: 'user-3', role: 'member', created_at: '2026-03-10T00:00:00.000Z' }]
}

describe('ProjectAccessPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProject.mockResolvedValue(project)
    getProjectAccess.mockResolvedValue(openAccess)
    listWorkspaceMembers.mockResolvedValue([owner, admin, member])
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  async function mountPanel(overrides: Record<string, unknown> = {}) {
    const wrapper = mount(ProjectAccessPanel, {
      attachTo: document.body,
      props: {
        locale: 'en',
        workspaceId: 'workspace-1',
        projectId: 'project-1',
        projectName: 'Atlas',
        currentRole: 'owner',
        ...overrides
      }
    })
    await flushPromises()
    return wrapper
  }

  it('loads the toggle and member checklist, with owners and admins always on', async () => {
    getProjectAccess.mockResolvedValue(restrictedAccess)
    const wrapper = await mountPanel()
    const text = wrapper.text()
    expect(wrapper.find('[data-testid="project-access-page"]').exists()).toBe(true)
    expect(text).toContain('Only selected members can see this project')
    expect(text).toContain('Taylor Engineer')
    expect(text).toContain('Jordan Writer')
    expect(text).toContain('Sam Designer')
    expect(text).toContain('Owners and admins can always see this project.')

    const toggle = wrapper.get('[data-testid="project-access-toggle"]')
    expect(toggle.attributes('role')).toBe('switch')
    expect(toggle.attributes('aria-checked')).toBe('true')

    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(3)
    expect((boxes[0].element as HTMLInputElement).checked).toBe(true)
    expect((boxes[0].element as HTMLInputElement).disabled).toBe(true)
    expect((boxes[1].element as HTMLInputElement).checked).toBe(true)
    expect((boxes[1].element as HTMLInputElement).disabled).toBe(true)
    expect((boxes[2].element as HTMLInputElement).checked).toBe(true)
    expect((boxes[2].element as HTMLInputElement).disabled).toBe(false)
    expect(wrapper.get('[data-testid="project-access-save"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('enables Save after a change and writes only selected regular members', async () => {
    const wrapper = await mountPanel()
    const toggle = wrapper.get('[data-testid="project-access-toggle"]')
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(wrapper.find('[data-testid="project-access-list"]').exists()).toBe(false)

    await toggle.trigger('click')
    await flushPromises()
    expect(toggle.attributes('aria-checked')).toBe('true')
    const save = wrapper.get('[data-testid="project-access-save"]')
    expect(save.attributes('disabled')).toBeUndefined()

    const sam = wrapper.findAll('input[type="checkbox"]').find(input =>
      input.attributes('aria-label') === 'Allow Sam Designer to see this project'
    )
    expect(sam).toBeTruthy()
    await sam!.setValue(true)
    updateProjectAccess.mockResolvedValue({
      restricted: true,
      members: [{ id: 'user-3', role: 'member', created_at: '2026-11-22T00:00:00.000Z' }]
    })
    await save.trigger('click')
    await flushPromises()
    expect(updateProjectAccess).toHaveBeenCalledWith('workspace-1', 'project-1', {
      restricted: true,
      member_ids: ['user-3']
    })
    expect(wrapper.get('[data-testid="project-access-success"]').text()).toContain('Access settings saved.')
    expect(wrapper.get('[data-testid="project-access-save"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('shows a plain read-only explanation to members', async () => {
    getProjectAccess.mockResolvedValue(restrictedAccess)
    const wrapper = await mountPanel({ currentRole: 'member', currentUserId: 'user-3' })
    expect(wrapper.text()).toContain('You can see this list, but you cannot change it.')
    expect(wrapper.find('[data-testid="project-access-toggle"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="project-access-save"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Sam Designer')
    expect(wrapper.text()).toContain('Taylor Engineer')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('explains 403 and 404 failures in plain English', async () => {
    getProjectAccess.mockRejectedValue(new WorkspaceApiError('Project not found.', 404))
    const missing = await mountPanel()
    expect(missing.get('[data-testid="project-access-error"]').text()).toContain(
      "This project isn't available, or you don't have permission to see it."
    )
    missing.unmount()

    getProjectAccess.mockResolvedValue(restrictedAccess)
    const wrapper = await mountPanel()
    await wrapper.get('[data-testid="project-access-toggle"]').trigger('click')
    updateProjectAccess.mockRejectedValue(
      new WorkspaceApiError('Workspace admin access is required to update project access.', 403)
    )
    await wrapper.get('[data-testid="project-access-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('You need to be an owner or admin to change who can see this project.')
    wrapper.unmount()
  })
})
