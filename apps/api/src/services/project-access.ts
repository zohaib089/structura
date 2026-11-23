/** Shared per-project access rule from #95. Owners and admins always have access. */

export function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 't' || value === 'true'
}

/**
 * Whether a workspace member may see a project (and scans attached to it).
 * Unrestricted projects are visible to every member. Restricted projects are
 * visible only to owners, admins, and users listed in `project_members`.
 */
export function hasProjectAccess(role: unknown, accessRestricted: unknown, isListed: unknown): boolean {
  if (role === 'owner' || role === 'admin') return true
  if (!isTruthyFlag(accessRestricted)) return true
  return isTruthyFlag(isListed)
}

/**
 * Scans with no `project_id` stay visible to every workspace member.
 * A scan attached to a project uses {@link hasProjectAccess}.
 */
export function canAccessProjectScan(
  role: unknown,
  projectId: unknown,
  accessRestricted: unknown,
  isListed: unknown
): boolean {
  if (projectId == null || projectId === '') return true
  return hasProjectAccess(role, accessRestricted, isListed)
}
