import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAnalysisInventory } from './inventory-builder.js'

test('builds a deterministic, metadata-only inventory with language and file-kind estimates', () => {
  const result = buildAnalysisInventory({
    analysisId: 'analysis-1',
    snapshotId: 'snapshot-1',
    completedAt: '2026-10-21T12:00:00.000Z',
    files: [
      { path: 'src/main.ts', sizeBytes: 20 },
      { path: 'tests/main.test.ts', sizeBytes: 10 },
      { path: 'package.json', sizeBytes: 4 },
      { path: 'docs/guide.md', sizeBytes: 8 },
      { path: 'unknown/data.bin', sizeBytes: 2 }
    ]
  })

  assert.deepEqual(result.files.map(file => file.path), [
    'docs/guide.md',
    'package.json',
    'src/main.ts',
    'tests/main.test.ts',
    'unknown/data.bin'
  ])
  assert.deepEqual(result.files.map(file => [file.path, file.kind, file.languageId]), [
    ['docs/guide.md', 'documentation', null],
    ['package.json', 'manifest', null],
    ['src/main.ts', 'source', 'typescript'],
    ['tests/main.test.ts', 'test', 'typescript'],
    ['unknown/data.bin', 'other', null]
  ])
  assert.equal(result.fileCount, 5)
  assert.equal(result.totalBytes, 44)
  assert.equal(result.unsupportedFileCount, 3)
})

test('produces the same ordered inventory for the same metadata independent of input order', () => {
  const metadata = [
    { path: 'src/app.py', sizeBytes: 21 },
    { path: 'src/app.go', sizeBytes: 34 },
    { path: 'Dockerfile', sizeBytes: 5 }
  ]
  const shared = {
    analysisId: 'analysis-1',
    snapshotId: 'snapshot-1',
    completedAt: '2026-10-21T12:00:00.000Z'
  }

  assert.deepEqual(
    buildAnalysisInventory({ ...shared, files: metadata }),
    buildAnalysisInventory({ ...shared, files: [...metadata].reverse() })
  )
})

test('rejects unsafe paths, duplicate paths, invalid sizes, and invalid completion times', () => {
  const shared = {
    analysisId: 'analysis-1',
    snapshotId: 'snapshot-1',
    completedAt: '2026-10-21T12:00:00.000Z'
  }

  for (const files of [
    [{ path: '../outside.ts', sizeBytes: 1 }],
    [{ path: '/absolute.ts', sizeBytes: 1 }],
    [{ path: 'src\\outside.ts', sizeBytes: 1 }],
    [{ path: 'src/app.ts', sizeBytes: -1 }],
    [
      { path: 'src/app.ts', sizeBytes: 1 },
      { path: 'src/app.ts', sizeBytes: 1 }
    ]
  ]) {
    assert.throws(() => buildAnalysisInventory({ ...shared, files }))
  }

  assert.throws(() => buildAnalysisInventory({
    ...shared,
    completedAt: 'not-a-date',
    files: []
  }))
})

test('does not accept or expose source contents', () => {
  const result = buildAnalysisInventory({
    analysisId: 'analysis-1',
    snapshotId: 'snapshot-1',
    completedAt: '2026-10-21T12:00:00.000Z',
    files: [{
      path: 'src/secret.ts',
      sizeBytes: 17,
      content: 'must not enter inventory'
    } as { path: string; sizeBytes: number }]
  })

  assert.equal('content' in result.files[0]!, false)
})
