import assert from 'node:assert/strict'
import test from 'node:test'
import { detectLanguage, languageFromShebang, needsShebangProbe } from './languages.js'

test('detects languages by extension', () => {
  assert.deepEqual(detectLanguage('src/a.ts'), { id: 'typescript', category: 'code' })
  assert.equal(detectLanguage('src/a.tsx').id, 'typescript')
  assert.equal(detectLanguage('src/types.d.ts').id, 'typescript')
  assert.equal(detectLanguage('a.mjs').id, 'javascript')
  assert.equal(detectLanguage('a.JSX').id, 'javascript')
  assert.equal(detectLanguage('pkg/mod.py').id, 'python')
  assert.deepEqual(detectLanguage('package.json'), { id: 'json', category: 'data' })
  assert.equal(detectLanguage('README.md').category, 'doc')
})

test('unknown extensions and extensionless files are unknown', () => {
  assert.deepEqual(detectLanguage('data.xyz'), { id: 'unknown', category: 'unknown' })
  assert.equal(detectLanguage('LICENSE').id, 'unknown')
  assert.equal(detectLanguage('.hidden').id, 'unknown')
})

test('detects well-known file names', () => {
  assert.equal(detectLanguage('Dockerfile').id, 'dockerfile')
  assert.equal(detectLanguage('docker/Dockerfile.dev').id, 'dockerfile')
  assert.equal(detectLanguage('Makefile').id, 'make')
})

test('detects shebangs for extensionless files only', () => {
  assert.equal(detectLanguage('bin/tool', '#!/usr/bin/env node').id, 'javascript')
  assert.equal(detectLanguage('bin/tool', '#!/usr/bin/env python3').id, 'python')
  assert.equal(detectLanguage('bin/tool', '#!/usr/bin/env -S node --flag').id, 'javascript')
  assert.equal(detectLanguage('bin/tool', '#!/bin/bash').id, 'shell')
  assert.equal(detectLanguage('bin/tool', '#!/usr/bin/perl').id, 'unknown')
  assert.equal(languageFromShebang('not a shebang'), undefined)
  assert.equal(detectLanguage('a.py', '#!/usr/bin/env node').id, 'python')
  assert.equal(needsShebangProbe('bin/tool'), true)
  assert.equal(needsShebangProbe('bin/tool.ts'), false)
  assert.equal(needsShebangProbe('Dockerfile'), false)
})
