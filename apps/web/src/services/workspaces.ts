import { getCurrentSession } from './auth'

export interface Workspace {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface ProjectAccessMember {
  id: string
  role: Workspace['role']
  created_at: string
}

export interface ProjectAccess {
  restricted: boolean
  members: ProjectAccessMember[]
}

export interface WorkspaceMember {
  id: string
  full_name: string
  email: string
  role: Workspace['role']
  created_at: string
}

export interface WorkspaceInvitation {
  id: string
  email: string
  role: 'member'
  created_at: string
  expires_at: string
  inviter_name: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function parseWorkspace(value: unknown): Workspace {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    value.id.trim() !== value.id ||
    !isNonEmptyString(value.name) ||
    value.name.trim() !== value.name ||
    value.name.length > 120 ||
    (value.role !== 'owner' && value.role !== 'admin' && value.role !== 'member') ||
    !isTimestamp(value.created_at) ||
    !isTimestamp(value.updated_at)
  ) {
    throw new Error('The workspace response was invalid.')
  }
  return {
    id: value.id,
    name: value.name,
    role: value.role,
    created_at: value.created_at,
    updated_at: value.updated_at
  }
}

function parseProject(value: unknown): Project {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    value.id.trim() !== value.id ||
    !isNonEmptyString(value.name) ||
    value.name.trim() !== value.name ||
    value.name.length > 120 ||
    typeof value.description !== 'string' ||
    value.description.length > 2000 ||
    !isTimestamp(value.created_at) ||
    !isTimestamp(value.updated_at)
  ) {
    throw new Error('The project response was invalid.')
  }
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    created_at: value.created_at,
    updated_at: value.updated_at
  }
}

function parseProjectAccessMember(value: unknown): ProjectAccessMember {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    (value.role !== 'owner' && value.role !== 'admin' && value.role !== 'member') ||
    !isTimestamp(value.created_at)
  ) {
    throw new Error('The project access response was invalid.')
  }
  return {
    id: value.id,
    role: value.role,
    created_at: value.created_at
  }
}

function parseProjectAccess(value: unknown): ProjectAccess {
  if (!isRecord(value) || typeof value.restricted !== 'boolean' || !Array.isArray(value.members)) {
    throw new Error('The project access response was invalid.')
  }
  return {
    restricted: value.restricted,
    members: parseUniqueRecords(
      value.members,
      parseProjectAccessMember,
      member => member.id,
      'project access member'
    )
  }
}

function parseWorkspaceMember(value: unknown): WorkspaceMember {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.full_name) ||
    !isNonEmptyString(value.email) ||
    (value.role !== 'owner' && value.role !== 'admin' && value.role !== 'member') ||
    !isTimestamp(value.created_at)
  ) {
    throw new Error('The workspace member response was invalid.')
  }
  return {
    id: value.id,
    full_name: value.full_name,
    email: value.email,
    role: value.role,
    created_at: value.created_at
  }
}

function parseInvitation(value: unknown): WorkspaceInvitation {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.email) ||
    value.role !== 'member' ||
    !isTimestamp(value.created_at) ||
    !isTimestamp(value.expires_at) ||
    !isNonEmptyString(value.inviter_name)
  ) {
    throw new Error('The workspace invitation response was invalid.')
  }
  return {
    id: value.id,
    email: value.email,
    role: value.role,
    created_at: value.created_at,
    expires_at: value.expires_at,
    inviter_name: value.inviter_name
  }
}

export class WorkspaceApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'WorkspaceApiError'
    this.status = status
  }
}

async function request(
  path: string,
  method = 'GET',
  payload?: object
): Promise<Record<string, unknown>> {
  const session = getCurrentSession()
  if (!session) throw new Error('Your session has expired. Please sign in again.')

  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.token}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {})
    },
    ...(payload ? { body: JSON.stringify(payload) } : {})
  })
  let result: unknown
  try {
    result = await response.json()
  } catch (cause) {
    if (cause instanceof SyntaxError) {
      throw new WorkspaceApiError(`The API returned invalid JSON (HTTP ${response.status}).`, response.status)
    }
    throw cause
  }
  if (!isRecord(result)) {
    throw new WorkspaceApiError(`The API response was invalid (HTTP ${response.status}).`, response.status)
  }

  if (!response.ok || result.success !== true) {
    const message = typeof result.message === 'string' ? result.message : null
    throw new WorkspaceApiError(message ?? `Request failed with status ${response.status}.`, response.status)
  }
  return result
}

function parseUpdatedMember(value: unknown): Pick<WorkspaceMember, 'id' | 'role' | 'created_at'> {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    (value.role !== 'owner' && value.role !== 'admin' && value.role !== 'member') ||
    !isTimestamp(value.created_at)
  ) {
    throw new Error('The workspace member response was invalid.')
  }
  return {
    id: value.id,
    role: value.role,
    created_at: value.created_at
  }
}

function parseUniqueRecords<T>(
  records: unknown[],
  parse: (record: unknown) => T,
  getId: (record: T) => string,
  label: string
): T[] {
  const parsed = records.map(parse)
  const ids = new Set<string>()

  for (const record of parsed) {
    const id = getId(record)
    if (ids.has(id)) throw new Error(`The ${label} response contained duplicate records.`)
    ids.add(id)
  }

  return parsed
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const result = await request('/workspaces')
  if (!Array.isArray(result.workspaces)) throw new Error('The workspace response was invalid.')
  return parseUniqueRecords(result.workspaces, parseWorkspace, workspace => workspace.id, 'workspace')
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const result = await request('/workspaces', 'POST', { name })
  return parseWorkspace(result.workspace)
}

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const result = await request(`/workspaces/${encodeURIComponent(workspaceId)}/projects`)
  if (!Array.isArray(result.projects)) throw new Error('The project response was invalid.')
  return parseUniqueRecords(result.projects, parseProject, project => project.id, 'project')
}

