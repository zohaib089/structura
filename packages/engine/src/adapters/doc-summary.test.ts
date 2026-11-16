import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DOC_SUMMARY_MAX_CODE_POINTS,
  DOC_SUMMARY_MAX_RAW_CHARS,
  sanitizeDocSummary
} from './doc-summary.js'

test('keeps a normal first sentence', () => {
  assert.equal(sanitizeDocSummary('Returns a greeting. More text.'), 'Returns a greeting.')
})

test('detects a secret in the full sentence before truncating', () => {
  const prefix = 'Safe words '.repeat(20)
  const sentence = `${prefix}AKIAIOSFODNN7EXAMPLE`
  assert.ok(Array.from(sentence).length > DOC_SUMMARY_MAX_CODE_POINTS)
  assert.equal(sanitizeDocSummary(sentence), undefined)
})

test('drops the summary when truncation would cut through a token', () => {
  const sentence = `Hello ${'abcdefghij'.repeat(20)}`
  assert.ok(Array.from(sentence).length > DOC_SUMMARY_MAX_CODE_POINTS)
  assert.equal(sanitizeDocSummary(sentence), undefined)
})

test('keeps a prefix when truncation lands on a word boundary', () => {
  const sentence = Array.from({ length: 80 }, () => 'word').join(' ')
  assert.ok(Array.from(sentence).length > DOC_SUMMARY_MAX_CODE_POINTS)
  const summary = sanitizeDocSummary(sentence)
  assert.ok(summary)
  assert.ok(Array.from(summary).length <= DOC_SUMMARY_MAX_CODE_POINTS)
  assert.equal(summary.endsWith('word'), true)
  assert.equal(summary.includes('  '), false)
})

test('strips zero-width and soft-hyphen characters and NFKC-normalises before detection and on output', () => {
  const hidden = `AKI\u200BAIOSFODNN7EXAMPLE`
  assert.equal(sanitizeDocSummary(hidden), undefined)
  const soft = `AKI\u00ADAIOSFODNN7EXAMPLE`
  assert.equal(sanitizeDocSummary(soft), undefined)
  const compat = 'Returns a greeting\uFB00y.' // ﬀ compatibility ligature should NFKC
  const summary = sanitizeDocSummary(compat)
  assert.equal(summary, 'Returns a greetingffy.')
  assert.equal(summary?.includes('\u200B'), false)
  assert.equal(summary?.includes('\u00AD'), false)
})

test('omits GitLab tokens, AWS or base64 blobs, and credential prose', () => {
  assert.equal(sanitizeDocSummary('Uses glpat-abcdefghijklmnopqrstuvwxyz12 for access.'), undefined)
  assert.equal(sanitizeDocSummary('Key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY configured.'), undefined)
  assert.equal(sanitizeDocSummary('The password is s3cr3tValue for tests.'), undefined)
})

test('drops summaries that contain an email or a phone number', () => {
  assert.equal(sanitizeDocSummary('Contact support@example.com for help.'), undefined)
  assert.equal(sanitizeDocSummary('Call +1 415-555-1212 for support.'), undefined)
})

test('strips angle brackets rather than keeping raw markup', () => {
  assert.equal(sanitizeDocSummary('Returns Array<string>.'), 'Returns Arraystring.')
})

test('caps raw comment length before stripping example blocks', () => {
  const long = `${'A'.repeat(DOC_SUMMARY_MAX_RAW_CHARS)} and then AKIAIOSFODNN7EXAMPLE`
  // The cap is applied before sentence/secret handling, so the trailing key is not seen;
  // the overlong AAA run is then dropped as a mid-token truncation (or as a secret run).
  assert.equal(sanitizeDocSummary(long), undefined)
})
