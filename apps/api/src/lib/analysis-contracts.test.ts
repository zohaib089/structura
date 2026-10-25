import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ANALYSIS_CONTRACT_VERSION,
  ANALYSIS_SOURCE_KINDS,
  parseAnalysisInventoryResult,
  parseAnalysisRequest,
  parseAnalysisProgressEvent,
  parseSourceSnapshotManifest
} from './analysis-contracts.js'

test('exports versioned, language-neutral source and analysis contract types', () => {
  assert.equal(ANALYSIS_CONTRACT_VERSION, '1.0.0')
  assert.deepEqual(ANALYSIS_SOURCE_KINDS, ['archive', 'single-file', 'github', 'gitlab'])
})

test('parses only supported progress fields and discards unexpected payload properties', () => {
  const event = parseAnalysisProgressEvent({
    contractVersion: '1.0.0',
    analysisId: 'analysis-1',
    sequence: 2,
    state: 'inventorying',
    progressPercent: 20,
    code: 'inventory_started',
    occurredAt: '2026-10-21T12:00:00.000Z',
    message: 'source content must not be forwarded'
  })

  assert.deepEqual(event, {
    contractVersion: '1.0.0',
    analysisId: 'analysis-1',
    sequence: 2,
    state: 'inventorying',
    progressPercent: 20,
    code: 'inventory_started',
    occurredAt: '2026-10-21T12:00:00.000Z'
  })
  assert.equal('message' in event, false)
})

test('rejects invalid progress event versions, states, codes, and sequence values', () => {
  const validEvent = {
    contractVersion: '1.0.0',
    analysisId: 'analysis-1',
    sequence: 1,
    state: 'queued',
    progressPercent: 0,
    code: 'snapshot_validation_started',
    occurredAt: '2026-10-21T12:00:00.000Z'
  }

  for (const invalidEvent of [
    { ...validEvent, contractVersion: '2.0.0' },
    { ...validEvent, state: 'unknown' },
    { ...validEvent, code: 'free-form-message' },
    { ...validEvent, sequence: 0 },
    { ...validEvent, progressPercent: 101 },
    { ...validEvent, occurredAt: 'not-a-date' }
  ]) {
    assert.throws(() => parseAnalysisProgressEvent(invalidEvent))
  }
})

test('parses a source manifest and drops undeclared metadata', () => {
  const manifest = parseSourceSnapshotManifest({
    contractVersion: '1.0.0',
    snapshotId: 'snapshot-1',
    projectId: 'project-1',
    sourceKind: 'archive',
    contentDigest: `sha256:${'a'.repeat(64)}`,
    fileCount: 2,
    totalBytes: 128,
    createdAt: '2026-10-21T12:00:00.000Z',
    privateSource: 'must not propagate'
  })

  assert.deepEqual(manifest, {
    contractVersion: '1.0.0',
    snapshotId: 'snapshot-1',
    projectId: 'project-1',
    sourceKind: 'archive',
    contentDigest: `sha256:${'a'.repeat(64)}`,
    fileCount: 2,
    totalBytes: 128,
    createdAt: '2026-10-21T12:00:00.000Z'
  })
})

test('rejects malformed snapshot identity, digest, counters, and source kind', () => {
  const valid = {
    contractVersion: '1.0.0',
    snapshotId: 'snapshot-1',
    projectId: 'project-1',
    sourceKind: 'archive',
    contentDigest: `sha256:${'a'.repeat(64)}`,
    fileCount: 2,
    totalBytes: 128,
    createdAt: '2026-10-21T12:00:00.000Z'
  }

  for (const invalid of [
    { ...valid, contractVersion: '2.0.0' },
    { ...valid, sourceKind: 'unknown' },
    { ...valid, contentDigest: 'sha256:not-a-digest' },
    { ...valid, fileCount: -1 },
    { ...valid, totalBytes: Number.MAX_SAFE_INTEGER + 1 },
    { ...valid, createdAt: 'not-a-date' }
  ]) {
    assert.throws(() => parseSourceSnapshotManifest(invalid))
  }
})

test('parses analysis requests with unique, explicit analyzer versions', () => {
  const request = parseAnalysisRequest({
    contractVersion: '1.0.0',
    analysisId: 'analysis-1',
    projectId: 'project-1',
    snapshotId: 'snapshot-1',
    requestedBy: 'user-1',
    idempotencyKey: 'request-key-1',
    analyzerVersions: [{ analyzerId: 'inventory', version: '1.2.0' }],
    createdAt: '2026-10-21T12:00:00.000Z',
    untrusted: 'must not propagate'
  })

  assert.equal(request.analyzerVersions[0]?.version, '1.2.0')
  assert.equal('untrusted' in request, false)
  assert.throws(() => parseAnalysisRequest({
    ...request,
    analyzerVersions: [
      { analyzerId: 'inventory', version: '1.2.0' },
      { analyzerId: 'inventory', version: '1.3.0' }
    ]
  }), /invalid analyzer version/)
})

test('validates inventory path safety, uniqueness, and computed totals', () => {
  const valid = {
    contractVersion: '1.0.0',
    analysisId: 'analysis-1',
    snapshotId: 'snapshot-1',
    fileCount: 2,
    totalBytes: 12,
    unsupportedFileCount: 1,
    files: [
      { path: 'src/index.ts', sizeBytes: 10, kind: 'source', languageId: 'typescript' },
      { path: 'assets/logo.bin', sizeBytes: 2, kind: 'other', languageId: null }
    ],
    completedAt: '2026-10-21T12:00:00.000Z',
    extra: 'must not propagate'
  }

  const inventory = parseAnalysisInventoryResult(valid)
  assert.equal(inventory.files.length, 2)
  assert.equal('extra' in inventory, false)

  for (const invalid of [
    { ...valid, files: [{ ...valid.files[0], path: '../outside.ts' }, valid.files[1]] },
    { ...valid, files: [{ ...valid.files[0], path: '/absolute.ts' }, valid.files[1]] },
    { ...valid, files: [{ ...valid.files[0], path: 'src\\index.ts' }, valid.files[1]] },
    { ...valid, files: [valid.files[0], valid.files[0]] },
    { ...valid, totalBytes: 99 },
    { ...valid, unsupportedFileCount: 0 }
  ]) {
    assert.throws(() => parseAnalysisInventoryResult(invalid))
  }
})
