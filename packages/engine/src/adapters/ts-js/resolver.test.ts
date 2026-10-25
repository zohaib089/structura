import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { ImportReference, ResolveOutcome } from '../adapter.js'
import { parseJsonc } from './jsonc.js'
import { TsJsResolver } from './resolver.js'

const span = { file: 'x', start: { line: 1, column: 1 }, end: { line: 1, column: 2 } }

async function makeResolver(files: Record<string, string>, ignoredPaths: string[] = []): Promise<TsJsResolver> {
  return TsJsResolver.create(
    {
      files: new Set(Object.keys(files)),
      ignoredPaths,
      readText: async path => files[path]
    },
    'typescript-javascript'
  )
}

function ref(specifier: string | null, detail?: string): ImportReference {
  return { specifier, kind: 'static', typeOnly: false, span, ...(detail ? { detail } : {}) }
}

function file(outcome: ResolveOutcome): string {
  assert.equal(outcome.kind, 'file', JSON.stringify(outcome))
  return (outcome as Extract<ResolveOutcome, { kind: 'file' }>).path
}

describe('parseJsonc', () => {
  test('comments, trailing commas, BOM and strings containing comment markers', () => {
    const parsed = parseJsonc('\uFEFF{\n // c\n "a": "http://x/*y*/", /* b */ "b": [1, 2,],\n}')
    assert.deepEqual(parsed, { a: 'http://x/*y*/', b: [1, 2] })
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

  test('extension probing, .js -> .ts mapping, index files, json', async () => {
    const r = await makeResolver(files)
    assert.equal(file(r.resolve(ref('./b'), 'src/a.ts')), 'src/b.tsx')
    assert.equal(file(r.resolve(ref('./util.js'), 'src/a.ts')), 'src/util.ts')
    assert.equal(file(r.resolve(ref('./lib'), 'src/a.ts')), 'src/lib/index.ts')
    assert.equal(file(r.resolve(ref('./lib/'), 'src/a.ts')), 'src/lib/index.ts')
    assert.equal(file(r.resolve(ref('./data.json'), 'src/a.ts')), 'src/data.json')
    assert.equal(file(r.resolve(ref('./old.js'), 'src/a.ts')), 'src/old.js')
    assert.equal(file(r.resolve(ref('./types'), 'src/a.ts')), 'src/types.d.ts')
    assert.equal(file(r.resolve(ref('../index'), 'src/a.ts')), 'index.ts')
    assert.equal(file(r.resolve(ref('.'), 'src/lib/x.ts')), 'src/lib/index.ts')
    assert.equal(file(r.resolve(ref('./pkgdir'), 'src/a.ts')), 'src/pkgdir/lib/entry.js')
  })

  test('standard resolution is EXTRACTED', async () => {
    const r = await makeResolver(files)
    const outcome = r.resolve(ref('./util.js'), 'src/a.ts')
    assert.equal(outcome.kind === 'file' && outcome.provenance.kind, 'EXTRACTED')
  })

  test('query strings are stripped', async () => {
    const r = await makeResolver(files)
    assert.equal(file(r.resolve(ref('./util?raw'), 'src/a.ts')), 'src/util.ts')
  })

  test('missing, outside-root and ignored targets are unresolved with reasons', async () => {
    const r = await makeResolver(files, ['src/generated'])
    assert.deepEqual(r.resolve(ref('./nope'), 'src/a.ts'), { kind: 'unresolved', reason: 'target_not_found', detail: 'relative import "./nope" matches no scanned file' })
    assert.equal((r.resolve(ref('../../escape'), 'src/a.ts') as { reason: string }).reason, 'outside_root')
    assert.equal((r.resolve(ref('./generated/x'), 'src/a.ts') as { reason: string }).reason, 'target_ignored')
    assert.equal((r.resolve(ref('/abs/path'), 'src/a.ts') as { reason: string }).reason, 'outside_root')
  })

  test('non-literal specifiers keep their detail', async () => {
    const r = await makeResolver(files)
    const outcome = r.resolve(ref(null, 'name + ".js"'), 'src/a.ts')
    assert.deepEqual(outcome, { kind: 'unresolved', reason: 'non_literal_specifier', detail: 'name + ".js"' })
  })
})

describe('bare specifiers', () => {
  test('packages and node builtins become external nodes', async () => {
    const r = await makeResolver({ 'a.ts': '' })
    assert.deepEqual(r.resolve(ref('react'), 'a.ts'), { kind: 'external', name: 'react', builtin: false })
    assert.deepEqual(r.resolve(ref('lodash/fp'), 'a.ts'), { kind: 'external', name: 'lodash', builtin: false })
    assert.deepEqual(r.resolve(ref('@scope/pkg/deep/file'), 'a.ts'), { kind: 'external', name: '@scope/pkg', builtin: false })
    assert.deepEqual(r.resolve(ref('node:fs'), 'a.ts'), { kind: 'external', name: 'node:fs', builtin: true })
    assert.deepEqual(r.resolve(ref('fs'), 'a.ts'), { kind: 'external', name: 'node:fs', builtin: true })
    assert.deepEqual(r.resolve(ref('fs/promises'), 'a.ts'), { kind: 'external', name: 'node:fs/promises', builtin: true })
  })

  test('alias-like and unsupported specifiers are unresolved, not external', async () => {
    const r = await makeResolver({ 'a.ts': '' })
    for (const spec of ['@/components/x', '~/x', '#internal', 'https://cdn/x.js', '@scope', '']) {
      const outcome = r.resolve(ref(spec), 'a.ts')
      assert.equal(outcome.kind, 'unresolved', spec)
      assert.equal((outcome as { reason: string }).reason, 'unsupported_specifier', spec)
    }
  })
})

describe('tsconfig paths and baseUrl', () => {
  const files = {
    'tsconfig.base.json': '{ "compilerOptions": { "baseUrl": ".", "paths": { "@shared/*": ["libs/shared/*"], "@exact": ["libs/exact/main.ts"] } } }',
    'tsconfig.json': '{ "extends": "./tsconfig.base.json", // comment\n "compilerOptions": { "strict": true, }, }',
    'libs/shared/thing.ts': '',
    'libs/shared/deep/index.ts': '',
    'libs/exact/main.ts': '',
    'src/app.ts': '',
    'web/tsconfig.json': '{ "compilerOptions": { "baseUrl": "src", "paths": { "@/*": ["./*"] } } }',
    'web/src/components/button.tsx': '',
    'web/src/main.ts': '',
    'web/src/lib/helper.ts': ''
  }

  test('paths via extends, exact and wildcard', async () => {
    const r = await makeResolver(files)
    assert.equal(file(r.resolve(ref('@shared/thing'), 'src/app.ts')), 'libs/shared/thing.ts')
    assert.equal(file(r.resolve(ref('@shared/deep'), 'src/app.ts')), 'libs/shared/deep/index.ts')
    assert.equal(file(r.resolve(ref('@exact'), 'src/app.ts')), 'libs/exact/main.ts')
  })

  test('nearest tsconfig wins, with baseUrl-relative paths and baseUrl lookup', async () => {
    const r = await makeResolver(files)
    assert.equal(file(r.resolve(ref('@/components/button'), 'web/src/main.ts')), 'web/src/components/button.tsx')
    assert.equal(file(r.resolve(ref('lib/helper'), 'web/src/main.ts')), 'web/src/lib/helper.ts')
    // The root config's aliases do not apply inside web/
    assert.equal(r.resolve(ref('@shared/thing'), 'web/src/main.ts').kind, 'external')
  })

  test('matched alias with no target is unresolved with an explanatory reason', async () => {
    const r = await makeResolver(files)
    const outcome = r.resolve(ref('@shared/missing'), 'src/app.ts')
    assert.equal(outcome.kind, 'unresolved')
    assert.equal((outcome as { reason: string }).reason, 'target_not_found')
    assert.match((outcome as { detail: string }).detail, /@shared\/\*/)
  })

  test('alias target in an ignored directory is target_ignored', async () => {
    const r = await makeResolver(files, ['libs/shared/generated'])
    assert.equal((r.resolve(ref('@shared/generated/x'), 'src/app.ts') as { reason: string }).reason, 'target_ignored')
  })

  test('a broken tsconfig does not crash resolution', async () => {
    const r = await makeResolver({ 'tsconfig.json': '{ not json', 'a.ts': '', 'b.ts': '' })
    assert.equal(file(r.resolve(ref('./b'), 'a.ts')), 'b.ts')
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

  test('main/exports present in scan resolve as EXTRACTED', async () => {
    const r = await makeResolver(files)
    const outcome = r.resolve(ref('@acme/ui'), 'packages/app/src/main.ts')
    assert.equal(file(outcome), 'packages/ui/lib/main.js')
    assert.equal(outcome.kind === 'file' && outcome.provenance.kind, 'EXTRACTED')
  })

  test('dist entries map to src as INFERRED with evidence', async () => {
    const r = await makeResolver(files)
    for (const [spec, expected] of [['@acme/core', 'packages/core/src/index.ts'], ['@acme/core/util', 'packages/core/src/util.ts']] as const) {
      const outcome = r.resolve(ref(spec), 'packages/app/src/main.ts')
      assert.equal(file(outcome), expected)
      assert.ok(outcome.kind === 'file' && outcome.provenance.kind === 'INFERRED')
      if (outcome.kind === 'file' && outcome.provenance.kind === 'INFERRED') {
        assert.ok(outcome.provenance.evidence.length > 0)
        assert.match(outcome.provenance.evidence[0] as string, /dist/)
      }
    }
  })

  test('conventional src/index fallback and src subpaths are INFERRED', async () => {
    const r = await makeResolver(files)
    const entry = r.resolve(ref('bare'), 'packages/app/src/main.ts')
    assert.equal(file(entry), 'packages/bare/src/index.ts')
    assert.equal(entry.kind === 'file' && entry.provenance.kind, 'INFERRED')
    const sub = r.resolve(ref('bare/extra'), 'packages/app/src/main.ts')
    assert.equal(file(sub), 'packages/bare/src/extra.ts')
    assert.equal(sub.kind === 'file' && sub.provenance.kind, 'INFERRED')
  })

  test('workspace package without any entry is unresolved; non-workspace named packages stay external', async () => {
    const r = await makeResolver(files)
    assert.equal((r.resolve(ref('empty'), 'packages/app/src/main.ts') as { reason: string }).reason, 'target_not_found')
    assert.deepEqual(r.resolve(ref('not-a-workspace'), 'packages/app/src/main.ts'), { kind: 'external', name: 'not-a-workspace', builtin: false })
  })
})
