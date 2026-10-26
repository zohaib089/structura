import { createHash } from 'node:crypto'
import { mkdir, open, rename } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { PRODUCT_SLUG } from '../brand.js'
import { LIMITS } from '../limits.js'
import { O_NOFOLLOW } from '../walker/safe-fs.js'
import type { AdapterParseResult, ExtractedReference, ExtractedSymbol } from '../adapters/adapter.js'

export interface CacheKey {
  contentHash: string
  adapterId: string
  adapterVersion: string
  grammarFingerprint: string
  /** Caps that change extraction output. A different cap is a miss, never a silent reuse. */
  limitsTag: string
}

interface StoredEntry {
  contentHash: string
  adapterId: string
  adapterVersion: string
  grammarFingerprint: string
  limitsTag: string
  result: AdapterParseResult
}

/**
 * Default cache directory: the OS user cache, keyed by the scan root's realpath.
 * It is outside the scan root unless the user passes `--cache-dir`.
 */
export function defaultCacheDir(rootRealpath: string): string {
  const xdg = process.env.XDG_CACHE_HOME
  const base = xdg !== undefined && xdg.trim().length > 0 ? xdg : join(homedir(), '.cache')
  const key = createHash('sha256').update(rootRealpath).digest('hex').slice(0, 24)
  return join(base, PRODUCT_SLUG, key)
}

export function isInsideRoot(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)
}

export function contentHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export function limitsTag(limits: { maxIdentifierLength: number; maxSymbolsPerFile: number; maxEdgesPerFile: number }): string {
  return `${limits.maxIdentifierLength}:${limits.maxSymbolsPerFile}:${limits.maxEdgesPerFile}`
}

function exceedsDepth(value: unknown, max: number, depth = 0): boolean {
  if (depth > max) return true
  if (Array.isArray(value)) return value.some(item => exceedsDepth(item, max, depth + 1))
  if (typeof value === 'object' && value !== null) return Object.values(value).some(item => exceedsDepth(item, max, depth + 1))
  return false
}

function isPos(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const pos = value as { line?: unknown; col?: unknown }
  return typeof pos.line === 'number' && Number.isSafeInteger(pos.line) && typeof pos.col === 'number' && Number.isSafeInteger(pos.col)
}

function isSpan(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const span = value as { start?: unknown; end?: unknown }
  return isPos(span.start) && isPos(span.end)
}

function isReference(value: unknown): value is ExtractedReference {
  if (typeof value !== 'object' || value === null) return false
  const ref = value as ExtractedReference
  return (ref.edgeType === 'imports' || ref.edgeType === 'reexports') &&
    (ref.importKind === 'static' || ref.importKind === 'dynamic' || ref.importKind === 'require') &&
    typeof ref.typeOnly === 'boolean' &&
    (ref.specifier === null || typeof ref.specifier === 'string') &&
    typeof ref.redacted === 'boolean' &&
    isSpan(ref.span)
}

function isSymbol(value: unknown): value is ExtractedSymbol {
  if (typeof value !== 'object' || value === null) return false
  const symbol = value as ExtractedSymbol
  return typeof symbol.qualifiedName === 'string' && typeof symbol.label === 'string' && typeof symbol.symbolKind === 'string' && typeof symbol.exported === 'boolean' && isSpan(symbol.span)
}

function isParseResult(value: unknown): value is AdapterParseResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as AdapterParseResult
  return Array.isArray(result.references) && result.references.every(isReference) &&
    Array.isArray(result.symbols) && result.symbols.every(isSymbol) &&
    typeof result.syntaxErrorCount === 'number' &&
    Array.isArray(result.syntaxErrors) &&
    result.omitted !== undefined &&
    typeof result.omitted.longNames === 'number' &&
    typeof result.omitted.symbols === 'number' &&
    typeof result.omitted.edges === 'number' &&
    typeof result.redactions === 'number'
}

function matches(entry: StoredEntry, key: CacheKey): boolean {
  return entry.contentHash === key.contentHash &&
    entry.adapterId === key.adapterId &&
    entry.adapterVersion === key.adapterVersion &&
    entry.grammarFingerprint === key.grammarFingerprint &&
    entry.limitsTag === key.limitsTag &&
    isParseResult(entry.result)
}

/**
 * Content-addressed extraction cache. Entries are JSON parsed with `JSON.parse` only, then validated.
 * A mismatch, a symlink, a deep document or a bad shape is a miss.
 */
export class ContentCache {
  hits = 0
  misses = 0

  constructor(readonly directory: string, private readonly enabled: boolean) {}

  private pathFor(hash: string): string {
    return join(this.directory, hash.slice(0, 2), `${hash}.json`)
  }

  async get(key: CacheKey): Promise<AdapterParseResult | undefined> {
    if (!this.enabled) return undefined
    let text: string
    try {
      const handle = await open(this.pathFor(key.contentHash), fsConstants.O_RDONLY | O_NOFOLLOW)
      try {
        const stats = await handle.stat()
        if (!stats.isFile() || stats.size > LIMITS.maxCacheEntryBytes.default) {
          this.misses += 1
          return undefined
        }
        text = await handle.readFile({ encoding: 'utf8' })
      } finally {
        await handle.close()
      }
    } catch {
      this.misses += 1
      return undefined
    }
    try {
      const parsed: unknown = JSON.parse(text)
      if (exceedsDepth(parsed, LIMITS.maxCacheJsonDepth.default) || typeof parsed !== 'object' || parsed === null) {
        this.misses += 1
        return undefined
      }
      const entry = parsed as StoredEntry
      if (!matches(entry, key)) {
        this.misses += 1
        return undefined
      }
      this.hits += 1
      return entry.result
    } catch {
      this.misses += 1
      return undefined
    }
  }

  async set(key: CacheKey, result: AdapterParseResult): Promise<void> {
    if (!this.enabled) return
    const target = this.pathFor(key.contentHash)
    const payload: StoredEntry = { ...key, result }
    const json = JSON.stringify(payload)
    if (Buffer.byteLength(json) > LIMITS.maxCacheEntryBytes.default) return
    await mkdir(dirname(target), { recursive: true })
    const temporary = `${target}.${process.pid}.tmp`
    const handle = await open(temporary, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | O_NOFOLLOW, 0o644)
    try {
      await handle.writeFile(json, 'utf8')
    } finally {
      await handle.close()
    }
    await rename(temporary, target)
  }
}
