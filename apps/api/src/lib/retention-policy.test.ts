import assert from 'node:assert/strict'
import test from 'node:test'
import {
  artifactRetentionDeadline,
  backupPurgeDeadline,
  isRetentionDue
} from './retention-policy.js'

const DAY = 24 * 60 * 60 * 1000

test('applies a maximum 90-day retention window to source and derived artifacts', () => {
  const createdAt = '2026-01-01T00:00:00.000Z'
  const expected = new Date(Date.parse(createdAt) + 90 * DAY).toISOString()

  assert.equal(artifactRetentionDeadline(createdAt), expected)
})

test('caps backup lifetime at 90 days after primary deletion', () => {
  const deletedAt = '2026-01-01T00:00:00.000Z'
  assert.equal(
    backupPurgeDeadline(deletedAt),
    new Date(Date.parse(deletedAt) + 90 * DAY).toISOString()
  )
})

test('treats expiry as due at its exact deadline and permits earlier deletion', () => {
  const deadline = artifactRetentionDeadline('2026-01-01T00:00:00.000Z')

  assert.equal(isRetentionDue(deadline, Date.parse(deadline) - 1), false)
  assert.equal(isRetentionDue(deadline, deadline), true)
  assert.equal(isRetentionDue(deadline, Date.parse(deadline) + 1), true)
})

test('rejects invalid timestamps and date overflow instead of silently extending retention', () => {
  assert.throws(() => artifactRetentionDeadline('not-a-date'), /valid timestamp/)
  assert.throws(() => backupPurgeDeadline('not-a-date'), /valid timestamp/)
  assert.throws(() => isRetentionDue('not-a-date'), /valid timestamp/)
  assert.throws(
    () => artifactRetentionDeadline('+275760-09-13T00:00:00.000Z'),
    /supported date range/
  )
})
