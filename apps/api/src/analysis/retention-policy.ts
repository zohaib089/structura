const MAX_ARTIFACT_RETENTION_DAYS = 90
const MAX_BACKUP_RETENTION_DAYS = 90
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export type RetainedArtifactKind = 'source_snapshot' | 'derived_artifact'

function timestamp(value: string, label: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid timestamp.`)
  return parsed
}

function deadlineFrom(value: string, days: number, label: string): string {
  const milliseconds = timestamp(value, label) + days * MILLISECONDS_PER_DAY
  const deadline = new Date(milliseconds)
  if (!Number.isFinite(deadline.getTime())) throw new Error(`${label} is outside the supported date range.`)
  return deadline.toISOString()
}

export function artifactRetentionDeadline(createdAt: string): string {
  return deadlineFrom(createdAt, MAX_ARTIFACT_RETENTION_DAYS, 'Artifact creation time')
}

export function backupPurgeDeadline(primaryDeletionAt: string): string {
  return deadlineFrom(primaryDeletionAt, MAX_BACKUP_RETENTION_DAYS, 'Primary deletion time')
}

export function isRetentionDue(deadline: string, now: string | number = Date.now()): boolean {
  const deadlineMilliseconds = timestamp(deadline, 'Retention deadline')
  const nowMilliseconds = typeof now === 'number' ? now : timestamp(now, 'Current time')
  if (!Number.isFinite(nowMilliseconds)) throw new Error('Current time must be valid.')
  return nowMilliseconds >= deadlineMilliseconds
}
