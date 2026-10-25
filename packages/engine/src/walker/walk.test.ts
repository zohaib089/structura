import assert from 'node:assert/strict'
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { IGNORE_FILE } from '../brand.js'
import { makeTree } from '../test-support/tmp.js'
import { readWalkedFile, toReportablePath, walkRepository } from './walk.js'

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
    assert.deepEqual(first.files.map(f => f.path), ['LICENSE', 'a.txt', 'a/y.json', 'a/z.py', 'b.ts', 'bin/tool'])
    assert.deepEqual(first.files.map(f => f.path), second.files.map(f => f.path))
    const byPath = new Map(first.files.map(f => [f.path, f.language.id]))
    assert.equal(byPath.get('a/z.py'), 'python')
    assert.equal(byPath.get('bin/tool'), 'javascript')
    assert.equal(byPath.get('LICENSE'), 'unknown')
    assert.equal(first.files[0]?.absPath.startsWith(root), true)
  } finally {
    cleanup()
  }
})

test('applies defaults, nested .gitignore and the tool ignore file; records ignored entries', async () => {
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
    '.structura/cache/scan-cache.json': '{}'
  })
  try {
    const result = await walkRepository(root)
    assert.deepEqual(result.files.map(f => f.path), ['.gitignore', IGNORE_FILE, 'b.tmp', 'pkg/.gitignore', 'pkg/a.ts', 'src/index.ts'])
    const ignored = new Map(result.skipped.filter(s => s.reason === 'ignored').map(s => [s.path, s]))
    for (const expected of ['node_modules', 'dist', '.git', 'generated', 'pkg/b.tmp', 'scratch.ts', '.structura']) {
      assert.ok(ignored.has(expected), `expected ${expected} to be reported as ignored`)
    }
    assert.equal(ignored.get('node_modules')?.entryType, 'directory')
    assert.match(ignored.get('generated')?.detail ?? '', /\.gitignore/)
    assert.match(ignored.get('scratch.ts')?.detail ?? '', new RegExp(IGNORE_FILE.replace('.', '\\.')))
  } finally {
    cleanup()
  }
})

test('options can disable gitignore and defaults', async () => {
  const { root, cleanup } = makeTree({ '.gitignore': 'a.ts\n', 'a.ts': 'x', 'node_modules/x.js': 'x' })
  try {
    const result = await walkRepository(root, { respectGitignore: false, useDefaultIgnores: false })
    assert.deepEqual(result.files.map(f => f.path), ['.gitignore', 'a.ts', 'node_modules/x.js'])
  } finally {
    cleanup()
  }
})

test('extra ignore patterns apply', async () => {
  const { root, cleanup } = makeTree({ 'a.ts': 'x', 'gen/b.ts': 'x' })
  try {
    const result = await walkRepository(root, { extraIgnorePatterns: ['gen/'] })
    assert.deepEqual(result.files.map(f => f.path), ['a.ts'])
  } finally {
    cleanup()
  }
})

test('never follows symlinks: inside, outside, directory loops and broken links are reported', async () => {
  const outside = makeTree({ 'secret.ts': 'export const secret = 1' })
  const { root, cleanup } = makeTree({ 'real/a.ts': 'x', 'ok.ts': 'x' })
  try {
    symlinkSync(outside.root, join(root, 'escape'))
    symlinkSync(join(outside.root, 'secret.ts'), join(root, 'secret-link.ts'))
    symlinkSync(root, join(root, 'real', 'loop'))
    symlinkSync(join(root, 'ok.ts'), join(root, 'alias.ts'))
    symlinkSync(join(root, 'missing'), join(root, 'dangling'))

    const result = await walkRepository(root)
    assert.deepEqual(result.files.map(f => f.path), ['ok.ts', 'real/a.ts'])
    const symlinks = new Map(result.skipped.filter(s => s.reason === 'symlink').map(s => [s.path, s.detail ?? '']))
    assert.deepEqual([...symlinks.keys()].sort(), ['alias.ts', 'dangling', 'escape', 'real/loop', 'secret-link.ts'])
    assert.match(symlinks.get('escape') ?? '', /target outside root/)
    assert.match(symlinks.get('alias.ts') ?? '', /target inside root/)
    assert.match(symlinks.get('dangling') ?? '', /broken/)
  } finally {
    cleanup()
    outside.cleanup()
  }
})

test('skips oversize files without reading them and keeps language info', async () => {
  const { root, cleanup } = makeTree({ 'big.ts': 'x'.repeat(200), 'small.ts': 'x' })
  try {
    const result = await walkRepository(root, { maxFileSize: 100 })
    assert.deepEqual(result.files.map(f => f.path), ['small.ts'])
    const skipped = result.skipped.find(s => s.path === 'big.ts')
    assert.equal(skipped?.reason, 'too_large')
    assert.equal(skipped?.language?.id, 'typescript')
  } finally {
    cleanup()
  }
})

test('readWalkedFile detects binary content and enforces the size limit', async () => {
  const { root, cleanup } = makeTree({ 'text.ts': 'export const a = 1\n', 'img.png': Buffer.from([0x89, 0x50, 0x00, 0x01, 0x02]) })
  try {
    const { files } = await walkRepository(root)
    const text = await readWalkedFile(files.find(f => f.path === 'text.ts')!)
    assert.ok(text.ok && !text.binary)
    const image = await readWalkedFile(files.find(f => f.path === 'img.png')!)
    assert.ok(image.ok && image.binary)
    const file = files.find(f => f.path === 'text.ts')!
    writeFileSync(file.absPath, 'y'.repeat(500))
    const grown = await readWalkedFile(file, 100)
    assert.deepEqual(grown.ok ? null : grown.reason, 'too_large')
    const missing = await readWalkedFile({ ...file, absPath: join(root, 'nope.ts') })
    assert.deepEqual(missing.ok ? null : missing.reason, 'read_error')
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

test('unsafe file names are reported, not scanned; reportable paths are percent-encoded', async () => {
  const { root, cleanup } = makeTree({ 'ok.ts': 'x' })
  try {
    mkdirSync(join(root, 'd'))
    writeFileSync(join(root, 'd', 'back\\slash.ts'), 'x')
    const result = await walkRepository(root)
    assert.deepEqual(result.files.map(f => f.path), ['ok.ts'])
    const skipped = result.skipped.find(s => s.reason === 'read_error')
    assert.equal(skipped?.path, 'd/back%5Cslash.ts')
    assert.equal(toReportablePath('a\nb'), 'a%0Ab')
  } finally {
    cleanup()
  }
})
