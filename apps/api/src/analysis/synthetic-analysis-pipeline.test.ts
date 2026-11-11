import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ANALYSIS_CONTRACT_VERSION,
  parseAnalysisProgressEvent,
  parseAnalysisRequest,
  type AnalysisProgressCode
} from './analysis-contracts.js'
import { transitionAnalysisJob, type AnalysisJobStateName } from './analysis-job-state.js'
import { buildAnalysisInventory } from './inventory-builder.js'

const completedAt = '2026-10-21T00:00:00.000Z'
const fixtureFiles = [
  { path: 'src/app.ts', sizeBytes: 240 },
  { path: 'tests/app.test.ts', sizeBytes: 120 },
  { path: 'package.json', sizeBytes: 80 },
  { path: 'docs/overview.md', sizeBytes: 60 },
  { path: 'assets/sample.bin', sizeBytes: 16 }
] as const

test('runs the analysis lifecycle using synthetic metadata only', () => {
  const request = parseAnalysisRequest({
    contractVersion: ANALYSIS_CONTRACT_VERSION,
    analysisId: 'synthetic-analysis-1',
    projectId: 'synthetic-project-1',
    snapshotId: 'synthetic-snapshot-1',
    requestedBy: 'synthetic-test',
    idempotencyKey: 'synthetic-pipeline-test-1',
    analyzerVersions: [{ analyzerId: 'metadata-inventory', version: '1.0.0' }],
    createdAt: completedAt
  })
  const inventory = buildAnalysisInventory({
    analysisId: request.analysisId,
    snapshotId: request.snapshotId,
    files: fixtureFiles,
    completedAt
  })

  assert.deepEqual(inventory.files.map(file => [file.path, file.kind, file.languageId]), [
    ['assets/sample.bin', 'other', null],
    ['docs/overview.md', 'documentation', null],
    ['package.json', 'manifest', null],
    ['src/app.ts', 'source', 'typescript'],
    ['tests/app.test.ts', 'test', 'typescript']
  ])
  assert.equal(inventory.fileCount, 5)
  assert.equal(inventory.totalBytes, 516)
  assert.equal(inventory.unsupportedFileCount, 3)

  let job = {
    state: 'queued' as AnalysisJobStateName,
    progressPercent: 0,
    attempt: 1,
    maxAttempts: 1
  }
  const progress: Array<{
    state: AnalysisJobStateName
    progressPercent: number
    code: AnalysisProgressCode
  }> = []
  const record = (code: AnalysisProgressCode) => {
    progress.push({ state: job.state, progressPercent: job.progressPercent, code })
  }
  const transition = (state: AnalysisJobStateName, code: AnalysisProgressCode) => {
    job = transitionAnalysisJob(job, state)
    record(code)
  }

  transition('validating', 'snapshot_validation_started')
  record('snapshot_validation_completed')
  transition('inventorying', 'inventory_started')
  record('inventory_completed')
  transition('analyzing', 'analysis_started')
  record('analysis_completed')
  transition('finalizing', 'finalization_started')
  transition('succeeded', 'analysis_succeeded')

  const events = progress.map((event, index) => parseAnalysisProgressEvent({
    contractVersion: ANALYSIS_CONTRACT_VERSION,
    analysisId: request.analysisId,
    sequence: index + 1,
    ...event,
    occurredAt: completedAt
  }))

  assert.equal(events.length, 8)
  assert.deepEqual(events.map(event => event.code), [
    'snapshot_validation_started',
    'snapshot_validation_completed',
    'inventory_started',
    'inventory_completed',
    'analysis_started',
    'analysis_completed',
    'finalization_started',
    'analysis_succeeded'
  ])
  assert.equal(events.at(-1)?.state, 'succeeded')
  assert.equal(events.at(-1)?.progressPercent, 100)
})
