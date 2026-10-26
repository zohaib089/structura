import assert from 'node:assert/strict'
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { IGNORE_FILE, OUT_DIR } from '../brand.js'
import { makeTree } from '../test-support/tmp.js'
import { readWalkedFile, walkRepository } from './walk.js'

function accounted(result: { files: unknown[]; unnodedSkips: unknown[]; ignored: Map<string, number>; discovered: number }): void {
  const ignored = [...result.ignored.values()].reduce((total, count) => total + count, 0)
  assert.equal(result.discovered, result.files.length + result.unnodedSkips.length + ignored)
}

test('walks deterministically, sorted by path, with language detection', async () => {
  const { root, cleanup } = makeTree({
    'b.ts': 'export {}',
    'a/z.py': 'import os',
    'a/y.json': '{}',
    'a.txt': 'hi',
    'bin/tool': '#!/usr/bin/env node\nconsole.log(1)\n',
    'LICENSE': 'MIT'
  })
  try {
    const first = await walkRepository(root)
    const second = await walkRepository(root)
    assert.deepEqual(first.files.map(file => file.path), ['LICENSE', 'a.txt', 'a/y.json', 'a/z.py', 'b.ts', 'bin/tool'])
    assert.deepEqual(first.files.map(file => file.path), second.files.map(file => file.path))
    const byPath = new Map(first.files.map(file => [file.path, file]))
    assert.equal(byPath.get('a/z.py')?.language, 'python')
    assert.equal(byPath.get('a/z.py')?.disposition, 'skipped')
    assert.equal(byPath.get('a/z.py')?.skipReason, 'unsupported-language')
    assert.equal(byPath.get('bin/tool')?.language, 'javascript')
    assert.equal(byPath.get('bin/tool')?.disposition, 'analyse')
    assert.equal(byPath.get('LICENSE')?.language, null)
    assert.equal(byPath.get('LICENSE')?.detected.id, 'unknown')
    assert.equal(byPath.get('b.ts')?.language, 'typescript')
    assert.equal(first.files[0]?.absPath.startsWith(root), true)
    accounted(first)
  } finally {
    cleanup()
  }
})

test('applies defaults, nested gitignore and the tool ignore file; hard-excludes vcs and the out dir', async () => {
  const { root, cleanup } = makeTree({
    'src/index.ts': 'x',
    'node_modules/dep/index.js': 'x',
    'dist/out.js': 'x',
    '.git/HEAD': 'ref',
    '.gitignore': 'generated/\n',
    'generated/a.ts': 'x',
    'pkg/.gitignore': '*.tmp\n',
    'pkg/a.ts': 'x',
    'pkg/b.tmp': 'x',
    'b.tmp': 'kept at root',
    [IGNORE_FILE]: 'scratch.ts\n',
    'scratch.ts': 'x',
    [`${OUT_DIR}/cache/scan-cache.json`]: '{}'
  })
  try {
    const result = await walkRepository(root)
    assert.deepEqual(result.files.map(file => file.path), [IGNORE_FILE, '.gitignore', 'b.tmp', 'pkg/.gitignore', 'pkg/a.ts', 'src/index.ts'])
    assert.equal(result.ignored.get('default:node_modules'), 1)
    assert.equal(result.ignored.get('default:dist'), 1)
    assert.equal(result.ignored.get('hard:.git'), 1)
    assert.equal(result.ignored.get(`hard:${OUT_DIR}`), 1)
    assert.equal(result.ignored.get('gitignore:generated/'), 1)
    assert.equal(result.ignored.get('gitignore:*.tmp'), 1)
    assert.equal(result.ignored.get('ignorefile:scratch.ts'), 1)
    assert.equal(result.ignoredPaths.includes('.git'), true)
    accounted(result)
  } finally {
    cleanup()
  }
})

test('include globs resurrect ignored files and cannot resurrect hard excludes', async () => {
  const { root, cleanup } = makeTree({
    '.gitignore': 'generated/\n',
    'generated/a.ts': 'export {}\n',
    '.git/HEAD': 'ref',
    [`${OUT_DIR}/graph.json`]: '{}\n',
    'src/index.ts': 'export {}\n'
  })
  try {
    const result = await walkRepository(root, { include: ['generated/a.ts', '.git/**', `${OUT_DIR}/**`] })
    assert.equal(result.files.some(file => file.path === 'generated/a.ts'), true)
    assert.equal(result.ignored.get('hard:.git'), 1)
    assert.equal(result.ignored.get(`hard:${OUT_DIR}`), 1)
    assert.equal(result.files.some(file => file.path === '.git' || file.path.startsWith('.git/')), false)
  } finally {
    cleanup()
  }
})

