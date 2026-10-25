import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ANALYSIS_JOB_STATES,
  transitionAnalysisJob,
  type AnalysisJobState
} from './analysis-job-state.js'

function state(overrides: Partial<AnalysisJobState> = {}): AnalysisJobState {
  return {
    state: 'queued',
    progressPercent: 0,
    attempt: 1,
    maxAttempts: 3,
    ...overrides
  }
}

test('defines the analysis lifecycle from queued through completion', () => {
  assert.deepEqual(ANALYSIS_JOB_STATES, [
    'queued',
    'validating',
    'inventorying',
    'analyzing',
    'finalizing',
    'succeeded',
    'failed',
    'cancelled'
  ])

  let job = state()
  for (const [nextState, progress] of [
    ['validating', 5],
    ['inventorying', 20],
    ['analyzing', 60],
    ['finalizing', 90],
    ['succeeded', 100]
  ] as const) {
    job = transitionAnalysisJob(job, nextState)
    assert.equal(job.progressPercent, progress)
  }
})

test('allows retry after failure while attempts remain and resets progress', () => {
  const retry = transitionAnalysisJob(state({
    state: 'failed',
    progressPercent: 60,
    attempt: 1
  }), 'queued')

  assert.deepEqual(retry, {
    state: 'queued',
    progressPercent: 0,
    attempt: 2,
    maxAttempts: 3
  })
})

test('rejects invalid transitions and retries after the attempt limit', () => {
  assert.throws(
    () => transitionAnalysisJob(state(), 'succeeded'),
    /cannot transition from queued to succeeded/
  )
  assert.throws(
    () => transitionAnalysisJob(state({
      state: 'failed',
      attempt: 3
    }), 'queued'),
    /exhausted its retry limit/
  )
  assert.throws(
    () => transitionAnalysisJob(state({ progressPercent: 101 }), 'validating'),
    /invalid attempt or progress/
  )
})

test('keeps failed and cancelled jobs terminal except for an allowed retry', () => {
  const failed = transitionAnalysisJob(state({
    state: 'analyzing',
    progressPercent: 60
  }), 'failed')
  assert.equal(failed.progressPercent, 60)

  const cancelled = transitionAnalysisJob(state(), 'cancelled')
  assert.equal(cancelled.state, 'cancelled')
  assert.throws(
    () => transitionAnalysisJob(cancelled, 'validating'),
    /cannot transition from cancelled to validating/
  )
})
