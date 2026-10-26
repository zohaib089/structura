import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { ResolveOutcome } from '../adapter.js'
import { parseJsonc } from './jsonc.js'
import { TsJsResolver } from './resolver.js'

async function makeResolver(files: Record<string, string>, ignoredPaths: string[] = []): Promise<TsJsResolver> {
  return TsJsResolver.create({
    files: new Set(Object.keys(files)),
    ignoredPaths,
    readText: async path => files[path]
  })
}

function file(outcome: ResolveOutcome): string {
  assert.equal(outcome.kind, 'file', JSON.stringify(outcome))
  if (outcome.kind !== 'file') throw new Error('not a file')
  return outcome.path
}

describe('parseJsonc', () => {
  test('comments, trailing commas, BOM and strings containing comment markers', () => {
    const parsed = parseJsonc('\uFEFF{\n // c\n "a": "http://x/*y*/", /* b */ "b": [1, 2,],\n}')
    assert.deepEqual(parsed, { a: 'http://x/*y*/', b: [1, 2] })
  })
  test('a path pattern inside a string is not a comment', () => {
    const parsed = parseJsonc('{\n  /* header */\n  "compilerOptions": { "paths": { "zustand/*": ["vendor/zustand/*"] } }\n}\n')
    const options = (parsed as { compilerOptions: { paths: Record<string, string[]> } }).compilerOptions
    assert.deepEqual(options.paths['zustand/*'], ['vendor/zustand/*'])
  })
  test('invalid JSON throws', () => {
    assert.throws(() => parseJsonc('{ nope'))
  })
})

describe('relative specifiers', () => {
  const files = {
    'src/a.ts': '',
    'src/b.tsx': '',
    'src/util.ts': '',
    'src/lib/index.ts': '',
    'src/data.json': '',
    'src/old.js': '',
    'src/types.d.ts': '',
    'src/pkgdir/package.json': '{"main":"./lib/entry.js"}',
    'src/pkgdir/lib/entry.js': '',
    'index.ts': ''
  }

  test('extension probing, js to ts mapping, index files, json', async () => {
    const resolver = await makeResolver(files)
    assert.equal(file(resolver.resolve('./b', 'src/a.ts')), 'src/b.tsx')
    assert.equal(file(resolver.resolve('./util.js', 'src/a.ts')), 'src/util.ts')
    assert.equal(file(resolver.resolve('./lib', 'src/a.ts')), 'src/lib/index.ts')
    assert.equal(file(resolver.resolve('./lib/', 'src/a.ts')), 'src/lib/index.ts')
    assert.equal(file(resolver.resolve('./data.json', 'src/a.ts')), 'src/data.json')
    assert.equal(file(resolver.resolve('./old.js', 'src/a.ts')), 'src/old.js')
    assert.equal(file(resolver.resolve('./types', 'src/a.ts')), 'src/types.d.ts')
    assert.equal(file(resolver.resolve('../index', 'src/a.ts')), 'index.ts')
    assert.equal(file(resolver.resolve('.', 'src/lib/x.ts')), 'src/lib/index.ts')
    assert.equal(file(resolver.resolve('./pkgdir', 'src/a.ts')), 'src/pkgdir/lib/entry.js')
  })

  test('standard resolution is EXTRACTED', async () => {
    const resolver = await makeResolver(files)
    const outcome = resolver.resolve('./util.js', 'src/a.ts')
    assert.equal(outcome.kind, 'file')
    if (outcome.kind === 'file') assert.equal(outcome.provenance, 'EXTRACTED')
  })

  test('query strings are stripped', async () => {
    const resolver = await makeResolver(files)
    assert.equal(file(resolver.resolve('./util?raw', 'src/a.ts')), 'src/util.ts')
  })

  test('missing, outside-root and ignored targets are unresolved', async () => {
    const resolver = await makeResolver(files, ['src/generated'])
    assert.deepEqual(resolver.resolve('./nope', 'src/a.ts'), { kind: 'unresolved', reason: 'not-found' })
    assert.deepEqual(resolver.resolve('../../escape', 'src/a.ts'), { kind: 'unresolved', reason: 'outside-root' })
    assert.deepEqual(resolver.resolve('./generated/x', 'src/a.ts'), { kind: 'unresolved', reason: 'target-ignored' })
    assert.deepEqual(resolver.resolve('/abs/path', 'src/a.ts'), { kind: 'unresolved', reason: 'outside-root' })
  })

  test('a null specifier is non-literal and stores no source text', async () => {
    const resolver = await makeResolver(files)
    assert.deepEqual(resolver.resolve(null, 'src/a.ts'), { kind: 'unresolved', reason: 'non-literal-specifier' })
  })
})

