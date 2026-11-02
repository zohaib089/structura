import assert from 'node:assert/strict'
import test from 'node:test'
import { matchPathPattern } from './path-glob.js'

test('matchPathPattern uses gitignore glob semantics', () => {
  assert.equal(matchPathPattern('src/app.ts', 'src/**'), true)
  assert.equal(matchPathPattern('lib/app.ts', 'src/**'), false)
  assert.equal(matchPathPattern('src/app.ts', '*.ts'), true)
  assert.equal(matchPathPattern('.', 'src/**'), false)
})
