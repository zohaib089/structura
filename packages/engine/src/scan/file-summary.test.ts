import assert from 'node:assert/strict'
import test from 'node:test'
import { collapseFileSummary, extractFileSummary } from './file-summary.js'

test('extractFileSummary reads JS block and line header comments', () => {
  assert.equal(
    extractFileSummary('/** Module docs */\nexport function main() {}\n', 'typescript'),
    'Module docs'
  )
  assert.equal(
    extractFileSummary('// line one\n// line two\nconst x = 1\n', 'javascript'),
    'line one line two'
  )
})

test('extractFileSummary reads Python module docstrings and hash comments', () => {
  assert.equal(extractFileSummary('"""Package entry."""\n\ndef run():\n  pass\n', 'python'), 'Package entry.')
  assert.equal(extractFileSummary('# note one\n# note two\nx = 1\n', 'python'), 'note one note two')
})

test('collapseFileSummary caps at 300 characters', () => {
  const long = 'a'.repeat(400)
  assert.equal(collapseFileSummary(long).length, 300)
})

test('extractFileSummary skips shebang before comments', () => {
  assert.equal(
    extractFileSummary('#!/usr/bin/env node\n// hello\nexport {}\n', 'javascript'),
    'hello'
  )
})