describe('bare specifiers', () => {
  test('packages and node builtins use package roots', async () => {
    const resolver = await makeResolver({ 'a.ts': '' })
    assert.deepEqual(resolver.resolve('react', 'a.ts'), { kind: 'external', ecosystem: 'npm', name: 'react' })
    assert.deepEqual(resolver.resolve('lodash/fp', 'a.ts'), { kind: 'external', ecosystem: 'npm', name: 'lodash' })
    assert.deepEqual(resolver.resolve('@scope/pkg/deep/file', 'a.ts'), { kind: 'external', ecosystem: 'npm', name: '@scope/pkg' })
    assert.deepEqual(resolver.resolve('node:fs', 'a.ts'), { kind: 'external', ecosystem: 'node', name: 'fs' })
    assert.deepEqual(resolver.resolve('fs', 'a.ts'), { kind: 'external', ecosystem: 'node', name: 'fs' })
    assert.deepEqual(resolver.resolve('fs/promises', 'a.ts'), { kind: 'external', ecosystem: 'node', name: 'fs' })
  })

  test('alias-like and hash specifiers are unresolved, not external', async () => {
    const resolver = await makeResolver({ 'a.ts': '' })
    for (const specifier of ['@/components/x', '~/x', 'https://cdn/x.js', '@scope', '']) {
      assert.deepEqual(resolver.resolve(specifier, 'a.ts'), { kind: 'unresolved', reason: 'unsupported-specifier' }, specifier)
    }
    assert.deepEqual(resolver.resolve('#internal', 'a.ts'), { kind: 'unresolved', reason: 'unsupported-resolution' })
  })
})

describe('tsconfig paths and baseUrl', () => {
  const files = {
    'tsconfig.base.json': '{ "compilerOptions": { "baseUrl": ".", "paths": { "@shared/*": ["libs/shared/*"], "@exact": ["libs/exact/main.ts"], "zustand/*": ["vendor/zustand/*"] } } }',
    'tsconfig.json': '{ "extends": "./tsconfig.base.json", // comment\n "compilerOptions": { "strict": true, }, }',
    'libs/shared/thing.ts': '',
    'libs/shared/deep/index.ts': '',
    'libs/exact/main.ts': '',
    'vendor/zustand/index.ts': '',
    'src/app.ts': '',
    'web/tsconfig.json': '{ "compilerOptions": { "baseUrl": "src", "paths": { "@/*": ["./*"] } } }',
    'web/src/components/button.tsx': '',
    'web/src/main.ts': '',
    'web/src/lib/helper.ts': ''
  }

  test('paths via extends, including a pattern whose text contains a comment marker', async () => {
    const resolver = await makeResolver(files)
    assert.equal(file(resolver.resolve('@shared/thing', 'src/app.ts')), 'libs/shared/thing.ts')
    assert.equal(file(resolver.resolve('@shared/deep', 'src/app.ts')), 'libs/shared/deep/index.ts')
    assert.equal(file(resolver.resolve('@exact', 'src/app.ts')), 'libs/exact/main.ts')
    const zustand = resolver.resolve('zustand/index', 'src/app.ts')
    assert.equal(zustand.kind, 'file')
    if (zustand.kind === 'file') assert.equal(zustand.provenance, 'EXTRACTED')
    assert.equal(file(zustand), 'vendor/zustand/index.ts')
  })

  test('nearest tsconfig wins, with baseUrl-relative paths', async () => {
    const resolver = await makeResolver(files)
    assert.equal(file(resolver.resolve('@/components/button', 'web/src/main.ts')), 'web/src/components/button.tsx')
    assert.equal(file(resolver.resolve('lib/helper', 'web/src/main.ts')), 'web/src/lib/helper.ts')
    assert.equal(resolver.resolve('@shared/thing', 'web/src/main.ts').kind, 'external')
  })

  test('a matched alias with no target is not-found', async () => {
    const resolver = await makeResolver(files)
    assert.deepEqual(resolver.resolve('@shared/missing', 'src/app.ts'), { kind: 'unresolved', reason: 'not-found' })
  })

  test('an alias target in an ignored directory is target-ignored', async () => {
    const resolver = await makeResolver(files, ['libs/shared/generated'])
    assert.deepEqual(resolver.resolve('@shared/generated/x', 'src/app.ts'), { kind: 'unresolved', reason: 'target-ignored' })
  })

  test('a broken tsconfig does not crash resolution', async () => {
    const resolver = await makeResolver({ 'tsconfig.json': '{ not json', 'a.ts': '', 'b.ts': '' })
    assert.equal(file(resolver.resolve('./b', 'a.ts')), 'b.ts')
  })

  test('unresolvable extends and paths that leave the root are configuration issues', async () => {
    const missing = await makeResolver({ 'tsconfig.json': '{ "extends": "@sindresorhus/tsconfig" }', 'a.ts': '' })
    assert.deepEqual(missing.configIssues.map(issue => issue.reason), ['config-extends-unresolved'])
    const outside = await makeResolver({ 'tsconfig.json': '{ "extends": "../outside.json" }', 'a.ts': '' })
    assert.deepEqual(outside.configIssues.map(issue => issue.reason), ['config-outside-root'])
    const references = await makeResolver({ 'tsconfig.json': '{ "references": [{ "path": "../other" }] }', 'a.ts': '' })
    assert.deepEqual(references.configIssues.map(issue => issue.reason), ['config-outside-root'])
    const missingRef = await makeResolver({ 'tsconfig.json': '{ "references": [{ "path": "./missing.json" }] }', 'a.ts': '' })
    assert.deepEqual(missingRef.configIssues.map(issue => issue.reason), ['config-extends-unresolved'])
  })

  test('project references are followed to in-root configs, including their extends', async () => {
    const vue = await makeResolver({
      'tsconfig.json': '{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }] }',
      'tsconfig.app.json': '{ "extends": "@vue/tsconfig/tsconfig.dom.json" }',
      'tsconfig.node.json': '{ "compilerOptions": { "types": ["node"] } }',
      'src/main.ts': ''
    })
    assert.deepEqual(vue.configIssues, [{ reason: 'config-extends-unresolved', file: 'tsconfig.app.json' }])

    const aliased = await makeResolver({
      'tsconfig.json': '{ "references": [{ "path": "./app" }] }',
      'app/tsconfig.json': '{ "compilerOptions": { "baseUrl": ".", "paths": { "@lib/*": ["lib/*"] } } }',
      'app/lib/util.ts': '',
      'app/src/main.ts': ''
    })
    assert.deepEqual(aliased.configIssues, [])
    assert.deepEqual(aliased.resolve('@lib/util', 'app/src/main.ts'), { kind: 'file', path: 'app/lib/util.ts', provenance: 'EXTRACTED' })
  })
})

