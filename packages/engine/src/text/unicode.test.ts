import assert from 'node:assert/strict'
import test from 'node:test'
import { escapeTerminal, truncateCodePoints } from './unicode.js'

test('truncateCodePoints does not split a surrogate pair', () => {
  const emoji = '😀x'
  assert.equal(truncateCodePoints(emoji, 1), '😀')
  assert.equal(truncateCodePoints(emoji, 2), '😀x')
})

test('escapeTerminal encodes controls and bidi marks', () => {
  assert.equal(escapeTerminal('a\u0007b'), 'a\\u{7}b')
  assert.equal(escapeTerminal('a\u202eb'), 'a\\u{202e}b')
})
