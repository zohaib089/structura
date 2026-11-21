import type { Workspace } from './workspaces'

export type WorkspaceRole = Workspace['role']

/** Mirrors the server rule in workspace-routes.ts. Owners manage anyone; admins may not manage or appoint owners. */
export function canManageWorkspaceMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
  nextRole?: WorkspaceRole
): boolean {
  if (actorRole === 'owner') return true
  if (actorRole !== 'admin') return false
  if (targetRole === 'owner' || nextRole === 'owner') return false
  return true
}

export function roleOptionsFor(actorRole: WorkspaceRole, targetRole: WorkspaceRole): WorkspaceRole[] {
  return (['owner', 'admin', 'member'] as const).filter(role =>
    canManageWorkspaceMember(actorRole, targetRole, role)
  )
}

const LAST_OWNER_API_MESSAGE = 'A workspace must keep at least one owner.'

export function isLastOwnerRefusal(message: string): boolean {
  return message === LAST_OWNER_API_MESSAGE
}
