import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { AdapterLoadError } from './adapter.js'
import { TreeSitterRuntime } from './tree-sitter-runtime.js'

describe('grammar load failures are explicit', () => {
  test('unresolvable grammar -> WASM_NOT_FOUND', async () => {
    const runtime = new TreeSitterRuntime('t', {
      resolveGrammar: () => {
        throw new Error('missing')
      }
    })
    await assert.rejects(runtime.getParser('python'), (e: unknown) => e instanceof AdapterLoadError && e.code === 'WASM_NOT_FOUND')
  })

  test('corrupt grammar -> GRAMMAR_LOAD_FAILED, and a later retry with a good grammar works', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlasmith-grammar-'))
    const bad = join(dir, 'bad.wasm')
    writeFileSync(bad, 'nope')
    let broken = true
    const runtime = new TreeSitterRuntime('t', {
      resolveGrammar: grammar => (broken ? bad : createRequire(import.meta.url).resolve(`@vscode/tree-sitter-wasm/wasm/tree-sitter-${grammar}.wasm`))
    })
    await assert.rejects(runtime.getParser('typescript'), (e: unknown) => e instanceof AdapterLoadError && e.code === 'GRAMMAR_LOAD_FAILED')
    broken = false
    const parser = await runtime.getParser('typescript')
    assert.ok(parser.parse('const a = 1'))
  })

  test('the real grammars all load, including python', async () => {
    const runtime = new TreeSitterRuntime('t')
    for (const grammar of ['typescript', 'tsx', 'javascript', 'python'] as const) {
      const parser = await runtime.getParser(grammar)
      const tree = parser.parse(grammar === 'python' ? 'import os\n' : 'import x from "y"')
      assert.ok(tree && !tree.rootNode.hasError, grammar)
      tree.delete()
    }
  })
})
