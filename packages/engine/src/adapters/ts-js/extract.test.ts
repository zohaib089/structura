import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { LIMITS } from '../../limits.js'
import type { AdapterParseResult, ExtractedReference } from '../adapter.js'
import { createTypeScriptJavaScriptAdapter, shutdownParsePool } from './adapter.js'

const adapter = createTypeScriptJavaScriptAdapter()
const limits = {
  maxIdentifierLength: LIMITS.maxIdentifierLength.default,
  maxSymbolsPerFile: LIMITS.maxSymbolsPerFile.default,
  maxEdgesPerFile: LIMITS.maxEdgesPerFile.default
}

before(async () => {
  await adapter.load()
})

after(async () => {
  await shutdownParsePool()
})

async function parse(path: string, content: string): Promise<AdapterParseResult> {
  const language = /\.(?:js|jsx|mjs|cjs)$/.test(path) ? 'javascript' : 'typescript'
  const outcome = await adapter.parse({ path, content, language, limits })
  assert.equal(outcome.ok, true, outcome.ok ? '' : `${outcome.reason}`)
  if (!outcome.ok) throw new Error('parse failed')
  return outcome.result
}

function slice(content: string, ref: ExtractedReference): string {
  const lines = content.split('\n')
  const { start, end } = ref.span
  if (start.line === end.line) return (lines[start.line - 1] as string).slice(start.col - 1, end.col - 1)
  const parts = [(lines[start.line - 1] as string).slice(start.col - 1)]
  for (let line = start.line + 1; line < end.line; line += 1) parts.push(lines[line - 1] as string)
  parts.push((lines[end.line - 1] as string).slice(0, end.col - 1))
  return parts.join('\n')
}

