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
    assert.deepEqual(result.references[1]?.bindings, [{ local: 'alias', imported: '*' }])
    assert.deepEqual(result.references[2]?.bindings, [{ local: 'sibling', imported: 'sibling' }])
    assert.deepEqual(result.references[4]?.bindings, [{ local: 'name', imported: 'name' }])
    assert.deepEqual(result.calls, [])
    assert.equal(result.unresolvedCalls, 0)
  })

  test('from-import aliases record local and imported names', async () => {
    const result = await parse('pkg/mod.py', 'from pkg.mod import name as alias\n')
    assert.deepEqual(result.references[0]?.names, ['name'])
    assert.deepEqual(result.references[0]?.bindings, [{ local: 'alias', imported: 'name' }])
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

describe('python file insights', () => {
  test('records def calls, module-scope callers, and self.method', async () => {
    const result = await parse(
      'mod.py',
      [
        'def format(name):',
        '  return name',
        'class Greeter:',
        '  def hello(self, name):',
        '    self.format(name)',
        '    format(name)',
        '  def format(self, name):',
        '    return name',
        'format("z")'
      ].join('\n')
    )
    const calls = result.calls.map(call => [call.caller, call.intraFileCallee])
    assert.equal(result.calls.some(call => call.caller === 'Greeter.hello' && call.intraFileCallee === 'Greeter.format'), true, JSON.stringify(calls))
    assert.equal(result.calls.some(call => call.caller === 'Greeter.hello' && call.intraFileCallee === 'format'), true, JSON.stringify(calls))
    assert.equal(result.calls.some(call => call.caller === null && call.intraFileCallee === 'format'), true, JSON.stringify(calls))
    assert.equal(result.symbols.find(symbol => symbol.qualifiedName === 'Greeter.hello')?.paramCount, 2)
    assert.equal(result.symbols.find(symbol => symbol.qualifiedName === 'Greeter.hello')?.parent, 'Greeter')
  })

  test('records module globals, constants, class attrs, instance attrs, and global statements', async () => {
    const result = await parse(
      'state.py',
      [
        'count = 0',
        'MAX = 10',
        'x: int = 1',
        'class Box:',
        '  kind = "a"',
        '  def __init__(self):',
        '    self.value = 2',
        '    other = 3',
        'def tweak():',
        '  global count',
        '  count = 1'
      ].join('\n')
    )
    const count = result.symbols.find(symbol => symbol.qualifiedName === 'count')
    const max = result.symbols.find(symbol => symbol.qualifiedName === 'MAX')
    const kind = result.symbols.find(symbol => symbol.qualifiedName === 'Box.kind')
    const value = result.symbols.find(symbol => symbol.qualifiedName === 'Box.self.value')
    const annotated = result.symbols.find(symbol => symbol.qualifiedName === 'x')
    assert.deepEqual([count?.scope, count?.mutable], ['module', true])
    assert.deepEqual([max?.scope, max?.mutable], ['module', false])
    assert.deepEqual([annotated?.scope, annotated?.mutable], ['module', true])
    assert.deepEqual([kind?.scope, kind?.mutable], ['class', true])
    assert.deepEqual([value?.scope, value?.mutable, value?.parent], ['instance', true, 'Box'])
    assert.equal(result.symbols.some(symbol => symbol.scope === 'instance' && symbol.label === 'other'), false)
  })

  test('reads module and declaration docstrings; getattr is unresolved', async () => {
    const result = await parse(
      'docs.py',
      [
        '"""Module greeting."""',
        'def known():',
        '  """Returns a known helper."""',
        '  return 1',
        'class C:',
        '  """A simple class."""',
        '  def run(self, obj, name):',
        '    getattr(obj, name)()',
        '    known()'
      ].join('\n')
    )
    assert.equal(result.fileDocSummary, 'Module greeting.')
    assert.equal(result.symbols.find(symbol => symbol.qualifiedName === 'known')?.docSummary, 'Returns a known helper.')
    assert.equal(result.symbols.find(symbol => symbol.qualifiedName === 'C')?.docSummary, 'A simple class.')
    assert.equal(result.calls.length, 1)
    assert.equal(result.calls[0]?.intraFileCallee, 'known')
    assert.equal(result.calls.every(call => call.intraFileCallee !== 'getattr' && call.importLocal !== 'getattr'), true)
    assert.ok(result.unresolvedCalls >= 1)
  })
})
