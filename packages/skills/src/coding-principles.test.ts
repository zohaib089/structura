import assert from 'node:assert/strict'
import test from 'node:test'
import { codingPrinciples } from './coding-principles.js'

test('includes phase and untrusted-source gates for implementation guidance', () => {
  const result = codingPrinciples({ task: 'implementation', area: 'api' })

  assert.ok(result.guidance.some(item => item.includes('approved threat model')))
  assert.ok(result.guidance.some(item => item.includes('Never execute uploaded repository scripts')))
})
