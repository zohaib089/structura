import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { ResolveOutcome } from '../adapter.js'
import { PythonResolver } from './resolver.js'

function makeResolver(files: Record<string, string>, ignoredPaths: string[] = []): PythonResolver {
  return PythonResolver.create({
    files: new Set(Object.keys(files)),
    ignoredPaths
  })
}

function file(outcome: ResolveOutcome): string {
  assert.equal(outcome.kind, 'file', JSON.stringify(outcome))
  if (outcome.kind !== 'file') throw new Error('not a file')
  return outcome.path
}

describe('absolute modules', () => {
  test('root modules, src layout, stdlib and third party', async () => {
    const resolver = makeResolver({
      'pkg/mod.py': '',
      'src/app/main.py': ''
    })
    assert.equal(file(resolver.resolve('pkg.mod', 'other.py')), 'pkg/mod.py')
    const srcGuess = resolver.resolve('app.main', 'other.py')
    assert.equal(srcGuess.kind, 'file')
    if (srcGuess.kind === 'file') {
      assert.equal(srcGuess.path, 'src/app/main.py')
      assert.equal(srcGuess.provenance, 'INFERRED')
      assert.equal(srcGuess.reason, 'src-root-guess')
    }
    assert.deepEqual(resolver.resolve('os', 'other.py'), { kind: 'external', ecosystem: 'pypi', name: 'os' })
    assert.deepEqual(resolver.resolve('requests', 'other.py'), { kind: 'external', ecosystem: 'pypi', name: 'requests' })
    assert.deepEqual(resolver.resolve('missing_pkg', 'pkg/mod.py'), { kind: 'external', ecosystem: 'pypi', name: 'missing_pkg' })
  })

  test('prefers .py over .pyi', () => {
    const resolver = makeResolver({ 'types.py': '', 'types.pyi': '' })
    assert.equal(file(resolver.resolve('types', 'x.py')), 'types.py')
  })
})

describe('relative modules', () => {
  test('sibling files and dot imports', () => {
    const resolver = makeResolver({
      'pkg/mod.py': '',
      'pkg/util.py': '',
      'parent/__init__.py': ''
    })
    assert.equal(file(resolver.resolve('..parent', 'pkg/mod.py')), 'parent/__init__.py')
    const dot = resolver.resolveFromDotImport('util', 'pkg/mod.py')
    assert.equal(dot.kind, 'file')
    if (dot.kind === 'file' && dot.provenance === 'INFERRED') {
      assert.equal(dot.path, 'pkg/util.py')
      assert.equal(dot.reason, 'submodule-heuristic')
    }
  })

  test('missing relative targets are not-found', () => {
    const resolver = makeResolver({ 'pkg/mod.py': '' })
    assert.deepEqual(resolver.resolveFromDotImport('nope', 'pkg/mod.py'), { kind: 'unresolved', reason: 'not-found' })
  })
})

describe('typing-only stdlib', () => {
  test('_typeshed is flagged for typeOnly edges', () => {
    const resolver = makeResolver({ 'a.py': '' })
    assert.equal(resolver.isTypeOnlyExternal('_typeshed'), true)
    assert.equal(resolver.isTypeOnlyExternal('os'), false)
  })
})
