import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { RustResolver, rustChildModuleDir, rustModuleFile } from './resolver.js'

describe('rustModuleFile', () => {
  const files = new Set(['src/main.rs', 'src/util.rs', 'src/hook/mod.rs', 'src/hook/inner.rs', 'Cargo.toml'])

  test('prefers foo.rs over foo/mod.rs and finds nested modules', () => {
    assert.equal(rustModuleFile(files, 'src', 'util'), 'src/util.rs')
    assert.equal(rustModuleFile(files, 'src', 'hook'), 'src/hook/mod.rs')
    assert.equal(rustModuleFile(files, 'src/hook', 'inner'), 'src/hook/inner.rs')
    assert.equal(rustModuleFile(files, 'src', 'missing'), undefined)
  })

  test('child module dir of a file.rs is a same-named folder', () => {
    assert.equal(rustChildModuleDir('src/main.rs'), 'src')
    assert.equal(rustChildModuleDir('src/util.rs'), 'src/util')
    assert.equal(rustChildModuleDir('src/hook/mod.rs'), 'src/hook')
  })
})

describe('RustResolver', () => {
  const files = new Set([
    'src/main.rs',
    'src/util.rs',
    'src/hook/mod.rs',
    'src/hook/inner.rs',
    'Cargo.toml'
  ])
  const resolver = RustResolver.create({
    files,
    ignoredPaths: ['src/ignored'],
    cargoDirs: new Set(['.'])
  })

  test('resolves crate::, self:: and super:: paths and mod declarations to files', () => {
    assert.deepEqual(resolver.resolve('crate::util::helper', 'src/main.rs'), {
      kind: 'file',
      path: 'src/util.rs',
      provenance: 'EXTRACTED'
    })
    assert.deepEqual(resolver.resolve('crate::hook', 'src/main.rs'), {
      kind: 'file',
      path: 'src/hook/mod.rs',
      provenance: 'EXTRACTED'
    })
    assert.deepEqual(resolver.resolve('mod util', 'src/main.rs'), {
      kind: 'file',
      path: 'src/util.rs',
      provenance: 'EXTRACTED'
    })
    assert.deepEqual(resolver.resolve('mod hook', 'src/main.rs'), {
      kind: 'file',
      path: 'src/hook/mod.rs',
      provenance: 'EXTRACTED'
    })
    assert.deepEqual(resolver.resolve('super::hook::run', 'src/util.rs'), {
      kind: 'file',
      path: 'src/hook/mod.rs',
      provenance: 'EXTRACTED'
    })
    assert.deepEqual(resolver.resolve('self::inner::step', 'src/hook/mod.rs'), {
      kind: 'file',
      path: 'src/hook/inner.rs',
      provenance: 'EXTRACTED'
    })
    assert.deepEqual(resolver.resolve('mod inner', 'src/hook/mod.rs'), {
      kind: 'file',
      path: 'src/hook/inner.rs',
      provenance: 'EXTRACTED'
    })
    assert.deepEqual(resolver.resolve('crate::*', 'src/main.rs'), {
      kind: 'file',
      path: 'src/main.rs',
      provenance: 'EXTRACTED'
    })
  })

  test('treats std, core, alloc and third-party crates as cargo externals', () => {
    assert.deepEqual(resolver.resolve('std::collections::HashMap', 'src/main.rs'), {
      kind: 'external',
      ecosystem: 'cargo',
      name: 'std'
    })
    assert.deepEqual(resolver.resolve('core::fmt', 'src/hook/mod.rs'), {
      kind: 'external',
      ecosystem: 'cargo',
      name: 'core'
    })
    assert.deepEqual(resolver.resolve('alloc', 'src/main.rs'), {
      kind: 'external',
      ecosystem: 'cargo',
      name: 'alloc'
    })
    assert.deepEqual(resolver.resolve('serde::Deserialize', 'src/main.rs'), {
      kind: 'external',
      ecosystem: 'cargo',
      name: 'serde'
    })
  })

  test('reports missing, escaped, and ignored modules, and crate:: without Cargo.toml', () => {
    assert.equal(resolver.resolve('crate::missing::deeper', 'src/main.rs').kind, 'unresolved')
    assert.deepEqual(resolver.resolve('super::hook', 'src/main.rs'), { kind: 'unresolved', reason: 'outside-root' })
    const ignored = RustResolver.create({
      files,
      ignoredPaths: ['src/util.rs'],
      cargoDirs: new Set(['.'])
    })
    assert.deepEqual(ignored.resolve('mod util', 'src/main.rs'), { kind: 'unresolved', reason: 'target-ignored' })
    const bare = RustResolver.create({ files, ignoredPaths: [], cargoDirs: new Set() })
    assert.deepEqual(bare.resolve('crate::util', 'src/main.rs'), { kind: 'unresolved', reason: 'not-found' })
    assert.deepEqual(bare.resolve('serde', 'src/main.rs'), { kind: 'external', ecosystem: 'cargo', name: 'serde' })
    assert.deepEqual(bare.resolve('mod util', 'src/main.rs'), {
      kind: 'file',
      path: 'src/util.rs',
      provenance: 'EXTRACTED'
    })
  })
})
