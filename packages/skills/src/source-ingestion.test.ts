import assert from 'node:assert/strict'
import test from 'node:test'
import { sourceIngestion } from './source-ingestion.js'

test('always includes safety gates and no-execution requirements', () => {
  const result = sourceIngestion({ task: 'implementation', source: 'archive' })

  assert.equal(result.success, true)
  assert.ok(result.guidance.some(item => item.includes('Do not enable source acceptance')))
  assert.ok(result.guidance.some(item => item.includes('draft threat model')))
  assert.ok(result.guidance.some(item => item.includes('retention calculations as policy primitives')))
  assert.ok(result.guidance.some(item => item.includes('Never execute repository scripts')))
  assert.ok(result.guidance.some(item => item.includes('isolated job directory')))
  assert.ok(result.guidance.some(item => item.includes('Treat API and queue payloads as unknown')))
  assert.ok(result.guidance.some(item => item.includes('Reject duplicate identifiers')))
  assert.ok(result.guidance.some(item => item.includes('Metadata-only inventories may estimate language')))
  assert.ok(result.guidance.some(item => item.includes('analysis-job metadata schema')))
})

test('adds worker and review guidance for threat-sensitive changes', () => {
  const result = sourceIngestion({ task: 'review', source: 'worker' })

  assert.ok(result.guidance.some(item => item.includes('bounded resources')))
  assert.ok(result.guidance.some(item => item.includes('Trace source data across')))
})