describe('workspace packages', () => {
  const files = {
    'package.json': '{"name":"root","workspaces":["packages/*"]}',
    'packages/core/package.json': '{"name":"@acme/core","main":"./dist/index.js","exports":{".":"./dist/index.js","./util":"./dist/util.js"}}',
    'packages/core/src/index.ts': '',
    'packages/core/src/util.ts': '',
    'packages/ui/package.json': '{"name":"@acme/ui","main":"lib/main.js"}',
    'packages/ui/lib/main.js': '',
    'packages/bare/package.json': '{"name":"bare"}',
    'packages/bare/src/index.ts': '',
    'packages/bare/src/extra.ts': '',
    'packages/empty/package.json': '{"name":"empty"}',
    'other/package.json': '{"name":"not-a-workspace"}',
    'other/index.ts': '',
    'packages/app/src/main.ts': ''
  }

  test('main and exports present in the scan resolve as EXTRACTED', async () => {
    const resolver = await makeResolver(files)
    const outcome = resolver.resolve('@acme/ui', 'packages/app/src/main.ts')
    assert.equal(file(outcome), 'packages/ui/lib/main.js')
    if (outcome.kind === 'file') assert.equal(outcome.provenance, 'EXTRACTED')
  })

  test('dist entries map to src as INFERRED', async () => {
    const resolver = await makeResolver(files)
    for (const [specifier, expected] of [['@acme/core', 'packages/core/src/index.ts'], ['@acme/core/util', 'packages/core/src/util.ts']] as const) {
      const outcome = resolver.resolve(specifier, 'packages/app/src/main.ts')
      assert.equal(file(outcome), expected)
      assert.equal(outcome.kind, 'file')
      if (outcome.kind === 'file' && outcome.provenance === 'INFERRED') {
        assert.equal(outcome.reason, 'build-output-mapping')
        assert.equal(outcome.confidence, 0.8)
      } else {
        assert.fail('expected an inferred file')
      }
    }
  })

  test('conventional src/index and src subpaths are INFERRED', async () => {
    const resolver = await makeResolver(files)
    const entry = resolver.resolve('bare', 'packages/app/src/main.ts')
    assert.equal(file(entry), 'packages/bare/src/index.ts')
    if (entry.kind === 'file' && entry.provenance === 'INFERRED') assert.equal(entry.reason, 'conventional-entry')
    const sub = resolver.resolve('bare/extra', 'packages/app/src/main.ts')
    assert.equal(file(sub), 'packages/bare/src/extra.ts')
    if (sub.kind === 'file' && sub.provenance === 'INFERRED') assert.equal(sub.reason, 'src-subpath')
  })

  test('a workspace package without an entry is unresolved; non-workspace names stay external', async () => {
    const resolver = await makeResolver(files)
    assert.deepEqual(resolver.resolve('empty', 'packages/app/src/main.ts'), { kind: 'unresolved', reason: 'not-found' })
    assert.deepEqual(resolver.resolve('not-a-workspace', 'packages/app/src/main.ts'), { kind: 'external', ecosystem: 'npm', name: 'not-a-workspace' })
  })

  test('a package does not resolve its own name', async () => {
    const resolver = await makeResolver(files)
    assert.deepEqual(resolver.resolve('@acme/core', 'packages/core/src/util.ts'), { kind: 'unresolved', reason: 'unsupported-resolution' })
  })
})