export async function createProject(
  workspaceId: string,
  name: string,
  description: string
): Promise<Project> {
  const result = await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
    'POST',
    { name, description }
  )
  return parseProject(result.project)
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const result = await request(`/workspaces/${encodeURIComponent(workspaceId)}/members`)
  if (!Array.isArray(result.members)) throw new Error('The workspace member response was invalid.')
  return parseUniqueRecords(
    result.members,
    parseWorkspaceMember,
    member => member.id,
    'workspace member'
  )
}

export async function listWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  const result = await request(`/workspaces/${encodeURIComponent(workspaceId)}/invitations`)
  if (!Array.isArray(result.invitations)) throw new Error('The workspace invitation response was invalid.')
  return parseUniqueRecords(
    result.invitations,
    parseInvitation,
    invitation => invitation.id,
    'workspace invitation'
  )
}

export async function inviteWorkspaceMember(
  workspaceId: string,
  email: string
): Promise<WorkspaceInvitation> {
  const result = await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/invitations`,
    'POST',
    { email }
  )
  return parseInvitation(result.invitation)
}

export async function revokeWorkspaceInvitation(
  workspaceId: string,
  invitationId: string
): Promise<void> {
  await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitationId)}`,
    'DELETE'
  )
}

export async function acceptWorkspaceInvitation(token: string): Promise<{ workspaceId: string }> {
  const result = await request('/workspace-invitations/accept', 'POST', { token })
  if (!isNonEmptyString(result.workspaceId)) {
    throw new Error('The workspace invitation acceptance response was invalid.')
  }
  return { workspaceId: result.workspaceId }
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  memberId: string,
  role: Workspace['role']
): Promise<Pick<WorkspaceMember, 'id' | 'role' | 'created_at'>> {
  const result = await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
    'PATCH',
    { role }
  )
  return parseUpdatedMember(result.member)
}

export async function removeWorkspaceMember(workspaceId: string, memberId: string): Promise<void> {
  await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
    'DELETE'
  )
}

export async function transferWorkspaceOwnership(
  workspaceId: string,
  memberId: string,
  stayAsAdmin: boolean
): Promise<{ member: Pick<WorkspaceMember, 'id' | 'role' | 'created_at'>; left: boolean }> {
  const result = await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/transfer-ownership`,
    'POST',
    { memberId, stayAsAdmin }
  )
  if (typeof result.left !== 'boolean') {
    throw new Error('The ownership transfer response was invalid.')
  }
  return { member: parseUpdatedMember(result.member), left: result.left }
}


export async function getProject(workspaceId: string, projectId: string): Promise<Project> {
  const result = await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}`
  )
  return parseProject(result.project)
}

export async function getProjectAccess(workspaceId: string, projectId: string): Promise<ProjectAccess> {
  const result = await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/access`
  )
  return parseProjectAccess(result.access)
}

export async function updateProjectAccess(
  workspaceId: string,
  projectId: string,
  access: { restricted: boolean; member_ids: string[] }
): Promise<ProjectAccess> {
  const result = await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/access`,
    'PUT',
    access
  )
  return parseProjectAccess(result.access)
}

export const WORKSPACE_AUDIT_ACTIONS = [
  'member.invited',
  'invite.revoked',
  'invite.accepted',
  'member.role_changed',
  'member.removed',
  'ownership.transferred',
  'project.access_changed'
] as const

export type WorkspaceAuditAction = (typeof WORKSPACE_AUDIT_ACTIONS)[number]

export interface WorkspaceAuditEvent {
  id: string
  actor_user_id: string | null
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
}

export interface WorkspaceAuditPage {
  events: WorkspaceAuditEvent[]
  next_cursor: string | null
}

export interface ListWorkspaceAuditOptions {
  limit?: number
  cursor?: string
  action?: WorkspaceAuditAction
  project?: string
}

function parseAuditDetails(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {}
  return value
}

function parseAuditEvent(value: unknown): WorkspaceAuditEvent {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    value.id.trim() !== value.id ||
    !(value.actor_user_id === null || isNonEmptyString(value.actor_user_id)) ||
    !isNonEmptyString(value.action) ||
    !isNonEmptyString(value.target_type) ||
    !isNonEmptyString(value.target_id) ||
    !isTimestamp(value.created_at)
  ) {
    throw new Error('The workspace activity response was invalid.')
  }
  return {
    id: value.id,
    actor_user_id: value.actor_user_id,
    action: value.action,
    target_type: value.target_type,
    target_id: value.target_id,
    details: parseAuditDetails(value.details),
    created_at: value.created_at
  }
}

export async function listWorkspaceAudit(
  workspaceId: string,
  options: ListWorkspaceAuditOptions = {}
): Promise<WorkspaceAuditPage> {
  const params = new URLSearchParams()
  if (options.limit !== undefined) params.set('limit', String(options.limit))
  if (options.cursor) params.set('cursor', options.cursor)
  if (options.action) params.set('action', options.action)
  if (options.project) params.set('project', options.project)
  const query = params.toString()
  const result = await request(
    `/workspaces/${encodeURIComponent(workspaceId)}/audit${query ? `?${query}` : ''}`
  )
  if (!Array.isArray(result.events)) {
    throw new Error('The workspace activity response was invalid.')
  }
  if (result.next_cursor !== null && result.next_cursor !== undefined && !isNonEmptyString(result.next_cursor)) {
    throw new Error('The workspace activity response was invalid.')
  }
  return {
    events: parseUniqueRecords(result.events, parseAuditEvent, event => event.id, 'workspace activity'),
    next_cursor: typeof result.next_cursor === 'string' ? result.next_cursor : null
  }
}

