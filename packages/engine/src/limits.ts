/**
 * Every numeric limit of the engine and CLI lives here (threat model section 6).
 * `DEFAULT_*` are PROPOSED defaults awaiting confirmation from the measured baseline;
 * `CEILING_*` are hard ceilings that no repo-controlled input (config file, .gitignore ...)
 * and no CLI flag can raise. Repo-controlled config may only LOWER a limit.
 */
export const KIB = 1024
export const MIB = 1024 * KIB

export const LIMITS = {
  /** Files larger than this are skipped (`too-large`) from the lstat size, never opened or hashed. */
  maxFileSizeBytes: { default: 1 * MIB, ceiling: 16 * MIB },
  /** Per-file parse budget (tree-sitter cancellation, then worker terminate). `skipped: timeout`. */
  parseTimeoutMs: { default: 5_000, ceiling: 120_000 },
  /** Walk depth below the root; deeper directories are skipped (`max-depth`). */
  maxDepth: { default: 256, ceiling: 1_024 },
  /** Path length in UTF-16 units; longer paths are skipped (`path-too-long`). */
  maxPathLength: { default: 4_096, ceiling: 4_096 },
  /** Files discovered (everything the walker visits, including ignored entries). Exceeding it is a hard failure, never a silent truncation. */
  maxFiles: { default: 250_000, ceiling: 2_000_000 },
  /** Identifier / id-segment length in UTF-16 units. Longer symbols are omitted and the file becomes `partial: name-too-long`. */
  maxIdentifierLength: { default: 1_024, ceiling: 1_024 },
  /** Lines longer than this are not analysed further... recorded as `partial: name-too-long` only when an identifier is omitted. */
  maxLineLength: { default: 100_000, ceiling: 1_000_000 },
  /** Per-file symbol / edge caps; excess are dropped and the file becomes `partial` (`too-many-symbols` / `too-many-edges`). */
  maxSymbolsPerFile: { default: 20_000, ceiling: 100_000 },
  maxEdgesPerFile: { default: 20_000, ceiling: 100_000 },
  /** Config / ignore / manifest files (tsconfig, package.json, .gitignore) larger than this are not read. */
  maxConfigFileBytes: { default: 1 * MIB, ceiling: 4 * MIB },
  /** Resolution loops: tsconfig `extends` chain, alias recursion. */
  maxResolutionDepth: { default: 16, ceiling: 16 },
  /** Cache: entry file size cap and JSON nesting cap. */
  maxCacheEntryBytes: { default: 4 * MIB, ceiling: 4 * MIB },
  maxCacheJsonDepth: { default: 32, ceiling: 32 },
  /** graph.json reader. */
  maxGraphBytes: { default: 150 * MIB, ceiling: 256 * MIB },
  maxGraphJsonDepth: { default: 64, ceiling: 64 },
  /** Worker recycling: after this many files, or when the worker's reported WASM+heap memory exceeds the ceiling. */
  workerMaxFiles: { default: 500, ceiling: 5_000 },
  workerMaxMemoryBytes: { default: 768 * MIB, ceiling: 2_048 * MIB },
  /** Parallel parse workers. */
  jobs: { default: 4, ceiling: 16 }
} as const

export type LimitName = keyof typeof LIMITS

export interface ResolvedLimits {
  maxFileSizeBytes: number
  parseTimeoutMs: number
  maxDepth: number
  maxPathLength: number
  maxFiles: number
  maxIdentifierLength: number
  maxLineLength: number
  maxSymbolsPerFile: number
  maxEdgesPerFile: number
  maxConfigFileBytes: number
  workerMaxFiles: number
  workerMaxMemoryBytes: number
  jobs: number
}

export type LimitOverrides = Partial<ResolvedLimits>

/** Where a requested value comes from. Repo config may only lower; the user (CLI flags) may raise up to the ceiling. */
export type LimitSource = 'user' | 'repo'

/** Resolves limits. A request outside (0, ceiling] is clamped; a `repo` request above the default is ignored. */
export function resolveLimits(user: LimitOverrides = {}, repo: LimitOverrides = {}): ResolvedLimits {
  const out = {} as Record<string, number>
  for (const name of Object.keys(LIMITS) as LimitName[]) {
    if (!(name in LIMITS) || name === 'maxResolutionDepth' || name === 'maxCacheEntryBytes' || name === 'maxCacheJsonDepth' || name === 'maxGraphBytes' || name === 'maxGraphJsonDepth') continue
    const { default: base, ceiling } = LIMITS[name]
    let value: number = base
    const requested = (user as Record<string, number | undefined>)[name]
    if (requested !== undefined && Number.isFinite(requested) && requested > 0) value = Math.min(Math.floor(requested), ceiling)
    const lowered = (repo as Record<string, number | undefined>)[name]
    if (lowered !== undefined && Number.isFinite(lowered) && lowered > 0) value = Math.min(value, Math.floor(lowered))
    out[name] = value
  }
  return out as unknown as ResolvedLimits
}
