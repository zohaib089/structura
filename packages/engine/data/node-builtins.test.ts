import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

test('node builtins list is pinned and includes fs', () => {
  const json = JSON.parse(readFileSync(fileURLToPath(new URL('./node-builtins.json', import.meta.url)), 'utf8')) as { modules: string[] }
  assert.ok(json.modules.includes('fs'))
  assert.ok(json.modules.length > 20)
})
