import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { AdapterLoadError } from './adapter.js'
import { createTypeScriptJavaScriptAdapter } from './ts-js/adapter.js'

test('a corrupt core WASM fails loudly with RUNTIME_INIT_FAILED', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlasmith-wasm-'))
  const bad = join(dir, 'core.wasm')
  writeFileSync(bad, 'this is not wasm')
  const adapter = createTypeScriptJavaScriptAdapter({ runtime: { resolveCoreWasm: () => bad } })
  await assert.rejects(adapter.load(), (error: unknown) => {
    assert.ok(error instanceof AdapterLoadError)
    assert.equal(error.code, 'RUNTIME_INIT_FAILED')
    return true
  })
})
