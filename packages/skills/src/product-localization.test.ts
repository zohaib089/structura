import assert from 'node:assert/strict'
import test from 'node:test'
import { productLocalization } from './product-localization.js'

test('covers all product content and human review requirements', () => {
  const result = productLocalization({ task: 'implementation', surface: 'legal-content' })

  assert.ok(result.guidance.some(item => item.includes('UI, authentication and product emails')))
  assert.ok(result.guidance.some(item => item.includes('qualified human/legal review')))
  assert.ok(result.guidance.some(item => item.includes('jurisdiction-specific disclosures')))
})

test('distinguishes natural-language source text from programming-language support', () => {
  const result = productLocalization({ task: 'review', surface: 'repository-text' })

  assert.ok(result.guidance.some(item => item.includes('programming-language parser support')))
  assert.ok(result.guidance.some(item => item.includes('preserve original text')))
})
