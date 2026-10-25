import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import type { AdapterParseResult, ImportReference } from '../adapter.js'
import { createTypeScriptJavaScriptAdapter } from './adapter.js'

const adapter = createTypeScriptJavaScriptAdapter()

before(async () => {
  await adapter.load()
})

function parse(path: string, content: string): Promise<AdapterParseResult> {
  const language = /\.(?:js|jsx|mjs|cjs)$/.test(path) ? 'javascript' : 'typescript'
  return adapter.parse({ path, content, language })
}

function slice(content: string, ref: { span: { start: { line: number; column: number }; end: { line: number; column: number } } }): string {
  const lines = content.split('\n')
  const { start, end } = ref.span
  if (start.line === end.line) return (lines[start.line - 1] as string).slice(start.column - 1, end.column - 1)
  const parts = [(lines[start.line - 1] as string).slice(start.column - 1)]
  for (let line = start.line + 1; line < end.line; line += 1) parts.push(lines[line - 1] as string)
  parts.push((lines[end.line - 1] as string).slice(0, end.column - 1))
  return parts.join('\n')
}

const brief = (r: ImportReference) => [r.specifier, r.kind, r.typeOnly] as const

describe('imports', () => {
  test('static import forms', async () => {
    const content = [
      "import def from './a'",
      "import * as ns from './b'",
      "import { x, y as z } from './c'",
      "import './side-effect'",
      "import d, { e } from 'pkg'"
    ].join('\n')
    const result = await parse('src/x.ts', content)
    assert.deepEqual(result.imports.map(brief), [
      ['./a', 'static', false],
      ['./b', 'static', false],
      ['./c', 'static', false],
      ['./side-effect', 'static', false],
      ['pkg', 'static', false]
    ])
    assert.deepEqual(result.imports[2]?.names, ['x', 'y'])
    assert.equal(result.syntaxErrorCount, 0)
    assert.equal(slice(content, result.imports[0] as ImportReference), "import def from './a'")
  })

  test('type-only imports are marked', async () => {
    const result = await parse(
      'src/t.ts',
      ["import type { A } from './a'", "import { type B, type C } from './b'", "import { type D, e } from './c'", "import type Def from './d'"].join('\n')
    )
    assert.deepEqual(result.imports.map(brief), [
      ['./a', 'static', true],
      ['./b', 'static', true],
      ['./c', 'static', false],
      ['./d', 'static', true]
    ])
  })

  test('re-exports (value and type) and export symbols', async () => {
    const content = ["export * from './a'", "export * as ns from './b'", "export { x } from './c'", "export type { T } from './d'", 'export const k = 1', 'export function f() {}', 'export default class {}'].join('\n')
    const result = await parse('src/r.ts', content)
    assert.deepEqual(result.imports.map(brief), [
      ['./a', 'reexport', false],
      ['./b', 'reexport', false],
      ['./c', 'reexport', false],
      ['./d', 'reexport', true]
    ])
    assert.deepEqual(result.exports.map(e => [e.name, e.kind]), [
      ['k', 'variable'],
      ['f', 'function'],
      ['default', 'default']
    ])
  })

  test('local export clauses declare symbols without creating imports', async () => {
    const result = await parse('src/l.ts', 'const a = 1\nfunction b() {}\nexport { a, b as c }\n')
    assert.equal(result.imports.length, 0)
    assert.deepEqual(result.exports.map(e => e.name), ['a', 'c'])
  })

  test('dynamic import() and require() with literals', async () => {
    const content = "const m = await import('./lazy')\nconst r = require('./cjs')\nimport('pkg').then(() => {})\n"
    const result = await parse('src/d.ts', content)
    assert.deepEqual(result.imports.map(brief), [
      ['./lazy', 'dynamic', false],
      ['./cjs', 'require', false],
      ['pkg', 'dynamic', false]
    ])
    assert.equal(slice(content, result.imports[0] as ImportReference), "import('./lazy')")
  })

  test('non-literal specifiers are reported with specifier null', async () => {
    const result = await parse('src/n.ts', 'const name = "x"\nimport(name)\nrequire("./" + name)\nimport(`./${name}`)\n')
    assert.equal(result.imports.length, 3)
    for (const ref of result.imports) {
      assert.equal(ref.specifier, null)
      assert.ok(ref.detail && ref.detail.length > 0)
    }
  })

  test('template literal without substitutions is a literal', async () => {
    const result = await parse('src/tl.ts', 'import(`./plain`)\n')
    assert.deepEqual(result.imports.map(brief), [['./plain', 'dynamic', false]])
  })

  test('import-equals require and type positions', async () => {
    const result = await parse('src/ie.ts', "import fs = require('fs')\nlet a: import('./types').Foo\ntype B = typeof import('./b')\n")
    assert.deepEqual(result.imports.map(brief), [
      ['fs', 'require', false],
      ['./types', 'dynamic', true],
      ['./b', 'dynamic', true]
    ])
  })

  test('JavaScript, JSX and CommonJS files', async () => {
    const content = "const a = require('./a')\nmodule.exports = { a }\nexport const el = <div />\n"
    const jsx = await adapter.parse({ path: 'src/x.jsx', content, language: 'javascript' })
    assert.deepEqual(jsx.imports.map(brief), [['./a', 'require', false]])
    assert.equal(jsx.syntaxErrorCount, 0)
  })

  test('TSX files parse JSX', async () => {
    const result = await parse('src/c.tsx', "import React from 'react'\nexport const C = () => <div<string>>x</div>\n")
    assert.equal(result.imports.length, 1)
  })

  test('spans use UTF-16 columns and survive emoji / non-ASCII text', async () => {
    const content = "const s = '😀 héllo'; import('./a')\nimport x from './b'\n"
    const result = await parse('src/u.ts', content)
    assert.equal(slice(content, result.imports[0] as ImportReference), "import('./a')")
    assert.equal(slice(content, result.imports[1] as ImportReference), "import x from './b'")
    assert.equal(result.imports[1]?.span.start.line, 2)
  })

  test('CRLF files keep correct lines', async () => {
    const result = await parse('src/crlf.ts', "import a from './a'\r\nimport b from './b'\r\n")
    assert.deepEqual(result.imports.map(r => r.span.start.line), [1, 2])
  })

  test('imports inside comments and strings are ignored', async () => {
    const result = await parse('src/c.ts', "// import x from './no'\n/* require('./no') */\nconst s = \"import('./no')\"\n")
    assert.equal(result.imports.length, 0)
  })
})

describe('syntax errors (error recovery is reported, not hidden)', () => {
  test('valid imports before and after a broken statement are still extracted', async () => {
    const content = "import a from './a'\nconst = = =;\nimport b from './b'\nfunction (\n"
    const result = await parse('src/broken.ts', content)
    assert.ok(result.syntaxErrorCount > 0)
    assert.ok(result.syntaxErrors.length > 0)
    assert.ok(result.syntaxErrors.every(issue => issue.span.start.line >= 2))
    const specifiers = result.imports.map(r => r.specifier)
    assert.ok(specifiers.includes('./a'))
  })

  test('an unterminated file is reported', async () => {
    const result = await parse('src/trunc.ts', "import a from './a'\nexport function f( {\n")
    assert.ok(result.syntaxErrorCount > 0)
  })

  test('clean files report zero errors', async () => {
    const result = await parse('src/ok.ts', "import a from './a'\n")
    assert.equal(result.syntaxErrorCount, 0)
    assert.deepEqual(result.syntaxErrors, [])
  })

  test('empty file is fine', async () => {
    const result = await parse('src/empty.ts', '')
    assert.deepEqual([result.imports.length, result.exports.length, result.syntaxErrorCount], [0, 0, 0])
  })
})
