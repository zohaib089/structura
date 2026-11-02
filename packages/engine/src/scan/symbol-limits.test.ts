import assert from 'node:assert/strict'
import test from 'node:test'
import type { AdapterParseResult } from '../adapters/adapter.js'
import { GraphBuilder } from '../graph/builder.js'
import { fileId, symbolId } from '../graph/ids.js'
import { addSymbols } from './scan.js'

test('a symbol id longer than 8192 UTF-16 units is omitted and addSymbols reports limit-exceeded', () => {
  const filePath = `p/${'a'.repeat(4088)}.ts`
  const name = 'b'.repeat(4096)
  assert.ok(symbolId(filePath, name).length > 8192)
  const facts: AdapterParseResult = {
    references: [],
    symbols: [{
      qualifiedName: name,
      label: name,
      symbolKind: 'function',
      exported: true,
      span: { start: { line: 1, col: 1 }, end: { line: 1, col: 2 } }
    }],
    syntaxErrorCount: 0,
    syntaxErrors: [],
    omitted: { longNames: 0, symbols: 0, edges: 0 },
    redactions: 0
  }
  const builder = new GraphBuilder()
  builder.addNode({
    id: fileId(filePath),
    kind: 'file',
    path: filePath,
    label: 'f.ts',
    language: 'typescript',
    lineCount: 1,
    parse: { status: 'parsed' }
  })
  assert.equal(addSymbols(builder, filePath, facts), true)
  assert.equal(builder.build({
    files: { discovered: 1, parsed: 1, partial: 0, failed: 0, skipped: 0, ignored: 0 },
    byLanguage: [],
    skipped: [],
    ignored: [],
    unresolved: [],
    accounting: { discovered: 1, accounted: 1 }
  }).nodes.some(node => node.kind === 'symbol'), false)
})
