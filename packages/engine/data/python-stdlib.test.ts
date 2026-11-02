import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

test('python stdlib pins _typeshed as typing-only documentation', () => {
  const json = JSON.parse(readFileSync(fileURLToPath(new URL('./python-stdlib.json', import.meta.url)), 'utf8')) as { modules: string[] }
  assert.equal(json.modules.includes('_typeshed'), true)
  assert.equal(json.modules.includes('winreg'), true)
})
