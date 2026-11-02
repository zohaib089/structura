import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AdapterLoadError } from './adapter.js'
import { createTypeScriptJavaScriptAdapter } from './ts-js/adapter.js'

// Runs in its own process (node:test isolates files), because the runtime init promise is module-global.
test('a missing core WASM fails loudly with WASM_NOT_FOUND', async () => {
  const adapter = createTypeScriptJavaScriptAdapter({
    runtime: {
      resolveCoreWasm: () => {
        throw new Error('not here')
      }
    }
  })
  await assert.rejects(adapter.load(), (error: unknown) => {
    assert.ok(error instanceof AdapterLoadError)
    assert.equal(error.code, 'WASM_NOT_FOUND')
    assert.equal(error.adapterId, 'typescript-javascript')
    assert.match(error.message, /npm install/)
    return true
  })
  // Parsing never silently succeeds with a broken runtime.
  await assert.rejects(
    adapter.parse({
      path: 'a.ts',
      content: 'import x from "y"',
      language: 'typescript',
      limits: { maxIdentifierLength: 64, maxSymbolsPerFile: 10, maxEdgesPerFile: 10 }
    }),
    AdapterLoadError
  )
})
