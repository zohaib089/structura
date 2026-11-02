import { LIMITS, type LimitOverrides, type ResolvedLimits } from '../limits.js'

const LOWERABLE = new Set<keyof ResolvedLimits>([
  'maxFileSizeBytes',
  'parseTimeoutMs',
  'maxDepth',
  'maxPathLength',
  'maxFiles',
  'maxIdentifierLength',
  'maxLineLength',
  'maxSymbolsPerFile',
  'maxEdgesPerFile',
  'maxConfigFileBytes',
  'workerMaxFiles',
  'workerMaxMemoryBytes',
  'jobs'
])

/**
 * Reads the numeric subset of the repo config. This is intentionally not a YAML parser:
 * only `key: integer` lines are accepted, unknown keys are ignored, and nothing here can
 * name a hard exclude or raise a ceiling. {@link resolveLimits} still clamps repo values downward.
 */
export function parseRepoLimits(text: string): LimitOverrides {
  const out: LimitOverrides = {}
  for (const raw of text.split(/\n/)) {
    const line = raw.replace(/\r$/, '').trim()
    if (line === '' || line.startsWith('#')) continue
    const match = /^([A-Za-z][A-Za-z0-9]*):\s*([0-9]+)\s*(?:#.*)?$/.exec(line)
    if (!match) continue
    const key = match[1] as keyof ResolvedLimits
    if (!LOWERABLE.has(key) || !(key in LIMITS)) continue
    out[key] = Number(match[2])
  }
  return out
}
