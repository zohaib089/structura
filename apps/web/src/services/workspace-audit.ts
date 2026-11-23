import type { DashboardMessages } from './dashboard-messages'
import type { WebLocale } from './locale'
import type { Project, WorkspaceAuditEvent, WorkspaceMember } from './workspaces'

export interface AuditNameLookup {
  memberName(id: string | null | undefined): string | undefined
  projectName(id: string | null | undefined): string | undefined
}

export function auditNameLookup(members: WorkspaceMember[], projects: Project[]): AuditNameLookup {
  const memberById = new Map(members.map(member => [member.id, member.full_name]))
  const projectById = new Map(projects.map(project => [project.id, project.name]))
  return {
    memberName(id) {
      if (!id) return undefined
      const name = memberById.get(id)
      return name?.trim() ? name : undefined
    },
    projectName(id) {
      if (!id) return undefined
      const name = projectById.get(id)
      return name?.trim() ? name : undefined
    }
  }
}

function detailString(details: Record<string, unknown>, key: string): string | undefined {
  const value = details[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function detailBoolean(details: Record<string, unknown>, key: string): boolean | undefined {
  const value = details[key]
  return typeof value === 'boolean' ? value : undefined
}

function detailStringList(details: Record<string, unknown>, key: string): string[] | undefined {
  const value = details[key]
  if (!Array.isArray(value)) return undefined
  return value.filter((item): item is string => typeof item === 'string')
}

function isWorkspaceRole(value: string | undefined): value is 'owner' | 'admin' | 'member' {
  return value === 'owner' || value === 'admin' || value === 'member'
}

function roleLabel(role: 'owner' | 'admin' | 'member', messages: DashboardMessages) {
  if (role === 'owner') return messages.roleOwner
  if (role === 'admin') return messages.roleAdmin
  return messages.roleMember
}

function rolePhrase(role: 'owner' | 'admin' | 'member', messages: DashboardMessages) {
  const label = roleLabel(role, messages).toLowerCase()
  return role === 'member' ? `a ${label}` : `an ${label}`
}

export function auditActorName(
  event: WorkspaceAuditEvent,
  messages: DashboardMessages,
  names: AuditNameLookup
) {
  return names.memberName(event.actor_user_id) ?? messages.activitySomeone
}

function targetMemberName(
  event: WorkspaceAuditEvent,
  detailsKey: string,
  names: AuditNameLookup
) {
  const fromDetails = detailString(event.details, detailsKey)
  return names.memberName(fromDetails) ?? names.memberName(event.target_id)
}

export function formatAuditSentence(
  event: WorkspaceAuditEvent,
  messages: DashboardMessages,
  names: AuditNameLookup
): string {
  const actor = auditActorName(event, messages, names)

  if (event.action === 'member.invited') {
    const email = detailString(event.details, 'email')
    return email ? messages.activityInvited(actor, email) : messages.activityInvitedFallback(actor)
  }

  if (event.action === 'invite.revoked') {
    const email = detailString(event.details, 'email')
    if (detailBoolean(event.details, 'delivery_failed') && email) {
      return messages.activityRevokedDelivery(actor, email)
    }
    return email ? messages.activityRevoked(actor, email) : messages.activityRevokedFallback(actor)
  }

  if (event.action === 'invite.accepted') {
    const email = detailString(event.details, 'email')
    const memberId = detailString(event.details, 'member_id')
    const name = names.memberName(memberId) ?? names.memberName(event.actor_user_id) ?? email
    return name ? messages.activityAccepted(name) : messages.activityAccepted(actor)
  }

  if (event.action === 'member.role_changed') {
    const to = detailString(event.details, 'to')
    const target = targetMemberName(event, 'member_id', names) ?? messages.activityAMember
    if (isWorkspaceRole(to)) {
      if (target === messages.activityAMember) {
        return messages.activityRoleChangedFallback(actor, roleLabel(to, messages).toLowerCase())
      }
      return messages.activityRoleChanged(actor, target, rolePhrase(to, messages))
    }
    return messages.activityRoleChangedFallback(actor, messages.roleMember.toLowerCase())
  }

  if (event.action === 'member.removed') {
    const target = targetMemberName(event, 'member_id', names)
    if (detailBoolean(event.details, 'self')) {
      return messages.activityLeft(target ?? actor)
    }
    return target ? messages.activityRemoved(actor, target) : messages.activityRemovedFallback(actor)
  }

  if (event.action === 'ownership.transferred') {
    const target =
      names.memberName(detailString(event.details, 'to_user_id')) ??
      names.memberName(event.target_id)
    if (!target) return messages.activityOwnershipFallback(actor)
    if (detailBoolean(event.details, 'left')) return messages.activityOwnershipLeft(actor, target)
    if (detailBoolean(event.details, 'stay_as_admin')) return messages.activityOwnershipStay(actor, target)
    return messages.activityOwnership(actor, target)
  }

  if (event.action === 'project.access_changed') {
    const project =
      names.projectName(event.target_id) ??
      names.projectName(detailString(event.details, 'project_id')) ??
      messages.activityThisProject
    const restricted = detailBoolean(event.details, 'restricted')
    if (restricted === false) return messages.activityAccessOpened(actor, project)
    const memberIds = detailStringList(event.details, 'member_ids')
    const count = memberIds?.length
    if (count !== undefined) return messages.activityAccessLimited(actor, project, count)
    return messages.activityAccessLimited(actor, project)
  }

  return messages.activityUnknown(actor)
}

export function formatAuditExactTime(value: string, locale: WebLocale) {
  const date = new Date(value)
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function formatAuditRelativeTime(
  value: string,
  messages: DashboardMessages,
  locale: WebLocale,
  now: Date = new Date()
): { relative: string; exact: string; label: string } {
  const date = new Date(value)
  const exact = formatAuditExactTime(value, locale)
  const deltaMs = now.getTime() - date.getTime()
  const deltaSeconds = Math.round(deltaMs / 1000)
  let relative = exact

  if (deltaSeconds < 45) relative = messages.activityJustNow
  else if (deltaSeconds < 90) relative = messages.activityMinuteAgo
  else if (deltaSeconds < 45 * 60) relative = messages.activityMinutesAgo(Math.round(deltaSeconds / 60))
  else if (deltaSeconds < 90 * 60) relative = messages.activityHourAgo
  else if (deltaSeconds < 22 * 60 * 60) relative = messages.activityHoursAgo(Math.round(deltaSeconds / 3600))
  else {
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const startOfEvent = new Date(date)
    startOfEvent.setHours(0, 0, 0, 0)
    const dayDelta = Math.round((startOfToday.getTime() - startOfEvent.getTime()) / 86_400_000)
    if (dayDelta === 1) relative = messages.activityYesterday
    else if (dayDelta > 1 && dayDelta < 7) relative = messages.activityDaysAgo(dayDelta)
  }

  return {
    relative,
    exact,
    label: messages.activityExactTimeLabel(relative, exact)
  }
}

export function auditActionFilterLabel(action: WorkspaceAuditEvent['action'], messages: DashboardMessages) {
  if (action === 'member.invited') return messages.activityActionInvited
  if (action === 'invite.revoked') return messages.activityActionRevoked
  if (action === 'invite.accepted') return messages.activityActionAccepted
  if (action === 'member.role_changed') return messages.activityActionRoleChanged
  if (action === 'member.removed') return messages.activityActionRemoved
  if (action === 'ownership.transferred') return messages.activityActionOwnership
  if (action === 'project.access_changed') return messages.activityActionAccess
  return action
}
