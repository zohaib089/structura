import assert from 'node:assert/strict'
import test from 'node:test'
import { redactKnownToken, redactSecrets } from './redact.js'

test('redacts github and gitlab tokens from error text', () => {
  const message = 'auth failed for ghp_1234567890123456789012345678901234567890 and glpat-abcdefghijklmnopqrst'
  const redacted = redactSecrets(message)
  assert.equal(redacted.includes('ghp_'), false)
  assert.equal(redacted.includes('glpat-'), false)
  assert.match(redacted, /\[REDACTED\]/)
})

test('redacts a known token value explicitly', () => {
  const token = 'super-secret-token-value'
  const message = `request failed: Authorization Bearer ${token}`
  assert.equal(redactKnownToken(message, token).includes(token), false)
})
