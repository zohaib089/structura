import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  JavaResolver,
  discoverJavaSourceRoots,
  mavenSourceRootOf,
  packageJavaFiles,
  packageSourceRootOf,
  parseJavaSpecifier
} from './resolver.js'

const files = new Set([
  'src/main/java/com/example/mini/App.java',
  'src/main/java/com/example/mini/util/Helper.java',
  'src/main/java/com/example/mini/util/More.java',
  'src/test/java/com/example/mini/AppTest.java',
  'lib/com/example/mini/lib/Lib.java'
])

const packages = new Map([
  ['src/main/java/com/example/mini/App.java', 'com.example.mini'],
  ['src/main/java/com/example/mini/util/Helper.java', 'com.example.mini.util'],
  ['src/main/java/com/example/mini/util/More.java', 'com.example.mini.util'],
  ['src/test/java/com/example/mini/AppTest.java', 'com.example.mini'],
  ['lib/com/example/mini/lib/Lib.java', 'com.example.mini.lib']
])

const resolver = JavaResolver.create({ files, ignoredPaths: ['src/main/java/hidden'], packages })

describe('source roots', () => {
  test('finds Maven roots and package-derived roots', () => {
    assert.equal(mavenSourceRootOf('src/main/java/com/example/mini/App.java'), 'src/main/java')
    assert.equal(mavenSourceRootOf('svc/src/test/java/A.java'), 'svc/src/test/java')
    assert.equal(packageSourceRootOf('lib/com/example/mini/lib/Lib.java', 'com.example.mini.lib'), 'lib')
    assert.deepEqual(discoverJavaSourceRoots(files, packages), ['src/main/java', 'src/test/java', 'lib'])
  })

  test('lists package files and not subpackages', () => {
    assert.deepEqual(packageJavaFiles(files, 'src/main/java/com/example/mini'), [
      'src/main/java/com/example/mini/App.java'
    ])
    assert.deepEqual(packageJavaFiles(files, 'src/main/java/com/example/mini/util'), [
      'src/main/java/com/example/mini/util/Helper.java',
      'src/main/java/com/example/mini/util/More.java'
    ])
  })
})

describe('JavaResolver', () => {
  test('maps a type import to the file under the matching source root', () => {
    assert.deepEqual(resolver.resolve('com.example.mini.util.Helper', 'src/main/java/com/example/mini/App.java'), {
      kind: 'file',
      path: 'src/main/java/com/example/mini/util/Helper.java',
      provenance: 'EXTRACTED'
    })
  })

  test('maps a wildcard import to every file in the package directory', () => {
    assert.deepEqual(resolver.resolveAll('com.example.mini.util.*', 'src/main/java/com/example/mini/App.java'), [
      { kind: 'file', path: 'src/main/java/com/example/mini/util/Helper.java', provenance: 'EXTRACTED' },
      { kind: 'file', path: 'src/main/java/com/example/mini/util/More.java', provenance: 'EXTRACTED' }
    ])
  })

  test('resolves a test source against main and a package-derived root', () => {
    assert.deepEqual(resolver.resolve('com.example.mini.App', 'src/test/java/com/example/mini/AppTest.java'), {
      kind: 'file',
      path: 'src/main/java/com/example/mini/App.java',
      provenance: 'EXTRACTED'
    })
    assert.deepEqual(resolver.resolve('com.example.mini.lib.Lib', 'src/main/java/com/example/mini/App.java'), {
      kind: 'file',
      path: 'lib/com/example/mini/lib/Lib.java',
      provenance: 'EXTRACTED'
    })
  })

  test('resolves a static import to the enclosing type file', () => {
    assert.deepEqual(resolver.resolve('java.lang.Math.max', 'src/main/java/com/example/mini/App.java'), {
      kind: 'external',
      ecosystem: 'maven',
      name: 'java.lang.Math.max'
    })
    assert.deepEqual(resolver.resolve('com.example.mini.util.Helper.hello', 'src/main/java/com/example/mini/App.java'), {
      kind: 'file',
      path: 'src/main/java/com/example/mini/util/Helper.java',
      provenance: 'EXTRACTED'
    })
    assert.equal(parseJavaSpecifier('java.lang.Math.*')?.base, 'java.lang.Math')
  })

  test('treats JDK and third-party imports as maven externals', () => {
    assert.deepEqual(resolver.resolve('java.util.List', 'src/main/java/com/example/mini/App.java'), {
      kind: 'external',
      ecosystem: 'maven',
      name: 'java.util.List'
    })
    assert.deepEqual(resolver.resolve('java.util.*', 'src/main/java/com/example/mini/App.java'), {
      kind: 'external',
      ecosystem: 'maven',
      name: 'java.util'
    })
    assert.deepEqual(resolver.resolve('com.google.common.collect.ImmutableList', 'src/main/java/com/example/mini/App.java'), {
      kind: 'external',
      ecosystem: 'maven',
      name: 'com.google.common.collect.ImmutableList'
    })
  })

  test('reports a missing type in a project package as not-found', () => {
    const outcome = resolver.resolve('com.example.mini.Missing', 'src/main/java/com/example/mini/App.java')
    assert.deepEqual(outcome, { kind: 'unresolved', reason: 'not-found' })
  })
})
