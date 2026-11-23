import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { GoResolver, packageGoFiles, parseGoModulePath } from './resolver.js'

describe('parseGoModulePath', () => {
  test('reads an unquoted module path and skips comments', () => {
    const content = `// leading
module example.com/mini // trailing

go 1.22
`
    assert.equal(parseGoModulePath(content), 'example.com/mini')
  })

  test('reads a quoted module path', () => {
    assert.equal(parseGoModulePath('module "example.com/mini"\n'), 'example.com/mini')
  })

  test('returns undefined when no module clause is present', () => {
    assert.equal(parseGoModulePath('go 1.22\n'), undefined)
  })
})

describe('packageGoFiles', () => {
  const files = new Set([
    'main.go',
    'main_test.go',
    'pkg/util/a.go',
    'pkg/util/b.go',
    'pkg/util/a_test.go',
    'pkg/util/sub/c.go',
    'go.mod'
  ])

  test('lists non-test files in a package directory and not its subpackages', () => {
    assert.deepEqual(packageGoFiles(files, '.'), ['main.go'])
    assert.deepEqual(packageGoFiles(files, 'pkg/util'), ['pkg/util/a.go', 'pkg/util/b.go'])
  })
})

describe('GoResolver', () => {
  const files = new Set(['main.go', 'pkg/util/a.go', 'pkg/util/b.go', 'pkg/util/a_test.go', 'pkg/hook/hook.go', 'go.mod'])
  const resolver = GoResolver.create({
    files,
    ignoredPaths: ['vendor'],
    modules: new Map([['.', 'example.com/mini']])
  })

  test('maps in-module imports to every non-test file in the package directory', () => {
    assert.deepEqual(resolver.resolveAll('example.com/mini/pkg/util', 'main.go'), [
      { kind: 'file', path: 'pkg/util/a.go', provenance: 'EXTRACTED' },
      { kind: 'file', path: 'pkg/util/b.go', provenance: 'EXTRACTED' }
    ])
    assert.deepEqual(resolver.resolve('example.com/mini', 'main.go'), {
      kind: 'file',
      path: 'main.go',
      provenance: 'EXTRACTED'
    })
  })

  test('does not treat a module-path prefix without a slash boundary as in-module', () => {
    const outcome = resolver.resolve('example.com/mini-other/pkg', 'main.go')
    assert.deepEqual(outcome, { kind: 'external', ecosystem: 'go', name: 'example.com/mini-other/pkg' })
  })

  test('treats the standard library and third-party modules as external', () => {
    assert.deepEqual(resolver.resolve('fmt', 'main.go'), { kind: 'external', ecosystem: 'go', name: 'fmt' })
    assert.deepEqual(resolver.resolve('net/http', 'main.go'), { kind: 'external', ecosystem: 'go', name: 'net/http' })
    assert.deepEqual(resolver.resolve('github.com/other/mod/pkg', 'main.go'), {
      kind: 'external',
      ecosystem: 'go',
      name: 'github.com/other/mod/pkg'
    })
  })

  test('uses the nearest enclosing go.mod and reports missing or escaped packages', () => {
    const nested = GoResolver.create({
      files: new Set(['svc/main.go', 'svc/pkg/a.go', 'svc/go.mod', 'other/go.mod', 'other/x.go']),
      ignoredPaths: [],
      modules: new Map([
        ['svc', 'example.com/svc'],
        ['other', 'example.com/other']
      ])
    })
    assert.deepEqual(nested.resolve('example.com/svc/pkg', 'svc/main.go'), {
      kind: 'file',
      path: 'svc/pkg/a.go',
      provenance: 'EXTRACTED'
    })
    assert.deepEqual(nested.resolve('example.com/other/x', 'svc/main.go'), {
      kind: 'external',
      ecosystem: 'go',
      name: 'example.com/other/x'
    })
    assert.equal(resolver.resolve('example.com/mini/missing', 'main.go').kind, 'unresolved')
    assert.deepEqual(resolver.resolve('example.com/mini/../secret', 'main.go'), { kind: 'unresolved', reason: 'outside-root' })
  })

  test('treats every import as external when no go.mod is in scope', () => {
    const bare = GoResolver.create({ files, ignoredPaths: [], modules: new Map() })
    assert.deepEqual(bare.resolve('fmt', 'main.go'), { kind: 'external', ecosystem: 'go', name: 'fmt' })
    assert.deepEqual(bare.resolve('example.com/mini/pkg/util', 'main.go'), {
      kind: 'external',
      ecosystem: 'go',
      name: 'example.com/mini/pkg/util'
    })
  })
})
