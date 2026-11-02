export interface SourceIngestLimits {
  maxRepoBytes: number
  maxUncompressedBytes: number
  maxFileCount: number
  timeoutMs: number
}

export const DEFAULT_SOURCE_INGEST_LIMITS: SourceIngestLimits = {
  maxRepoBytes: 200 * 1024 * 1024,
  maxUncompressedBytes: 200 * 1024 * 1024,
  maxFileCount: 50_000,
  timeoutMs: 5 * 60 * 1000
}

export function resolveSourceIngestLimits(
  overrides: Partial<SourceIngestLimits> = {}
): SourceIngestLimits {
  return {
    maxRepoBytes: positiveInt(overrides.maxRepoBytes, DEFAULT_SOURCE_INGEST_LIMITS.maxRepoBytes),
    maxUncompressedBytes: positiveInt(
      overrides.maxUncompressedBytes,
      DEFAULT_SOURCE_INGEST_LIMITS.maxUncompressedBytes
    ),
    maxFileCount: positiveInt(overrides.maxFileCount, DEFAULT_SOURCE_INGEST_LIMITS.maxFileCount),
    timeoutMs: positiveInt(overrides.timeoutMs, DEFAULT_SOURCE_INGEST_LIMITS.timeoutMs)
  }
}

function positiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback
  if (!Number.isSafeInteger(value) || value < 1) return fallback
  return value
}

export function limitsFromEnv(env: NodeJS.ProcessEnv = process.env): SourceIngestLimits {
  return resolveSourceIngestLimits({
    maxRepoBytes: readEnvInt(env.SCAN_MAX_REPO_BYTES),
    maxUncompressedBytes: readEnvInt(env.SCAN_MAX_UNCOMPRESSED_BYTES),
    maxFileCount: readEnvInt(env.SCAN_MAX_FILE_COUNT),
    timeoutMs: readEnvInt(env.SCAN_TIMEOUT_MS)
  })
}

function readEnvInt(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed < 1) return undefined
  return parsed
}
