import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { LIMITS } from '../../limits.js'
import type { AdapterParseResult, ExtractedReference } from '../adapter.js'
import { createPythonAdapter, shutdownPythonParsePool } from './adapter.js'

const adapter = createPythonAdapter()
const limits = {
  maxIdentifierLength: LIMITS.maxIdentifierLength.default,
  maxSymbolsPerFile: LIMITS.maxSymbolsPerFile.default,
  maxEdgesPerFile: LIMITS.maxEdgesPerFile.default
}

before(async () => {
  await adapter.load()
})

after(async () => {
  await shutdownPythonParsePool()
})

async function parse(path: string, content: string): Promise<AdapterParseResult> {
  const outcome = await adapter.parse({ path, content, language: 'python', limits })
  assert.equal(outcome.ok, true, outcome.ok ? '' : `${outcome.reason}`)
  if (!outcome.ok) throw new Error('parse failed')
  return outcome.result
}

const brief = (reference: ExtractedReference) => [reference.specifier, reference.importKind, reference.typeOnly] as const

describe('python imports', () => {
  test('static import forms', async () => {
    const content = [
      'import os',
      'import pkg.sub as alias',
      'from . import sibling',
      'from ..parent import thing',
      'from pkg.mod import name'
    ].join('\n')
    const result = await parse('pkg/mod.py', content)
    assert.deepEqual(result.references.map(brief), [
      ['os', 'static', false],
      ['pkg.sub', 'static', false],
      ['.', 'static', false],
      ['..parent', 'static', false],
      ['pkg.mod', 'static', false]
    ])
    assert.deepEqual(result.references[2]?.names, ['sibling'])
    assert.deepEqual(result.references[4]?.names, ['name'])
  })

  test('TYPE_CHECKING imports are typeOnly', async () => {
    const result = await parse(
      'app.py',
      'from typing import TYPE_CHECKING\nif TYPE_CHECKING:\n  import foo\n'
    )
    const guarded = result.references.find(reference => reference.specifier === 'foo')
    assert.equal(guarded?.typeOnly, true)
  })

  test('dynamic import calls', async () => {
    const result = await parse(
      'dyn.py',
      'import importlib\nimportlib.import_module("pkg")\n__import__(name)\n'
    )
    assert.deepEqual(
      result.references.filter(reference => reference.importKind === 'dynamic').map(brief),
      [
        ['pkg', 'dynamic', false],
        [null, 'dynamic', false]
      ]
    )
  })
})

describe('python symbols', () => {
  test('classes, functions and methods', async () => {
    const result = await parse(
      'mod.py',
      'class C:\n  def m(self):\n    pass\n\ndef f():\n  pass\n'
    )
    assert.deepEqual(
      result.symbols.map(symbol => [symbol.qualifiedName, symbol.symbolKind, symbol.exported]),
      [
        ['C', 'class', true],
        ['C.m', 'function', false],
        ['f', 'function', true]
      ]
    )
  })
})
