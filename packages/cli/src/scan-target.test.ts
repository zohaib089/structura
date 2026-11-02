import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveScanTarget } from './scan-target.js'

test('resolveScanTarget rejects unsupported git remotes', async () => {
  await assert.rejects(
    resolveScanTarget('git@github.com:org/repo.git', { cwd: '/tmp' }),
    /https:\/\/github\.com/
  )
})

test('resolveScanTarget resolves local paths relative to cwd', async () => {
  const resolved = await resolveScanTarget('.', { cwd: '/tmp/project' })
  assert.equal(resolved.path, '/tmp/project')
  await resolved.cleanup()
})
