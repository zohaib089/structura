import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { decodeSource } from '../scan/decode.js'
import { TreeSitterRuntime } from './tree-sitter-runtime.js'
import type { Node } from 'web-tree-sitter'

const fixture = (name: string): Buffer => readFileSync(fileURLToPath(new URL(`../../schema-fixtures/spans/${name}`, import.meta.url)))

function imports(root: Node): Node[] {
  return root.descendantsOfType('import_statement')
}

test('web-tree-sitter columns are UTF-16 code units', async () => {
  const runtime = new TreeSitterRuntime('span-units')
  const parser = await runtime.getParser('typescript')
  for (const name of ['emoji.ts', 'cjk.ts', 'combining.ts', 'zwj.ts']) {
    const decoded = decodeSource(fixture(name))
    const tree = parser.parse(decoded.text)
    assert.ok(tree)
    const statement = imports(tree.rootNode)[0]
    assert.ok(statement, name)
    const lineStart = decoded.text.lastIndexOf('\n', statement.startIndex - 1) + 1
    const utf16Column = statement.startIndex - lineStart
    const utf8Column = Buffer.byteLength(decoded.text.slice(lineStart, statement.startIndex))
    assert.equal(statement.startIndex, decoded.text.indexOf(statement.text), name)
    assert.equal(statement.startPosition.column, utf16Column, name)
    assert.notEqual(utf16Column, utf8Column, `${name} must differ from a UTF-8 byte column`)
    tree.delete()
  }
})

test('CRLF is one break, a lone CR is not, and a leading BOM is not a column', async () => {
  const runtime = new TreeSitterRuntime('span-units')
  const parser = await runtime.getParser('typescript')

  const crlf = decodeSource(fixture('crlf.ts'))
  const crlfTree = parser.parse(crlf.text)
  assert.ok(crlfTree)
  assert.deepEqual(imports(crlfTree.rootNode).map(node => node.startPosition.row), [0, 1])
  crlfTree.delete()

  const lone = decodeSource(fixture('lone-cr.ts'))
  const loneTree = parser.parse(lone.text)
  assert.ok(loneTree)
  assert.deepEqual(imports(loneTree.rootNode).map(node => node.startPosition.row), [0, 0])
  loneTree.delete()

  const raw = fixture('bom.ts').toString('utf8')
  const rawTree = parser.parse(raw)
  assert.ok(rawTree)
  assert.equal(imports(rawTree.rootNode)[0]?.startPosition.column, 1)
  rawTree.delete()

  const stripped = decodeSource(fixture('bom.ts'))
  assert.equal(stripped.text.charCodeAt(0), 'i'.charCodeAt(0))
  const strippedTree = parser.parse(stripped.text)
  assert.ok(strippedTree)
  assert.equal(imports(strippedTree.rootNode)[0]?.startPosition.column, 0)
  strippedTree.delete()
})
