import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodeAuditCursor,
  encodeAuditCursor,
  isAuditAction,
  sanitizeAuditDetails
} from './workspace-audit.js'

test('sanitizeAuditDetails drops tokens, secrets and unknown values', () => {
  assert.deepEqual(
    sanitizeAuditDetails({
      email: 'member@example.test',
      token: 'plain-token',
      token_hash: 'abc123',
      password: 'secret',
      nested: { reset_token: 'r', role: 'admin' },
      member_ids: ['user-1', 'user-2'],
      skipped: () => 'nope'
    }),
    {
      email: 'member@example.test',
      nested: { role: 'admin' },
      member_ids: ['user-1', 'user-2']
    }
  )
  assert.deepEqual(sanitizeAuditDetails(['token']), {})
})

test('encodeAuditCursor round-trips and rejects invalid cursors', () => {
  const createdAt = '2026-11-23T00:00:00.000Z'
  const cursor = encodeAuditCursor(createdAt, 'event-1')
  assert.deepEqual(decodeAuditCursor(cursor), { createdAt, id: 'event-1' })
  assert.equal(decodeAuditCursor('not-a-cursor'), null)
  assert.equal(decodeAuditCursor(''), null)
  assert.equal(isAuditAction('member.removed'), true)
  assert.equal(isAuditAction('scan.started'), false)
})
