import assert from 'node:assert/strict'
import test from 'node:test'

test('parse-tripwire blocks fetch and forbidden modules', async () => {
  await import('./parse-tripwire.js')
  assert.throws(() => fetch('https://example.test'), /tripwire/)
  const banned = ['child', '_process'].join('')
  assert.throws(() => (globalThis as { require: (name: string) => unknown }).require(banned), /tripwire/)
})
