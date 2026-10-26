import type { Coverage } from '../graph/types.js'

/**
 * `--strict` thresholds. Defaults fail the scan only when a file failed or timed out.
 * Partial files and unresolved edges are reported and do not fail unless a caller lowers these caps.
 */
export interface StrictThresholds {
  maxFailed: number
  maxTimeout: number
  maxPartial: number
  maxUnresolved: number
}

export const DEFAULT_STRICT_THRESHOLDS: StrictThresholds = {
  maxFailed: 0,
  maxTimeout: 0,
  maxPartial: Number.POSITIVE_INFINITY,
  maxUnresolved: Number.POSITIVE_INFINITY
}

export class StrictCoverageError extends Error {
  readonly code = 'STRICT_COVERAGE' as const
  readonly exitCode = 4
  constructor(readonly failures: readonly string[]) {
    super(failures.join('; '))
    this.name = 'StrictCoverageError'
  }
}

/** Messages for thresholds that the coverage report misses. Empty means `--strict` passes. */
export function strictFailures(coverage: Coverage, thresholds: StrictThresholds = DEFAULT_STRICT_THRESHOLDS): string[] {
  const failures: string[] = []
  if (coverage.files.failed > thresholds.maxFailed) {
    failures.push(`failed files ${coverage.files.failed} exceed ${thresholds.maxFailed}`)
  }
  const timeouts = coverage.skipped.find(item => item.reason === 'timeout')?.count ?? 0
  if (timeouts > thresholds.maxTimeout) failures.push(`timeouts ${timeouts} exceed ${thresholds.maxTimeout}`)
  if (coverage.files.partial > thresholds.maxPartial) {
    failures.push(`partial files ${coverage.files.partial} exceed ${thresholds.maxPartial}`)
  }
  const unresolved = coverage.unresolved.reduce((total, item) => total + item.count, 0)
  if (unresolved > thresholds.maxUnresolved) failures.push(`unresolved references ${unresolved} exceed ${thresholds.maxUnresolved}`)
  return failures
}
