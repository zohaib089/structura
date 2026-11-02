import assert from 'node:assert/strict'
import test from 'node:test'
import { LIMITS, resolveLimits } from './limits.js'

test('repo config can only lower the default, and a user flag replaces it up to the ceiling', () => {
  const lowered = resolveLimits({}, { maxFileSizeBytes: 100, maxFiles: LIMITS.maxFiles.ceiling })
  assert.equal(lowered.maxFileSizeBytes, 100)
  assert.equal(lowered.maxFiles, LIMITS.maxFiles.default, 'a repo value above the default is ignored')

  const raised = resolveLimits({ maxFileSizeBytes: LIMITS.maxFileSizeBytes.ceiling + 50 }, { maxFileSizeBytes: 100 })
  assert.equal(raised.maxFileSizeBytes, LIMITS.maxFileSizeBytes.ceiling)

  const userBeatsRepo = resolveLimits({ maxFileSizeBytes: 5000 }, { maxFileSizeBytes: 100 })
  assert.equal(userBeatsRepo.maxFileSizeBytes, 5000)

  const ignored = resolveLimits({ maxFileSizeBytes: 0, parseTimeoutMs: Number.NaN })
  assert.equal(ignored.maxFileSizeBytes, LIMITS.maxFileSizeBytes.default)
  assert.equal(ignored.parseTimeoutMs, LIMITS.parseTimeoutMs.default)
})