test('options can disable gitignore and defaults', async () => {
  const { root, cleanup } = makeTree({ '.gitignore': 'a.ts\n', 'a.ts': 'x', 'node_modules/x.js': 'x' })
  try {
    const result = await walkRepository(root, { respectGitignore: false, useDefaultIgnores: false })
    assert.deepEqual(result.files.map(file => file.path), ['.gitignore', 'a.ts', 'node_modules/x.js'])
  } finally {
    cleanup()
  }
})

test('extra ignore patterns apply', async () => {
  const { root, cleanup } = makeTree({ 'a.ts': 'x', 'gen/b.ts': 'x' })
  try {
    const result = await walkRepository(root, { extraIgnorePatterns: ['gen/'] })
    assert.deepEqual(result.files.map(file => file.path), ['a.ts'])
    assert.equal(result.ignored.get('default:gen'), 1)
  } finally {
    cleanup()
  }
})

test('never follows symlinks and records them as skipped file nodes', async () => {
  const outside = makeTree({ 'secret.ts': 'export const secret = 1' })
  const { root, cleanup } = makeTree({ 'real/a.ts': 'x', 'ok.ts': 'x' })
  try {
    symlinkSync(outside.root, join(root, 'escape'))
    symlinkSync(join(outside.root, 'secret.ts'), join(root, 'secret-link.ts'))
    symlinkSync(root, join(root, 'real', 'loop'))
    symlinkSync(join(root, 'ok.ts'), join(root, 'alias.ts'))
    symlinkSync(join(root, 'missing'), join(root, 'dangling'))

    const result = await walkRepository(root)
    const byPath = new Map(result.files.map(file => [file.path, file]))
    assert.equal(byPath.get('ok.ts')?.disposition, 'analyse')
    assert.equal(byPath.get('alias.ts')?.skipReason, 'symlink')
    assert.equal(byPath.get('dangling')?.skipReason, 'symlink')
    assert.equal(byPath.get('real/loop')?.skipReason, 'symlink')
    assert.equal(byPath.get('escape')?.skipReason, 'symlink-outside-root')
    assert.equal(byPath.get('secret-link.ts')?.skipReason, 'symlink-outside-root')
    assert.equal(result.files.some(file => file.path === 'escape/secret.ts'), false)
    accounted(result)
  } finally {
    cleanup()
    outside.cleanup()
  }
})

test('skips oversize files without reading them and keeps language info', async () => {
  const { root, cleanup } = makeTree({ 'big.ts': 'x'.repeat(200), 'small.ts': 'x' })
  try {
    const result = await walkRepository(root, { limits: { maxFileSizeBytes: 100 } })
    const big = result.files.find(file => file.path === 'big.ts')
    const small = result.files.find(file => file.path === 'small.ts')
    assert.equal(big?.disposition, 'skipped')
    assert.equal(big?.skipReason, 'too-large')
    assert.equal(big?.language, 'typescript')
    assert.equal(small?.disposition, 'analyse')
  } finally {
    cleanup()
  }
})

test('readWalkedFile detects binary content and enforces the size limit', async () => {
  const { root, cleanup } = makeTree({ 'text.ts': 'export const a = 1\n', 'img.png': Buffer.from([0x89, 0x50, 0x00, 0x01, 0x02]) })
  try {
    const { files } = await walkRepository(root)
    const text = await readWalkedFile(files.find(file => file.path === 'text.ts')!)
    assert.ok(text.ok && !text.binary)
    const image = await readWalkedFile(files.find(file => file.path === 'img.png')!)
    assert.ok(image.ok && image.binary)
    const file = files.find(item => item.path === 'text.ts')!
    writeFileSync(file.absPath, 'y'.repeat(500))
    const grown = await readWalkedFile(file, 100)
    assert.equal(grown.ok, false)
    if (!grown.ok) assert.equal(grown.reason, 'too-large')
    const missing = await readWalkedFile({ ...file, absPath: join(root, 'nope.ts') })
    assert.equal(missing.ok, false)
    if (!missing.ok) assert.equal(missing.reason, 'vanished')
  } finally {
    cleanup()
  }
})

test('rejects a root that is not a directory', async () => {
  const { root, cleanup } = makeTree({ 'a.ts': 'x' })
  try {
    await assert.rejects(walkRepository(join(root, 'a.ts')), /not a directory/)
    await assert.rejects(walkRepository(join(root, 'missing')))
  } finally {
    cleanup()
  }
})

test('unrepresentable names are skipped without a node and are not percent-encoded', async () => {
  const { root, cleanup } = makeTree({ 'ok.ts': 'x' })
  try {
    mkdirSync(join(root, 'd'))
    writeFileSync(join(root, 'd', 'back\\slash.ts'), 'x')
    const result = await walkRepository(root)
    assert.deepEqual(result.files.map(file => file.path), ['ok.ts'])
    assert.equal(result.unnodedSkips.some(item => item.reason === 'unrepresentable-path'), true)
    assert.equal(result.files.some(file => file.path.includes('%')), false)
    accounted(result)
  } finally {
    cleanup()
  }
})
