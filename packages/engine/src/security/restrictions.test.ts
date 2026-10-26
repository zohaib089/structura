import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { findRestrictionViolations } from './restrictions.js'

test('engine and cli do not import process or network modules, or hard-code the product name', () => {
  const root = fileURLToPath(new URL('../../../../', import.meta.url))
  const violations = findRestrictionViolations(root)
  assert.deepEqual(violations, [])
})
