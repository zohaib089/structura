import { constants as fsConstants } from 'node:fs'
import { open, rename, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AdapterParseResult } from '../adapters/adapter.js'
import { LIMITS } from '../limits.js'
import { O_NOFOLLOW } from '../walker/safe-fs.js'
import { contentHash, limitsTag, type CacheKey } from './content-cache.js'

export const SCAN_CACHE_FORMAT = 1

export interface ScanCacheHeader {
  engineVersion: string
  schemaHash: string
  limitsTag: string
  grammarFingerprint: string
}

interface StoredFileEntry {
  path: string
  contentHash: string
  adapterId: string
  adapterVersion: string
  result: AdapterParseResult
}

interface StoredDocument {
  format: number
  engineVersion: string
  schemaHash: string
  limitsTag: string
  grammarFingerprint: string
  files: StoredFileEntry[]
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

function isReference(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const ref = value as AdapterParseResult['references'][number]
  return (ref.edgeType === 'imports' || ref.edgeType === 'reexports') &&
    (ref.importKind === 'static' || ref.importKind === 'dynamic' || ref.importKind === 'require') &&
    typeof ref.typeOnly === 'boolean' &&
    (ref.specifier === null || typeof ref.specifier === 'string') &&
    typeof ref.redacted === 'boolean' &&
    isSpan(ref.span)
}

function isSymbol(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const symbol = value as AdapterParseResult['symbols'][number]
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

function headerMatches(doc: StoredDocument, expected: ScanCacheHeader): boolean {
  return doc.format === SCAN_CACHE_FORMAT &&
    doc.engineVersion === expected.engineVersion &&
    doc.schemaHash === expected.schemaHash &&
    doc.limitsTag === expected.limitsTag &&
    doc.grammarFingerprint === expected.grammarFingerprint
}

function isStoredFileEntry(value: unknown): value is StoredFileEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as StoredFileEntry
  return typeof entry.path === 'string' &&
    typeof entry.contentHash === 'string' &&
    typeof entry.adapterId === 'string' &&
    typeof entry.adapterVersion === 'string' &&
    isParseResult(entry.result)
}

function validateDocument(parsed: unknown, expected: ScanCacheHeader): StoredFileEntry[] | undefined {
  if (exceedsDepth(parsed, LIMITS.maxCacheJsonDepth.default) || typeof parsed !== 'object' || parsed === null) return undefined
  const doc = parsed as StoredDocument
  if (!headerMatches(doc, expected) || !Array.isArray(doc.files)) return undefined
  const files: StoredFileEntry[] = []
  for (const item of doc.files) {
    if (!isStoredFileEntry(item)) return undefined
    files.push(item)
  }
  return files
}

export function scanCacheHeader(
  engineVersion: string,
  schemaHash: string,
  limits: { maxIdentifierLength: number; maxSymbolsPerFile: number; maxEdgesPerFile: number },
  grammarFingerprint: string
): ScanCacheHeader {
  return {
    engineVersion,
    schemaHash,
    limitsTag: limitsTag(limits),
    grammarFingerprint
  }
}

/**
 * Per-path incremental scan cache stored as a single JSON manifest (default `<outDir>/cache.json`).
 */
export class IncrementalScanCache {
  hits = 0
  misses = 0
  removed = 0

  private readonly byPath = new Map<string, StoredFileEntry>()

  constructor(private readonly header: ScanCacheHeader) {}

  static async load(path: string, expected: ScanCacheHeader): Promise<IncrementalScanCache | undefined> {
    let text: string
    try {
      const handle = await open(path, fsConstants.O_RDONLY | O_NOFOLLOW)
      try {
        const stats = await handle.stat()
        if (!stats.isFile()) return undefined
        text = await handle.readFile({ encoding: 'utf8' })
      } finally {
        await handle.close()
      }
    } catch {
      return undefined
    }
    try {
      const parsed: unknown = JSON.parse(text)
      const files = validateDocument(parsed, expected)
      if (!files) return undefined
      const cache = new IncrementalScanCache(expected)
      for (const entry of files) cache.byPath.set(entry.path, entry)
      return cache
    } catch {
      return undefined
    }
  }

  lookup(path: string, hash: string, adapterId: string, adapterVersion: string): AdapterParseResult | undefined {
    const entry = this.byPath.get(path)
    if (!entry ||
      entry.contentHash !== hash ||
      entry.adapterId !== adapterId ||
      entry.adapterVersion !== adapterVersion) {
      this.misses += 1
      return undefined
    }
    this.hits += 1
    return entry.result
  }

  remember(path: string, key: CacheKey, result: AdapterParseResult): void {
    this.byPath.set(path, {
      path,
      contentHash: key.contentHash,
      adapterId: key.adapterId,
      adapterVersion: key.adapterVersion,
      result
    })
  }

  dropRemoved(currentPaths: ReadonlySet<string>): void {
    for (const path of this.byPath.keys()) {
      if (!currentPaths.has(path)) {
        this.byPath.delete(path)
        this.removed += 1
      }
    }
  }

  async save(path: string): Promise<void> {
    const files = [...this.byPath.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    const payload: StoredDocument = { format: SCAN_CACHE_FORMAT, ...this.header, files }
    const json = `${JSON.stringify(payload, null, 2)}\n`
    if (Buffer.byteLength(json) > LIMITS.maxCacheEntryBytes.default * 64) return
    await mkdirExclusive(dirname(path))
    const temporary = `${path}.${process.pid}.tmp`
    let handle
    try {
      handle = await open(temporary, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW, 0o644)
      await handle.writeFile(json, 'utf8')
      await handle.sync()
    } finally {
      await handle?.close()
    }
    try {
      await rename(temporary, path)
    } catch (error) {
      await unlink(temporary).catch(() => undefined)
      throw error
    }
  }
}

async function mkdirExclusive(dir: string): Promise<void> {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(dir, { recursive: true })
}
