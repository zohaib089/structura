import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkspaceSettingsPanel from '../../src/components/dashboard/WorkspaceSettingsPanel.vue'
import {
  inviteWorkspaceMember,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  revokeWorkspaceInvitation,
  type WorkspaceInvitation,
  type WorkspaceMember
} from '../../src/services/workspaces'
import { clearToasts } from '../../src/composables/useToast'

vi.mock('../../src/services/workspaces', () => ({
  listWorkspaceMembers: vi.fn(),
  listWorkspaceInvitations: vi.fn(),
  inviteWorkspaceMember: vi.fn(),
  revokeWorkspaceInvitation: vi.fn()
}))

const owner: WorkspaceMember = {
  id: 'user-1',
  full_name: 'Taylor Engineer',
  email: 'taylor@example.test',
  role: 'owner',
  created_at: '2026-10-01T00:00:00.000Z'
}

const pending: WorkspaceInvitation = {
  id: 'inv-1',
  email: 'pending@example.test',
  role: 'member',
  created_at: '2026-11-01T00:00:00.000Z',
  expires_at: '2026-11-08T00:00:00.000Z',
  inviter_name: 'Taylor Engineer'
}

async function mountPanel(
  props: Record<string, unknown> = {},
  api: {
    members?: WorkspaceMember[]
    invitations?: WorkspaceInvitation[]
    membersError?: Error
  } = {}
) {
  if (api.membersError) vi.mocked(listWorkspaceMembers).mockRejectedValue(api.membersError)
  else vi.mocked(listWorkspaceMembers).mockResolvedValue(api.members ?? [owner])
  vi.mocked(listWorkspaceInvitations).mockResolvedValue(api.invitations ?? [])
  vi.mocked(inviteWorkspaceMember).mockImplementation(async (_workspaceId, address) => ({
    id: 'inv-new',
    email: address.trim().toLowerCase(),
    role: 'member',
    created_at: '2026-11-02T00:00:00.000Z',
    expires_at: '2026-11-09T00:00:00.000Z',
    inviter_name: 'Taylor Engineer'
  }))
  vi.mocked(revokeWorkspaceInvitation).mockResolvedValue()

  const wrapper = mount(WorkspaceSettingsPanel, {
    props: {
      locale: 'en',
      workspaceId: 'ws-1',
      workspaceName: 'Platform team',
      role: 'owner',
      createdAt: '2026-09-01T00:00:00.000Z',
      ...props
    }
  })
  await flushPromises()
  return wrapper
}

