import { compareStrings } from '../graph/ids.js'
import type { Coverage, CoverageByLanguage, CoverageIgnored, CoverageReason } from '../graph/types.js'

export class AccountingError extends Error {
  readonly code = 'SILENT_DROP' as const
  readonly exitCode = 3
  constructor(message: string) {
    super(message)
    this.name = 'AccountingError'
  }
}

export interface CoverageFileInput {
  language: string | null
  status: 'parsed' | 'partial' | 'failed' | 'skipped'
  reason?: string
}

export interface CoverageInput {
  discovered: number
  ignored: Map<string, number>
  files: CoverageFileInput[]
  /** Entries that have no node (unrepresentable path, id collision, max depth). Counted as skipped. */
  unnoded: Array<{ language: string | null; reason: string }>
  unresolved: Array<{ reason: string; count: number }>
}

interface LanguageBucket {
  language: string | null
  parsed: number
  partial: number
  failed: number
  skipped: number
}

/**
 * Builds the coverage object embedded in graph.json.
 * Throws {@link AccountingError} (exit 3) when discovered entries do not equal the five buckets.
 * That failure is never overridable: a silent drop must not write a graph.
 */
export function buildCoverage(input: CoverageInput): Coverage {
  const files = { discovered: input.discovered, parsed: 0, partial: 0, failed: 0, skipped: 0, ignored: 0 }
  const byLanguage = new Map<string, LanguageBucket>()
  const reasons = new Map<string, number>()

  const bucket = (language: string | null): LanguageBucket => {
    const key = language ?? ''
    const existing = byLanguage.get(key)
    if (existing) return existing
    const created: LanguageBucket = { language, parsed: 0, partial: 0, failed: 0, skipped: 0 }
    byLanguage.set(key, created)
    return created
  }
  const countReason = (reason: string): void => {
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
  }

  for (const file of input.files) {
    files[file.status] += 1
    bucket(file.language)[file.status] += 1
    if ((file.status === 'skipped' || file.status === 'failed') && file.reason) countReason(file.reason)
  }
  for (const item of input.unnoded) {
    files.skipped += 1
    bucket(item.language).skipped += 1
    countReason(item.reason)
  }
  const ignored: CoverageIgnored[] = []
  for (const [rule, count] of input.ignored) {
    if (count <= 0) continue
    files.ignored += count
    ignored.push({ rule, count })
  }

  const accounted = files.parsed + files.partial + files.failed + files.skipped + files.ignored
  if (files.discovered !== accounted) {
    throw new AccountingError(`coverage accounting failed: discovered ${files.discovered} != accounted ${accounted} (parsed ${files.parsed}, partial ${files.partial}, failed ${files.failed}, skipped ${files.skipped}, ignored ${files.ignored})`)
  }

  const skipped: CoverageReason[] = [...reasons.entries()].map(([reason, count]) => ({ reason, count }))
  skipped.sort((left, right) => compareStrings(left.reason, right.reason))
  ignored.sort((left, right) => compareStrings(left.rule, right.rule))

  const unresolvedCounts = new Map<string, number>()
  for (const item of input.unresolved) {
    if (item.count <= 0) continue
    unresolvedCounts.set(item.reason, (unresolvedCounts.get(item.reason) ?? 0) + item.count)
  }
  const unresolved = [...unresolvedCounts.entries()].map(([reason, count]) => ({ reason, count }))
  unresolved.sort((left, right) => compareStrings(left.reason, right.reason))

  const languages: CoverageByLanguage[] = [...byLanguage.values()].sort((left, right) => compareStrings(left.language ?? '', right.language ?? ''))

  return {
    files,
    byLanguage: languages,
    skipped,
    ignored,
    unresolved,
    accounting: { discovered: files.discovered, accounted }
  }
}

/** Human-readable coverage summary for stdout. Stable field order, no timestamps. */
export function formatCoverageSummary(coverage: Coverage): string {
  const files = coverage.files
  const lines = [
    `files: discovered ${files.discovered}, parsed ${files.parsed}, partial ${files.partial}, failed ${files.failed}, skipped ${files.skipped}, ignored ${files.ignored}`
  ]
  if (coverage.skipped.length > 0) lines.push(`not parsed: ${coverage.skipped.map(item => `${item.reason} ${item.count}`).join(', ')}`)
  if (coverage.ignored.length > 0) lines.push(`ignored: ${coverage.ignored.map(item => `${item.rule} ${item.count}`).join(', ')}`)
  if (coverage.unresolved.length > 0) lines.push(`unresolved: ${coverage.unresolved.map(item => `${item.reason} ${item.count}`).join(', ')}`)
  lines.push(`accounting: ${coverage.accounting.discovered} = ${coverage.accounting.accounted}`)
  return lines.join('\n')
}
