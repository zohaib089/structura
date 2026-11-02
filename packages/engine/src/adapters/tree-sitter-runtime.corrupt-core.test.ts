import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { AdapterLoadError } from './adapter.js'
import { loadManifest } from './tree-sitter-runtime.js'
import { createTypeScriptJavaScriptAdapter } from './ts-js/adapter.js'

test('a hash mismatch is GRAMMAR_INTEGRITY and a blessed corrupt core is RUNTIME_INIT_FAILED', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wasm-'))
  const bad = join(dir, 'core.wasm')
  const bytes = Buffer.from('this is not wasm')
  writeFileSync(bad, bytes)
  const mismatched = createTypeScriptJavaScriptAdapter({ runtime: { resolveCoreWasm: () => bad } })
  await assert.rejects(mismatched.load(), (error: unknown) => error instanceof AdapterLoadError && error.code === 'GRAMMAR_INTEGRITY')

  const manifest = structuredClone(loadManifest())
  manifest.runtime = { ...manifest.runtime, sha256: createHash('sha256').update(bytes).digest('hex') }
  const blessed = createTypeScriptJavaScriptAdapter({ runtime: { resolveCoreWasm: () => bad, manifest } })
  await assert.rejects(blessed.load(), (error: unknown) => error instanceof AdapterLoadError && error.code === 'RUNTIME_INIT_FAILED')
})