const brief = (reference: ExtractedReference) => [reference.specifier, reference.edgeType, reference.importKind, reference.typeOnly] as const

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
    assert.deepEqual(result.references.map(brief), [
      ['./a', 'imports', 'static', false],
      ['./b', 'imports', 'static', false],
      ['./c', 'imports', 'static', false],
      ['./side-effect', 'imports', 'static', false],
      ['pkg', 'imports', 'static', false]
    ])
    assert.deepEqual(result.references[2]?.names, ['x', 'y'])
    assert.equal(result.syntaxErrorCount, 0)
    assert.equal(slice(content, result.references[0] as ExtractedReference), "import def from './a'")
  })

  test('typeOnly is true only when every binding is type-only; a value binding wins', async () => {
    const result = await parse(
      'src/t.ts',
      [
        "import type { A } from './a'",
        "import { type B, type C } from './b'",
        "import { type D, e } from './c'",
        "import type Def from './d'",
        "import { type A, A } from './mod'"
      ].join('\n')
    )
    assert.deepEqual(result.references.map(brief), [
      ['./a', 'imports', 'static', true],
      ['./b', 'imports', 'static', true],
      ['./c', 'imports', 'static', false],
      ['./d', 'imports', 'static', true],
      ['./mod', 'imports', 'static', false]
    ])
    assert.equal(result.references.filter(reference => reference.specifier === './mod').length, 1)
  })

  test('re-exports and export symbols', async () => {
    const content = ["export * from './a'", "export * as ns from './b'", "export { x } from './c'", "export type { T } from './d'", 'export const k = 1', 'export function f() {}', 'export default class {}'].join('\n')
    const result = await parse('src/r.ts', content)
    assert.deepEqual(result.references.map(brief), [
      ['./a', 'reexports', 'static', false],
      ['./b', 'reexports', 'static', false],
      ['./c', 'reexports', 'static', false],
      ['./d', 'reexports', 'static', true]
    ])
    assert.deepEqual(result.symbols.filter(symbol => symbol.exported).map(symbol => [symbol.label, symbol.symbolKind]), [
      ['k', 'variable'],
      ['f', 'function'],
      ['default', 'default']
    ])
  })

  test('local export clauses declare symbols without creating imports', async () => {
    const result = await parse('src/l.ts', 'const a = 1\nfunction b() {}\nexport { a, b as c }\n')
    assert.equal(result.references.length, 0)
    assert.deepEqual(result.symbols.filter(symbol => symbol.exported).map(symbol => symbol.label), ['a', 'c'])
    assert.equal(result.symbols.find(symbol => symbol.label === 'b')?.exported, false)
  })

  test('dynamic import() and require() with literals', async () => {
    const content = "const m = await import('./lazy')\nconst r = require('./cjs')\nimport('pkg').then(() => {})\n"
    const result = await parse('src/d.ts', content)
    assert.deepEqual(result.references.map(brief), [
      ['./lazy', 'imports', 'dynamic', false],
      ['./cjs', 'imports', 'require', false],
      ['pkg', 'imports', 'dynamic', false]
    ])
    assert.equal(slice(content, result.references[0] as ExtractedReference), "import('./lazy')")
  })

  test('non-literal specifiers are reported with specifier null and no source text', async () => {
    const result = await parse('src/n.ts', 'const name = "x"\nimport(name)\nrequire("./" + name)\nimport(`./${name}`)\n')
    assert.equal(result.references.length, 3)
    for (const reference of result.references) {
      assert.equal(reference.specifier, null)
      assert.equal(JSON.stringify(reference).includes('name'), false)
    }
  })

  test('template literal without substitutions is a literal', async () => {
    const result = await parse('src/tl.ts', 'import(`./plain`)\n')
    assert.deepEqual(result.references.map(brief), [['./plain', 'imports', 'dynamic', false]])
  })

  test('import-equals require and type positions', async () => {
    const result = await parse('src/ie.ts', "import fs = require('fs')\nlet a: import('./types').Foo\ntype B = typeof import('./b')\n")
    assert.deepEqual(result.references.map(brief), [
      ['fs', 'imports', 'require', false],
      ['./types', 'imports', 'dynamic', true],
      ['./b', 'imports', 'dynamic', true]
    ])
  })

  test('JavaScript and JSX files', async () => {
    const content = "const a = require('./a')\nmodule.exports = { a }\nexport const el = <div />\n"
    const result = await parse('src/x.jsx', content)
    assert.deepEqual(result.references.map(brief), [['./a', 'imports', 'require', false]])
    assert.equal(result.syntaxErrorCount, 0)
  })

  test('TSX files parse JSX', async () => {
    const result = await parse('src/c.tsx', "import React from 'react'\nexport const C = () => <div>x</div>\n")
    assert.equal(result.references.length, 1)
  })

  test('spans use UTF-16 columns and survive emoji', async () => {
    const content = "const s = '😀 héllo'; import('./a')\nimport x from './b'\n"
    const result = await parse('src/u.ts', content)
    assert.equal(slice(content, result.references[0] as ExtractedReference), "import('./a')")
    assert.equal(slice(content, result.references[1] as ExtractedReference), "import x from './b'")
    assert.equal(result.references[1]?.span.start.line, 2)
  })

  test('CRLF files keep correct lines and a lone CR is not a break', async () => {
    const crlf = await parse('src/crlf.ts', "import a from './a'\r\nimport b from './b'\r\n")
    assert.deepEqual(crlf.references.map(reference => reference.span.start.line), [1, 2])
    const lone = await parse('src/cr.ts', "import a from './a'\rimport b from './b'\n")
    assert.deepEqual(lone.references.map(reference => reference.span.start.line), [1, 1])
  })

  test('imports inside comments and strings are ignored', async () => {
    const result = await parse('src/c.ts', "// import x from './no'\n/* require('./no') */\nconst s = \"import('./no')\"\n")
    assert.equal(result.references.length, 0)
  })
})

describe('syntax errors are reported, not hidden', () => {
  test('valid imports around a broken statement are still extracted', async () => {
    const content = "import a from './a'\nconst = = =;\nimport b from './b'\nfunction (\n"
    const result = await parse('src/broken.ts', content)
    assert.ok(result.syntaxErrorCount > 0)
    assert.ok(result.syntaxErrors.length > 0)
    assert.ok(result.syntaxErrors.every(issue => issue.span.start.line >= 2))
    assert.ok(result.references.map(reference => reference.specifier).includes('./a'))
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
    assert.deepEqual([result.references.length, result.symbols.length, result.syntaxErrorCount], [0, 0, 0])
  })
})