describe('WorkspaceSettingsPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    clearToasts()
  })

  it('shows workspace facts, members, and a member-only invite form', async () => {
    const wrapper = await mountPanel({}, { invitations: [pending] })

    expect(wrapper.get('[data-testid="workspace-settings"]').text()).toContain('Platform team')
    expect(wrapper.get('[data-testid="workspace-settings"]').text()).toContain('Owner')
    expect(wrapper.get('[data-testid="settings-member-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="settings-pending-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="settings-members"]').text()).toContain('Taylor Engineer')
    expect(wrapper.get('[data-testid="settings-members"]').text()).toContain('taylor@example.test')
    expect(wrapper.get('[data-testid="settings-invitations"]').text()).toContain('pending@example.test')
    expect(wrapper.get('[data-testid="settings-invitations"]').text()).toContain('Member')
    expect(wrapper.text()).toContain('Invitations join this workspace as members.')
    expect(wrapper.text()).toContain('cannot be changed here')
    expect(wrapper.findAll('input')).toHaveLength(1)
    expect(wrapper.get('input').attributes('type')).toBe('email')
    expect(listWorkspaceInvitations).toHaveBeenCalledWith('ws-1')
    wrapper.unmount()
  })

  it('validates the invite email on blur and does not submit an invalid address', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.get('input')

    await input.setValue('not-an-email')
    await input.trigger('blur')
    expect(wrapper.text()).toContain('Enter a valid email address.')

    await wrapper.get('[data-testid="settings-invite"]').trigger('submit')
    await flushPromises()
    expect(inviteWorkspaceMember).not.toHaveBeenCalled()

    await input.setValue('   ')
    await wrapper.get('[data-testid="settings-invite"]').trigger('submit')
    expect(wrapper.text()).toContain('Enter an email address.')
    expect(inviteWorkspaceMember).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('sends a trimmed invitation and lists the address the API returns', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('input').setValue('  New.Member@example.test  ')
    await wrapper.get('[data-testid="settings-invite"]').trigger('submit')
    await flushPromises()

    expect(inviteWorkspaceMember).toHaveBeenCalledWith('ws-1', 'New.Member@example.test')
    expect(wrapper.get('[data-testid="settings-invitations"]').text()).toContain('new.member@example.test')
    expect(wrapper.get('[data-testid="settings-pending-count"]').text()).toBe('1')
    expect(wrapper.get('input').element).toHaveProperty('value', '')
    wrapper.unmount()
  })

  it('shows a plain API invitation error and hides transport failures behind Details', async () => {
    const wrapper = await mountPanel()
    vi.mocked(inviteWorkspaceMember).mockRejectedValueOnce(
      new Error('This person is already a workspace member.')
    )
    await wrapper.get('input').setValue('taylor@example.test')
    await wrapper.get('[data-testid="settings-invite"]').trigger('submit')
    await flushPromises()

    const plain = wrapper.get('[data-testid="settings-invite-error"]')
    expect(plain.text()).toContain('This person is already a workspace member.')
    expect(plain.text()).not.toContain('Details')

    vi.mocked(inviteWorkspaceMember).mockRejectedValueOnce(
      new Error('POST /api/workspaces/ws-1/invitations HTTP 503')
    )
    await wrapper.get('input').setValue('new.member@example.test')
    await wrapper.get('[data-testid="settings-invite"]').trigger('submit')
    await flushPromises()

    const technical = wrapper.get('[data-testid="settings-invite-error"]')
    expect(technical.text()).toContain('Could not send the invitation.')
    expect(technical.text()).not.toContain('/api/')
    const details = technical.findAll('button').find(button => button.text() === 'Details')
    expect(details).toBeTruthy()
    await details!.trigger('click')
    expect(technical.text()).toContain('POST /api/workspaces/ws-1/invitations HTTP 503')
    wrapper.unmount()
  })

  it('revokes a pending invitation', async () => {
    const wrapper = await mountPanel({}, { invitations: [pending] })
    await wrapper.get('[data-testid="settings-invitations"]').get('button').trigger('click')
    await flushPromises()

    expect(revokeWorkspaceInvitation).toHaveBeenCalledWith('ws-1', 'inv-1')
    expect(wrapper.get('[data-testid="settings-invitations-empty"]').text()).toContain('no pending invitations')
    expect(wrapper.get('[data-testid="settings-pending-count"]').text()).toBe('0')
    wrapper.unmount()
  })

  it('hides invite controls from members and does not request invitations', async () => {
    const wrapper = await mountPanel({ role: 'member' })

    expect(wrapper.find('[data-testid="settings-invite"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="settings-pending-count"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Only owners and admins can invite members.')
    expect(listWorkspaceInvitations).not.toHaveBeenCalled()
    expect(listWorkspaceMembers).toHaveBeenCalledWith('ws-1')
    wrapper.unmount()
  })

  it('keeps technical load failures behind Details and shows a skeleton while loading', async () => {
    vi.mocked(listWorkspaceMembers).mockReturnValue(new Promise(() => {}))
    vi.mocked(listWorkspaceInvitations).mockResolvedValue([])

    const loading = mount(WorkspaceSettingsPanel, {
      props: {
        locale: 'en',
        workspaceId: 'ws-1',
        workspaceName: 'Platform team',
        role: 'owner',
        createdAt: '2026-09-01T00:00:00.000Z'
      }
    })
    await flushPromises()
    expect(loading.get('[data-testid="settings-loading"]').attributes('aria-busy')).toBe('true')
    expect(loading.find('[data-testid="settings-members"]').exists()).toBe(false)
    expect(loading.text()).not.toContain('Loading')
    loading.unmount()

    const wrapper = await mountPanel({}, {
      membersError: new Error('GET /api/workspaces/ws-1/members failed HTTP 500')
    })
    const alert = wrapper.get('[data-testid="settings-load-error"]')
    expect(alert.text()).toContain('Could not load workspace members.')
    expect(alert.text()).not.toContain('/api/')
    const details = alert.findAll('button').find(button => button.text() === 'Details')
    expect(details).toBeTruthy()
    await details!.trigger('click')
    expect(alert.text()).toContain('GET /api/workspaces/ws-1/members failed HTTP 500')
    wrapper.unmount()
  })
})
