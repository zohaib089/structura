import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkspaceMembersPanel from '../../src/components/dashboard/WorkspaceMembersPanel.vue'
import { WorkspaceApiError } from '../../src/services/workspaces'
import type { WorkspaceInvitation, WorkspaceMember } from '../../src/services/workspaces'

const listWorkspaceMembers = vi.fn()
const listWorkspaceInvitations = vi.fn()
const inviteWorkspaceMember = vi.fn()
const revokeWorkspaceInvitation = vi.fn()
const updateWorkspaceMemberRole = vi.fn()
const removeWorkspaceMember = vi.fn()
const transferWorkspaceOwnership = vi.fn()

vi.mock('../../src/services/workspaces', async () => {
  const actual = await vi.importActual<typeof import('../../src/services/workspaces')>('../../src/services/workspaces')
  return {
    ...actual,
    listWorkspaceMembers: (...args: unknown[]) => listWorkspaceMembers(...args),
    listWorkspaceInvitations: (...args: unknown[]) => listWorkspaceInvitations(...args),
    inviteWorkspaceMember: (...args: unknown[]) => inviteWorkspaceMember(...args),
    revokeWorkspaceInvitation: (...args: unknown[]) => revokeWorkspaceInvitation(...args),
    updateWorkspaceMemberRole: (...args: unknown[]) => updateWorkspaceMemberRole(...args),
    removeWorkspaceMember: (...args: unknown[]) => removeWorkspaceMember(...args),
    transferWorkspaceOwnership: (...args: unknown[]) => transferWorkspaceOwnership(...args)
  }
})

const owner: WorkspaceMember = {
  id: 'user-1',
  full_name: 'Taylor Engineer',
  email: 'taylor@example.test',
  role: 'owner',
  created_at: '2026-01-15T00:00:00.000Z'
}

const member: WorkspaceMember = {
  id: 'user-2',
  full_name: 'Jordan Writer',
  email: 'jordan@example.test',
  role: 'member',
  created_at: '2026-02-02T00:00:00.000Z'
}

function invitation(): WorkspaceInvitation {
  return {
    id: 'invitation-1',
    email: 'new.member@example.test',
    role: 'member',
    created_at: '2026-03-01T00:00:00.000Z',
    expires_at: '2026-03-08T00:00:00.000Z',
    inviter_name: 'Taylor Engineer'
  }
}

