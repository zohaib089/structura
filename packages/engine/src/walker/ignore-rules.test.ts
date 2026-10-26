import assert from 'node:assert/strict'
import test from 'node:test'
import { IGNORE_FILE } from '../brand.js'
import { IgnoreStack, ruleLabel } from './ignore-rules.js'

test('default list ignores dependency and build directories', () => {
  const stack = IgnoreStack.create()
  assert.equal(stack.test('node_modules', true).ignored, true)
  assert.equal(stack.test('apps/web/node_modules', true).ignored, true)
  assert.equal(stack.test('dist', true).ignored, true)
  assert.equal(stack.test('src/index.ts', false).ignored, false)
  assert.equal(ruleLabel(stack.test('dist', true)), 'default:dist')
  assert.equal(ruleLabel(stack.test('node_modules', true)), 'default:node_modules')
})

test('defaults can be disabled', () => {
  assert.equal(IgnoreStack.create([], false).test('node_modules', true).ignored, false)
})

test('nested ignore files apply relative to their directory and deeper files win', () => {
  const stack = IgnoreStack.create([], false)
    .with('', '.gitignore', '*.log\n/secret.txt\n')
    .with('pkg', '.gitignore', '!keep.log\n/local.txt\n')
  assert.equal(stack.test('a.log', false).ignored, true)
  assert.equal(stack.test('pkg/b.log', false).ignored, true)
  assert.equal(stack.test('pkg/keep.log', false).ignored, false)
  assert.equal(stack.test('secret.txt', false).ignored, true)
  assert.equal(stack.test('pkg/secret.txt', false).ignored, false, 'anchored pattern only matches at its own base')
  assert.equal(stack.test('pkg/local.txt', false).ignored, true)
  assert.equal(stack.test('other/local.txt', false).ignored, false)
  assert.equal(ruleLabel(stack.test('pkg/local.txt', false)), 'gitignore:/local.txt')
  assert.equal(ruleLabel(stack.test('secret.txt', false)), 'gitignore:/secret.txt')
})

test('a later tool ignore file at the same level outranks gitignore and can re-include defaults', () => {
  const stack = IgnoreStack.create()
    .with('', '.gitignore', 'docs/\n')
    .with('', IGNORE_FILE, '!docs/\n!dist/\n')
  assert.equal(stack.test('docs', true).ignored, false)
  assert.equal(stack.test('dist', true).ignored, false)
})

test('directory-only patterns do not match files of the same name', () => {
  const stack = IgnoreStack.create([], false).with('', '.gitignore', 'build/\n')
  assert.equal(stack.test('build', true).ignored, true)
  assert.equal(stack.test('build', false).ignored, false)
})
