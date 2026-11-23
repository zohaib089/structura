import { randomUUID } from 'node:crypto'

import type { WorkspaceQuery } from '../db/types.js'

export const AUDIT_ACTIONS = [
  'member.invited',
  'invite.revoked',
  'invite.accepted',
  'member.role_changed',
  'member.removed',
  'ownership.transferred',
  'project.access_changed'
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_TARGET_TYPES = ['invitation', 'member', 'project'] as const

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number]

const BLOCKED_DETAIL_KEYS = new Set([
  'token',
  'token_hash',
  'password',
  'authorization',
  'secret',
  'otp',
  'otp_code',
  'reset_token',
  'verification_code',
  'session',
  'cookie',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token'
])

export function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === 'string' && (AUDIT_ACTIONS as readonly string[]).includes(value)
}

function isBlockedKey(key: string) {
  return BLOCKED_DETAIL_KEYS.has(key.toLowerCase())
}

export function sanitizeAuditDetails(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return sanitizeObject(value as Record<string, unknown>)
}

function sanitizeObject(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (isBlockedKey(key)) continue
    const sanitized = sanitizeValue(entry)
    if (sanitized !== undefined) result[key] = sanitized
  }
  return result
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeValue(item))
      .filter(item => item !== undefined)
  }
  if (value && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>)
  }
  return undefined
}

export async function recordAuditEvent(
  query: WorkspaceQuery,
  event: {
    workspaceId: string
    actorUserId: string
    action: AuditAction
    targetType: AuditTargetType
    targetId: string
    details?: Record<string, unknown>
  }
): Promise<void> {
  const details = sanitizeAuditDetails(event.details ?? {})
  await query(
    `INSERT INTO audit_events (
       id, workspace_id, actor_user_id, action, target_type, target_id, details
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      randomUUID(),
      event.workspaceId,
      event.actorUserId,
      event.action,
      event.targetType,
      event.targetId,
      JSON.stringify(details)
    ]
  )
}

export interface AuditEventRecord {
  id: string
  actor_user_id: string | null
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
}

export function encodeAuditCursor(createdAt: string, id: string) {
  return Buffer.from(`${createdAt}\t${id}`, 'utf8').toString('base64url')
}

export function decodeAuditCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const tab = raw.indexOf('\t')
    if (tab <= 0) return null
    const createdAt = raw.slice(0, tab)
    const id = raw.slice(tab + 1)
    if (!createdAt || !id || Number.isNaN(Date.parse(createdAt))) return null
    return { createdAt, id }
  } catch {
    return null
  }
}

function asIsoTimestamp(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && value && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString()
  return String(value ?? '')
}

function asDetails(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return sanitizeAuditDetails(JSON.parse(value))
    } catch {
      return {}
    }
  }
  return sanitizeAuditDetails(value)
}

export function serializeAuditEvent(row: Record<string, unknown>): AuditEventRecord {
  const createdAt = asIsoTimestamp(row.created_at)
  return {
    id: String(row.id),
    actor_user_id: typeof row.actor_user_id === 'string' ? row.actor_user_id : null,
    action: String(row.action),
    target_type: String(row.target_type),
    target_id: String(row.target_id),
    details: asDetails(row.details),
    created_at: createdAt
  }
}

export async function listAuditEvents(
  query: WorkspaceQuery,
  options: {
    workspaceId: string
    action?: AuditAction
    projectId?: string
    cursor?: { createdAt: string; id: string }
    limit: number
  }
): Promise<{ events: AuditEventRecord[]; nextCursor: string | null }> {
  const result = await query(
    `SELECT id, actor_user_id, action, target_type, target_id, details, created_at
     FROM audit_events
     WHERE workspace_id = $1
       AND ($2::text IS NULL OR action = $2)
       AND ($3::text IS NULL OR (target_type = 'project' AND target_id = $3))
       AND (
         $4::timestamptz IS NULL
         OR created_at < $4::timestamptz
         OR (created_at = $4::timestamptz AND id < $5)
       )
     ORDER BY created_at DESC, id DESC
     LIMIT $6`,
    [
      options.workspaceId,
      options.action ?? null,
      options.projectId ?? null,
      options.cursor?.createdAt ?? null,
      options.cursor?.id ?? null,
      options.limit + 1
    ]
  )

  const hasMore = result.rows.length > options.limit
  const rows = hasMore ? result.rows.slice(0, options.limit) : result.rows
  const events = rows.map(serializeAuditEvent)
  const last = events.at(-1)
  return {
    events,
    nextCursor: hasMore && last ? encodeAuditCursor(last.created_at, last.id) : null
  }
}
