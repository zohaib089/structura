import assert from 'node:assert/strict'
import test from 'node:test'
import { ParsePool } from './pool.js'

test('parse pool returns timeout when progress budget is exceeded', async () => {
  const pool = new ParsePool(1, { workerMaxFiles: 100, workerMaxMemoryBytes: 512 * 1024 * 1024 })
  try {
    const huge = `${'/**/'.repeat(40_000)}export {}\n`
    const outcome = await pool.parse({
      grammar: 'typescript',
      content: huge,
      limits: { maxIdentifierLength: 256, maxSymbolsPerFile: 100, maxEdgesPerFile: 100 },
      timeoutMs: 1,
      memoryLimitBytes: 512 * 1024 * 1024
    })
    assert.equal(outcome.ok, false)
    if (!outcome.ok) assert.equal(outcome.reason, 'timeout')
  } finally {
    await pool.shutdown()
  }
})
