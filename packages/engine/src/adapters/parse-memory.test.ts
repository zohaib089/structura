import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSource } from './parse-source.js'
import { TreeSitterRuntime } from './tree-sitter-runtime.js'

test('memory ceiling yields memory-limit', async () => {
  const runtime = new TreeSitterRuntime('memory-test')
  const rss = process.memoryUsage().rss
  const outcome = await parseSource(
    runtime,
    'typescript',
    'export const value = 1\n',
    { maxIdentifierLength: 256, maxSymbolsPerFile: 100, maxEdgesPerFile: 100 },
    60_000,
    rss - 1
  )
  assert.equal(outcome.ok, false)
  if (!outcome.ok) assert.equal(outcome.reason, 'memory-limit')
})
