import assert from 'node:assert/strict'
import test from 'node:test'
import { looksSecret } from './redact.js'

test('existing token patterns still match', () => {
  assert.equal(looksSecret('AKIAIOSFODNN7EXAMPLE'), true)
  assert.equal(looksSecret('ASIAIOSFODNN7EXAMPLE'), true)
  assert.equal(looksSecret('ghp_123456789012345678901234567890123456'), true)
  assert.equal(looksSecret('sk-abcdefghijklmnopqrstuvwxyz0123456789abcd'), true)
  assert.equal(looksSecret('https://user:s3cretpass@example.com/repo'), true)
  assert.equal(
    looksSecret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.signature'),
    true
  )
})

test('GitLab token prefixes are detected', () => {
  assert.equal(looksSecret('glpat-abcdefghijklmnopqrstuvwxyz12'), true)
  assert.equal(looksSecret('gldt-abcdefghijklmnopqrstuvwxyz12'), true)
  assert.equal(looksSecret('glrt-abcdefghijklmnopqrstuvwxyz12'), true)
  assert.equal(looksSecret('gloas-abcdefghijklmnopqrstuvwxyz12'), true)
  assert.equal(looksSecret('glsoat-abcdefghijklmnopqrstuvwxyz12'), true)
  assert.equal(looksSecret('glptt-abcdefghijklmnopqrstuvwxyz12'), true)
})

test('AWS secret keys and base64 blobs that contain / or + are detected', () => {
  assert.equal(looksSecret('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'), true)
  assert.equal(looksSecret('Q4+NZFXfM51QTnePWfmxh/bHgV9Lt7rQMQqVcuaCHO4YCGb1RAurO7EBiNv9vDbL'), true)
})

test('credential prose with an assigned value is detected', () => {
  assert.equal(looksSecret('password is s3cr3tValue'), true)
  assert.equal(looksSecret('pwd: hunter22plus'), true)
  assert.equal(looksSecret('api key = abcdEFGH1234secret'), true)
  assert.equal(looksSecret('token: abcdefghijklmnop'), true)
})

test('normal English, package names, and paths are not secrets', () => {
  assert.equal(looksSecret('The token is omitted when empty.'), false)
  assert.equal(looksSecret('Password is required for this API.'), false)
  assert.equal(looksSecret('left-pad'), false)
  assert.equal(looksSecret('@scope/package-name'), false)
  assert.equal(looksSecret('./src/adapters/doc-summary.ts'), false)
  assert.equal(looksSecret('../../packages/engine/src/adapters/doc-summary.ts'), false)
  assert.equal(looksSecret('https://example.com/org/repo'), false)
  assert.equal(looksSecret('node:fs'), false)
  assert.equal(looksSecret('Returns a greeting.'), false)
})