describe('WorkspaceMembersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listWorkspaceMembers.mockResolvedValue([owner, member])
    listWorkspaceInvitations.mockResolvedValue([])
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  async function mountPanel(overrides: Record<string, unknown> = {}) {
    const wrapper = mount(WorkspaceMembersPanel, {
      attachTo: document.body,
      props: {
        locale: 'en',
        workspaceId: 'workspace-1',
        workspaceName: 'Platform team',
        currentRole: 'owner',
        currentUserId: 'user-1',
        ...overrides
      }
    })
    await flushPromises()
    return wrapper
  }

  it('lists members with name, email, role and joined date, and invites by email', async () => {
    const wrapper = await mountPanel()
    const text = wrapper.text()
    expect(wrapper.find('[data-testid="members-page"]').exists()).toBe(true)
    expect(text).toContain('Taylor Engineer')
    expect(text).toContain('taylor@example.test')
    expect(text).toContain('Jordan Writer')
    expect(text).toContain('jordan@example.test')
    expect(text).toContain('Joined')
    expect(text).toContain('You')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.get('form.invite-form label').text()).toContain('Invite by email')

    await wrapper.get('input[type="email"]').setValue('new.member@example.test')
    inviteWorkspaceMember.mockResolvedValue(invitation())
    await wrapper.get('form.invite-form').trigger('submit')
    await flushPromises()
    expect(inviteWorkspaceMember).toHaveBeenCalledWith('workspace-1', 'new.member@example.test')
    expect(wrapper.text()).toContain('new.member@example.test')
    wrapper.unmount()
  })

  it('lists a pending invite with a compact nowrap Revoke control and a nowrap expiry date', async () => {
    listWorkspaceInvitations.mockResolvedValue([invitation()])
    const wrapper = await mountPanel()
    const row = wrapper.get('.invite-item')
    expect(row.text()).toContain('new.member@example.test')
    const expiry = row.get('time.invite-expiry')
    expect(expiry.text()).toMatch(/8 Mar 2026|Mar 8, 2026|8 Mar, 2026/)
    expect(expiry.attributes('datetime')).toBe('2026-03-08T00:00:00.000Z')
    const revoke = row.get('button[aria-label="Revoke invitation"]')
    expect(revoke.text()).toBe('Revoke')
    expect(revoke.classes()).toContain('invite-revoke')
    expect(wrapper.find('.members-card--invites').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows a read-only list to members without invite or role controls', async () => {
    listWorkspaceInvitations.mockRejectedValue(new Error('should not list invitations'))
    const wrapper = await mountPanel({ currentRole: 'member', currentUserId: 'user-2' })
    expect(listWorkspaceInvitations).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('You can see who is here')
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Remove Taylor Engineer"]').exists()).toBe(false)
    expect(wrapper.get('button').text()).toContain('Leave workspace')
    wrapper.unmount()
  })

  it('asks for confirmation before changing a role, and Esc cancels', async () => {
    const wrapper = await mountPanel()
    const roleSelect = wrapper.findAll('select').find(select =>
      (select.element as HTMLSelectElement).getAttribute('aria-label') === null &&
      (select.element as HTMLSelectElement).value === 'member'
    )
    expect(roleSelect).toBeTruthy()
    await roleSelect!.setValue('admin')
    await flushPromises()
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement | null
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('Change Jordan Writer’s role to Admin?')
    expect(updateWorkspaceMemberRole).not.toHaveBeenCalled()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    // listener is on window
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(updateWorkspaceMemberRole).not.toHaveBeenCalled()
    expect((roleSelect!.element as HTMLSelectElement).value).toBe('member')
    wrapper.unmount()
  })

  it('explains a last-owner refusal in plain language', async () => {
    const wrapper = await mountPanel()
    const leave = wrapper.findAll('button').find(button => button.text() === 'Leave workspace')
    expect(leave).toBeTruthy()
    await leave!.trigger('click')
    await flushPromises()
    removeWorkspaceMember.mockRejectedValue(
      new WorkspaceApiError('A workspace must keep at least one owner.', 409)
    )
    const confirm = [...document.body.querySelectorAll('button')].find(button =>
      button.textContent?.trim() === 'Leave workspace' && button.className.includes('primary-button')
    )
    expect(confirm).toBeTruthy()
    confirm!.click()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('This workspace needs at least one owner')
    wrapper.unmount()
  })

  it('asks to transfer ownership when an owner is chosen, and stays on as an admin by default', async () => {
    const wrapper = await mountPanel()
    const roleSelect = wrapper.findAll('select').find(select =>
      (select.element as HTMLSelectElement).value === 'member'
    )
    expect(roleSelect).toBeTruthy()
    await roleSelect!.setValue('owner')
    await flushPromises()
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement | null
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('Make Jordan Writer the owner?')
    expect(dialog?.textContent).toContain("You'll stay on as an admin.")
    const checkbox = dialog?.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    expect(checkbox?.checked).toBe(true)
    expect(transferWorkspaceOwnership).not.toHaveBeenCalled()

    transferWorkspaceOwnership.mockResolvedValue({
      member: { id: 'user-2', role: 'owner', created_at: member.created_at },
      left: false
    })
    const confirm = [...document.body.querySelectorAll('button')].find(button =>
      button.textContent?.trim() === 'Make owner'
    )
    expect(confirm).toBeTruthy()
    confirm!.click()
    await flushPromises()
    expect(transferWorkspaceOwnership).toHaveBeenCalledWith('workspace-1', 'user-2', true)
    expect(updateWorkspaceMemberRole).not.toHaveBeenCalled()
    expect(wrapper.emitted('roleChanged')).toEqual([['admin']])
    expect(wrapper.text()).toContain('Admin')
    wrapper.unmount()
  })

  it('lets the owner leave instead of staying on as an admin', async () => {
    const wrapper = await mountPanel()
    const roleSelect = wrapper.findAll('select').find(select =>
      (select.element as HTMLSelectElement).value === 'member'
    )
    await roleSelect!.setValue('owner')
    await flushPromises()
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
    const checkbox = dialog.querySelector('input[type="checkbox"]') as HTMLInputElement
    checkbox.checked = false
    checkbox.dispatchEvent(new Event('input', { bubbles: true }))
    checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(dialog.textContent).toContain("You'll leave this workspace.")

    transferWorkspaceOwnership.mockResolvedValue({
      member: { id: 'user-2', role: 'owner', created_at: member.created_at },
      left: true
    })
    const confirm = [...document.body.querySelectorAll('button')].find(button =>
      button.textContent?.trim() === 'Make owner'
    )
    confirm!.click()
    await flushPromises()
    expect(transferWorkspaceOwnership).toHaveBeenCalledWith('workspace-1', 'user-2', false)
    expect(wrapper.emitted('left')).toHaveLength(1)
    wrapper.unmount()
  })

})
