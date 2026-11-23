import { describe, expect, it } from 'vitest'
import { dashboardMessages } from '../../src/services/dashboard-messages'
import {
  auditActorName,
  auditNameLookup,
  formatAuditRelativeTime,
  formatAuditSentence
} from '../../src/services/workspace-audit'
import type { Project, WorkspaceAuditEvent, WorkspaceMember } from '../../src/services/workspaces'

const messages = dashboardMessages('en')

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

const names = auditNameLookup(members, projects)
const emptyNames = auditNameLookup([], [])

function event(partial: Partial<WorkspaceAuditEvent> & Pick<WorkspaceAuditEvent, 'action'>): WorkspaceAuditEvent {
  return {
    id: partial.id ?? 'event-1',
    actor_user_id: partial.actor_user_id === undefined ? 'user-1' : partial.actor_user_id,
    action: partial.action,
    target_type: partial.target_type ?? 'member',
    target_id: partial.target_id ?? 'user-2',
    details: partial.details ?? {},
    created_at: partial.created_at ?? '2026-11-23T00:00:00.000Z'
  }
}

describe('audit sentence formatting', () => {
  it('formats every known event type in plain English', () => {
    expect(formatAuditSentence(event({
      action: 'member.invited',
      target_type: 'invitation',
      target_id: 'invite-1',
      details: { email: 'sam@example.test', role: 'member' }
    }), messages, names)).toBe('Taylor Engineer invited sam@example.test')

    expect(formatAuditSentence(event({
      action: 'invite.revoked',
      target_type: 'invitation',
      target_id: 'invite-1',
      details: { email: 'sam@example.test' }
    }), messages, names)).toBe('Taylor Engineer revoked the invitation to sam@example.test')

    expect(formatAuditSentence(event({
      action: 'invite.revoked',
      target_type: 'invitation',
      target_id: 'invite-1',
      details: { email: 'sam@example.test', delivery_failed: true }
    }), messages, names)).toBe("Taylor Engineer's invitation to sam@example.test could not be delivered")

    expect(formatAuditSentence(event({
      action: 'invite.accepted',
      actor_user_id: 'user-2',
      target_type: 'invitation',
      target_id: 'invite-1',
      details: { email: 'sam@example.test', member_id: 'user-2' }
    }), messages, names)).toBe('Sam Designer accepted an invitation')

    expect(formatAuditSentence(event({
      action: 'member.role_changed',
      details: { from: 'member', to: 'admin' }
    }), messages, names)).toBe('Taylor Engineer made Sam Designer an admin')

    expect(formatAuditSentence(event({
      action: 'member.removed',
      details: { role: 'member', self: false }
    }), messages, names)).toBe('Taylor Engineer removed Sam Designer')

    expect(formatAuditSentence(event({
      action: 'member.removed',
      actor_user_id: 'user-2',
      target_id: 'user-2',
      details: { role: 'member', self: true }
    }), messages, names)).toBe('Sam Designer left the workspace')

    expect(formatAuditSentence(event({
      action: 'ownership.transferred',
      details: {
        from_user_id: 'user-1',
        to_user_id: 'user-2',
        previous_role: 'member',
        stay_as_admin: true,
        left: false
      }
    }), messages, names)).toBe('Taylor Engineer made Sam Designer the owner and stayed on as an admin')

    expect(formatAuditSentence(event({
      action: 'ownership.transferred',
      details: {
        from_user_id: 'user-1',
        to_user_id: 'user-2',
        previous_role: 'admin',
        stay_as_admin: false,
        left: true
      }
    }), messages, names)).toBe('Taylor Engineer made Sam Designer the owner and left the workspace')

    expect(formatAuditSentence(event({
      action: 'project.access_changed',
      target_type: 'project',
      target_id: 'project-1',
      details: { restricted: true, previous_restricted: false, member_ids: ['user-2', 'user-3'] }
    }), messages, names)).toBe('Taylor Engineer limited Atlas to 2 members')

    expect(formatAuditSentence(event({
      action: 'project.access_changed',
      target_type: 'project',
      target_id: 'project-1',
      details: { restricted: true, previous_restricted: false, member_ids: ['user-2'] }
    }), messages, names)).toBe('Taylor Engineer limited Atlas to 1 member')

    expect(formatAuditSentence(event({
      action: 'project.access_changed',
      target_type: 'project',
      target_id: 'project-1',
      details: { restricted: false, previous_restricted: true, member_ids: [] }
    }), messages, names)).toBe('Taylor Engineer opened Atlas to everyone in the workspace')
  })

  it('falls back gracefully when names and emails are missing', () => {
    expect(formatAuditSentence(event({
      action: 'member.invited',
      actor_user_id: null,
      details: {}
    }), messages, emptyNames)).toBe('Someone invited a new member')

    expect(formatAuditSentence(event({
      action: 'invite.revoked',
      actor_user_id: 'gone',
      details: {}
    }), messages, emptyNames)).toBe('Someone revoked an invitation')

    expect(formatAuditSentence(event({
      action: 'invite.accepted',
      actor_user_id: null,
      details: { email: 'sam@example.test' }
    }), messages, emptyNames)).toBe('sam@example.test accepted an invitation')

    expect(formatAuditSentence(event({
      action: 'member.role_changed',
      actor_user_id: 'gone',
      target_id: 'gone-2',
      details: { to: 'admin' }
    }), messages, emptyNames)).toBe("Someone changed a member's role to admin")

    expect(formatAuditSentence(event({
      action: 'member.removed',
      actor_user_id: null,
      details: { self: false }
    }), messages, emptyNames)).toBe('Someone removed a member')

    expect(formatAuditSentence(event({
      action: 'ownership.transferred',
      actor_user_id: 'gone',
      details: { stay_as_admin: true }
    }), messages, emptyNames)).toBe('Someone transferred ownership')

    expect(formatAuditSentence(event({
      action: 'project.access_changed',
      actor_user_id: 'gone',
      target_type: 'project',
      target_id: 'missing',
      details: { restricted: true }
    }), messages, emptyNames)).toBe('Someone limited who can see this project')

    expect(formatAuditSentence(event({
      action: 'future.unknown',
      actor_user_id: 'user-1'
    }), messages, names)).toBe('Taylor Engineer made a change')

    expect(auditActorName(event({ action: 'member.invited', actor_user_id: null }), messages, names))
      .toBe('Someone')
  })

  it('formats a relative time with an exact time label', () => {
    const now = new Date('2026-11-23T12:00:00.000Z')
    const time = formatAuditRelativeTime('2026-11-23T10:00:00.000Z', messages, 'en', now)
    expect(time.relative).toBe('2 hours ago')
    expect(time.exact).toMatch(/2026/)
    expect(time.exact.trim()).not.toBe('')
    expect(time.label).toContain('2 hours ago')
    expect(time.label).toContain(time.exact)

    expect(formatAuditRelativeTime('2026-11-23T11:59:30.000Z', messages, 'en', now).relative).toBe('Just now')
    expect(formatAuditRelativeTime('2026-11-22T12:00:00.000Z', messages, 'en', now).relative).toBe('Yesterday')
  })
})
