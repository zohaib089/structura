export const ANALYSIS_JOB_STATES = [
  'queued',
  'validating',
  'inventorying',
  'analyzing',
  'finalizing',
  'succeeded',
  'failed',
  'cancelled'
] as const

export type AnalysisJobStateName = typeof ANALYSIS_JOB_STATES[number]

export interface AnalysisJobState {
  state: AnalysisJobStateName
  progressPercent: number
  attempt: number
  maxAttempts: number
}

const progressByState: Partial<Record<AnalysisJobStateName, number>> = {
  queued: 0,
  validating: 5,
  inventorying: 20,
  analyzing: 60,
  finalizing: 90,
  succeeded: 100
}

const transitions: Record<AnalysisJobStateName, readonly AnalysisJobStateName[]> = {
  queued: ['validating', 'cancelled'],
  validating: ['inventorying', 'failed', 'cancelled'],
  inventorying: ['analyzing', 'failed', 'cancelled'],
  analyzing: ['finalizing', 'failed', 'cancelled'],
  finalizing: ['succeeded', 'failed', 'cancelled'],
  succeeded: [],
  failed: ['queued'],
  cancelled: []
}

export function transitionAnalysisJob(
  current: AnalysisJobState,
  nextState: AnalysisJobStateName
): AnalysisJobState {
  if (
    !Number.isInteger(current.attempt) ||
    !Number.isInteger(current.maxAttempts) ||
    current.attempt < 1 ||
    current.maxAttempts < 1 ||
    current.attempt > current.maxAttempts ||
    !Number.isInteger(current.progressPercent) ||
    current.progressPercent < 0 ||
    current.progressPercent > 100
  ) {
    throw new Error('Analysis job state has invalid attempt or progress values.')
  }

  if (!transitions[current.state].includes(nextState)) {
    throw new Error(`Analysis job cannot transition from ${current.state} to ${nextState}.`)
  }

  if (current.state === 'failed' && current.attempt >= current.maxAttempts) {
    throw new Error('Analysis job has exhausted its retry limit.')
  }

  if (nextState === 'queued') {
    return {
      ...current,
      state: 'queued',
      progressPercent: 0,
      attempt: current.attempt + 1
    }
  }

  return {
    ...current,
    state: nextState,
    progressPercent: progressByState[nextState] ?? current.progressPercent
  }
}
