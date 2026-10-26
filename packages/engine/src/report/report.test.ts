import assert from 'node:assert/strict'
import test from 'node:test'
import { AccountingError, buildCoverage, formatCoverageSummary } from './report.js'
import { strictFailures } from './strict.js'

test('coverage accounts for every discovered entry and sorts its lists', () => {
  const coverage = buildCoverage({
    discovered: 6,
    ignored: new Map([['default:node_modules', 1], ['hard:.git', 1]]),
    files: [
      { language: 'typescript', status: 'parsed' },
      { language: 'python', status: 'skipped', reason: 'unsupported-language' },
      { language: 'typescript', status: 'failed', reason: 'parser-error' }
    ],
    unnoded: [{ language: null, reason: 'unrepresentable-path' }],
    unresolved: [{ reason: 'not-found', count: 2 }, { reason: 'config-extends-unresolved', count: 1 }]
  })
  assert.equal(coverage.files.discovered, 6)
  assert.equal(coverage.files.parsed, 1)
  assert.equal(coverage.files.failed, 1)
  assert.equal(coverage.files.skipped, 2)
  assert.equal(coverage.files.ignored, 2)
  assert.deepEqual(coverage.accounting, { discovered: 6, accounted: 6 })
  assert.deepEqual(coverage.byLanguage.map(item => item.language), [null, 'python', 'typescript'])
  assert.deepEqual(coverage.skipped.map(item => item.reason), ['parser-error', 'unrepresentable-path', 'unsupported-language'])
  assert.equal(formatCoverageSummary(coverage).includes('discovered 6'), true)
  assert.equal(formatCoverageSummary(coverage).includes('accounting: 6 = 6'), true)
})

test('a silent drop throws before a graph can be written', () => {
  assert.throws(
    () => buildCoverage({ discovered: 3, ignored: new Map(), files: [{ language: 'typescript', status: 'parsed' }], unnoded: [], unresolved: [] }),
    (error: unknown) => error instanceof AccountingError && error.exitCode === 3
  )
})

test('strict mode fails on failed files and timeouts only by default', () => {
  const coverage = buildCoverage({
    discovered: 2,
    ignored: new Map(),
    files: [
      { language: 'typescript', status: 'partial', reason: 'syntax-errors' },
      { language: 'typescript', status: 'skipped', reason: 'timeout' }
    ],
    unnoded: [],
    unresolved: [{ reason: 'not-found', count: 4 }]
  })
  const failures = strictFailures(coverage)
  assert.deepEqual(failures, ['timeouts 1 exceed 0'])
  assert.equal(strictFailures(coverage, { maxFailed: 0, maxTimeout: 1, maxPartial: 0, maxUnresolved: 0 }).join('\n').includes('partial'), true)
})
