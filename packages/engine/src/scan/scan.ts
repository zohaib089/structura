import { readFileSync } from 'node:fs'
import { constants as fsConstants } from 'node:fs'
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG_FILE, CACHE_FILE, GRAPH_FILE, OUT_DIR, PRODUCT_NAME, RUN_FILE } from '../brand.js'
import { ContentCache, contentHash, defaultCacheDir, isInsideRoot, limitsTag } from '../cache/content-cache.js'
import { IncrementalScanCache, scanCacheHeader } from '../cache/scan-cache.js'
import { buildCoverage, formatCoverageSummary, strictFailures } from '../report/index.js'
import type { AdapterParseResult, ExtractedReference, LanguageAdapter, ResolveOutcome } from '../adapters/adapter.js'
import { ParsePool } from '../adapters/pool.js'
import { grammarFingerprint } from '../adapters/tree-sitter-runtime.js'
import { TS_JS_ADAPTER_ID, TS_JS_ADAPTER_VERSION, createTypeScriptJavaScriptAdapter } from '../adapters/ts-js/adapter.js'
import { TsJsResolver } from '../adapters/ts-js/resolver.js'
import { PYTHON_ADAPTER_ID, PYTHON_ADAPTER_VERSION, createPythonAdapter } from '../adapters/python/adapter.js'
import { PythonResolver } from '../adapters/python/resolver.js'
import { GraphBuilder } from '../graph/builder.js'
import { GraphVersionUnsupported } from '../graph/errors.js'
import { serializeGraph } from '../graph/canonical.js'
import { readCheckedInSchemaHash } from '../graph/hash.js'
import { readGraph } from '../graph/read.js'
import { validateStrict } from '../graph/validate-strict.js'
import { ROOT_DIR_ID, ROOT_PATH, baseName, dirId, externalId, fileId, parentPath, symbolId, unresolvedId } from '../graph/ids.js'
import type {
  ContainsEdge,
  EntryCandidate,
  EntryCandidateDetail,
  FailReason,
  FileNode,
  Graph,
  GraphEdge,
  InferredReason,
  ParseInfo,
  PartialReason,
  SkipReason,
  SymbolNode
} from '../graph/types.js'
import { resolveLimits, type LimitOverrides, type ResolvedLimits } from '../limits.js'
import { O_NOFOLLOW, readConfigText } from '../walker/safe-fs.js'
import { MaxFilesExceeded, ScanRootError, readWalkedFile, walkRepository, type WalkFile, type WalkResult } from '../walker/walk.js'
import { truncateCodePoints } from '../text/unicode.js'
import { decodeSource } from './decode.js'
import { findEntryCandidates, readJsonValue } from './entries.js'
import { parseRepoLimits } from './repo-limits.js'

/** Specifier stored for a non-literal import. It is a marker, not source text. The edge stays EXTRACTED. */
export const NON_LITERAL_SPECIFIER = '<non-literal>'

export class OutputRefusedError extends Error {
  readonly code = 'OUTPUT_REFUSED' as const
  readonly exitCode = 2
  constructor(message: string) {
    super(message)
    this.name = 'OutputRefusedError'
  }
}

export class InterruptedError extends Error {
  readonly code = 'INTERRUPTED' as const
  readonly exitCode = 130
  constructor() {
    super('scan interrupted')
    this.name = 'InterruptedError'
  }
}

const pendingOutputTemps = new Set<string>()

/** Removes incomplete graph/run temp files (for example after SIGINT). */
export async function discardOutputTemps(): Promise<void> {
  await Promise.all([...pendingOutputTemps].map(path => unlink(path).catch(() => undefined)))
  pendingOutputTemps.clear()
}

export interface RunMeta {
  product: string
  version: string
  command: 'scan'
  root: string
  graphPath: string
  startedAt: string
  finishedAt: string
  elapsedMs: number
  limits: ResolvedLimits
  cache: {
    enabled: boolean
    directory?: string
    manifest?: string
    hits: number
    misses: number
    removed: number
    extractionHits: number
    extractionMisses: number
  }
  redactions: number
  /** Edges dropped because a static and a type-only (or other) edge shared the uniqueness key. */
  collapsedEdges: number
  strictFailures: string[]
  memory: { heapUsed: number; rss: number; external: number }
}

export interface ScanOptions {
  outDir?: string
  /** When set, graph bytes are written here instead of `<outDir>/graph.json`. */
  graphPath?: string
  /** A path writes run.json there. `null` skips the file. Omitted writes it next to graph.json. */
  metaPath?: string | null
  include?: readonly string[]
  cacheDir?: string
  /** Incremental rescan manifest path. Default: `<outDir>/cache.json`. */
  cachePath?: string
  noCache?: boolean
  verbose?: boolean
  strict?: boolean
  limits?: LimitOverrides
  respectGitignore?: boolean
  useDefaultIgnores?: boolean
  extraIgnorePatterns?: readonly string[]
  signal?: AbortSignal
}

export interface ScanOutput {
  graph: Graph
  graphJson: string
  graphPath: string
  run: RunMeta
  runPath?: string
  strictFailures: string[]
  summary: string
  elapsedMs: number
  root: string
}

interface FileRecord {
  path: string
  language: string | null
  status: 'parsed' | 'partial' | 'failed' | 'skipped'
  reason?: string
  lineCount: number | null
  lossy: boolean
  entry?: EntryCandidate
  entryCandidates?: EntryCandidateDetail[]
}

function engineVersion(): string {
  try {
    const parsed = JSON.parse(readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')) as { version?: string }
    return typeof parsed.version === 'string' ? parsed.version : '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function contains(source: string, target: string): ContainsEdge {
  return { source, type: 'contains', target, provenance: 'EXTRACTED' }
}

function applyFlags(edge: GraphEdge, reference: ExtractedReference): GraphEdge {
  if (!('span' in edge)) return edge
  if (reference.importKind !== 'static') edge.importKind = reference.importKind
  if (reference.typeOnly) edge.typeOnly = true
  return edge
}

function entrySummary(records: FileRecord[]): { files: number; candidates: number } | undefined {
  let files = 0
  let candidates = 0
  for (const record of records) {
    if (!record.entryCandidates || record.entryCandidates.length === 0) continue
    files += 1
    candidates += record.entryCandidates.length
  }
  return files === 0 ? undefined : { files, candidates }
}

function parseInfo(record: FileRecord): ParseInfo {
  if (record.status === 'parsed') return { status: 'parsed' }
  if (record.status === 'partial') return { status: 'partial', reason: record.reason as PartialReason }
  if (record.status === 'failed') return { status: 'failed', reason: record.reason as FailReason }
  return { status: 'skipped', reason: (record.reason ?? 'unsupported-language') as SkipReason }
}

function linkDirectory(builder: GraphBuilder, filePath: string): void {
  builder.addNode({ id: ROOT_DIR_ID, kind: 'directory', path: ROOT_PATH, label: ROOT_PATH })
  let currentParent = ROOT_DIR_ID
  const parent = parentPath(filePath)
  if (parent !== undefined && parent !== ROOT_PATH) {
    let acc = ''
    for (const segment of parent.split('/')) {
      acc = acc === '' ? segment : `${acc}/${segment}`
      const id = dirId(acc)
      builder.addNode({ id, kind: 'directory', path: acc, label: segment })
      builder.addEdge(contains(currentParent, id))
      currentParent = id
    }
  }
  builder.addEdge(contains(currentParent, fileId(filePath)))
}

const MAX_LABEL_CODE_POINTS = 4096
const MAX_SYMBOL_ID_UNITS = 8192

export function addSymbols(builder: GraphBuilder, filePath: string, facts: AdapterParseResult): boolean {
  const counts = new Map<string, number>()
  const firstId = new Map<string, string>()
  const created: Array<{ name: string; id: string }> = []
  let limitExceeded = false
  for (const symbol of facts.symbols) {
    const base = symbolId(filePath, symbol.qualifiedName)
    if (base.length > MAX_SYMBOL_ID_UNITS) {
      limitExceeded = true
      continue
    }
    const seen = (counts.get(base) ?? 0) + 1
    counts.set(base, seen)
    const id = seen === 1 ? base : `${base}~${seen}`
    if (id.length > MAX_SYMBOL_ID_UNITS) {
      limitExceeded = true
      continue
    }
    if (!firstId.has(symbol.qualifiedName)) firstId.set(symbol.qualifiedName, id)
    const node: SymbolNode = {
      id,
      kind: 'symbol',
      file: fileId(filePath),
      label: truncateCodePoints(symbol.label, MAX_LABEL_CODE_POINTS),
      symbolKind: symbol.symbolKind,
      exported: symbol.exported,
      span: symbol.span
    }
    builder.addNode(node)
    created.push({ name: symbol.qualifiedName, id })
  }
  for (const symbol of created) {
    const dot = symbol.name.lastIndexOf('.')
    const parentName = dot === -1 ? undefined : symbol.name.slice(0, dot)
    const parentId = parentName ? firstId.get(parentName) : undefined
    builder.addEdge(contains(parentId ?? fileId(filePath), symbol.id))
  }
  return limitExceeded
}

function rememberTarget(builder: GraphBuilder, outcome: ResolveOutcome, importer: string, specifier: string): { id: string; inferred?: { reason: InferredReason; confidence: number } } {
  if (outcome.kind === 'file') {
    if (outcome.provenance === 'INFERRED') return { id: fileId(outcome.path), inferred: { reason: outcome.reason, confidence: outcome.confidence } }
    return { id: fileId(outcome.path) }
  }
  if (outcome.kind === 'external') {
    const id = externalId(outcome.ecosystem, outcome.name)
    builder.addNode({ id, kind: 'external', ecosystem: outcome.ecosystem, label: outcome.name })
    return { id }
  }
  const id = unresolvedId(importer, specifier)
  builder.addNode({ id, kind: 'unresolved', label: specifier.length > 0 ? specifier : '<empty>', reason: outcome.reason })
  return { id }
}

async function assertReplaceable(path: string, kind: 'graph' | 'meta'): Promise<void> {
  let stats
  try {
    stats = await lstat(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  if (stats.isSymbolicLink()) throw new OutputRefusedError(`refusing to overwrite a symlink at ${path}`)
  if (!stats.isFile()) throw new OutputRefusedError(`refusing to overwrite a non-file at ${path}`)
  const text = await readFile(path, 'utf8')
  if (kind === 'graph') {
    try {
      readGraph(text)
    } catch (error) {
      if (error instanceof GraphVersionUnsupported) throw error
      throw new OutputRefusedError('refusing to overwrite a file that is not a graph.json document')
    }
    return
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) throw new OutputRefusedError('refusing to overwrite a file that is not a previous run.json')
    throw error
  }
  if (!isPreviousRunMeta(value)) throw new OutputRefusedError('refusing to overwrite a file that is not a previous run.json')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A previous run.json, recognised by shape. Any other file, including other JSON objects, is refused. */
function isPreviousRunMeta(value: unknown): boolean {
  if (!isRecord(value)) return false
  const cache = value.cache
  const memory = value.memory
  return value.command === 'scan'
    && typeof value.product === 'string'
    && typeof value.startedAt === 'string'
    && typeof value.finishedAt === 'string'
    && typeof value.elapsedMs === 'number'
    && typeof value.redactions === 'number'
    && typeof value.collapsedEdges === 'number'
    && Array.isArray(value.strictFailures)
    && isRecord(cache)
    && typeof cache.hits === 'number'
    && typeof cache.misses === 'number'
    && (cache.removed === undefined || typeof cache.removed === 'number')
    && (cache.extractionHits === undefined || typeof cache.extractionHits === 'number')
    && (cache.extractionMisses === undefined || typeof cache.extractionMisses === 'number')
    && isRecord(memory)
    && typeof memory.heapUsed === 'number'
    && typeof memory.rss === 'number'
    && typeof memory.external === 'number'
}

async function assertWritablePathComponents(rootAbs: string, targetPath: string): Promise<void> {
  const rel = relative(rootAbs, targetPath)
  if (rel.startsWith('..') || rel === '') return
  let acc = rootAbs
  for (const segment of rel.split(sep)) {
    acc = join(acc, segment)
    let stats
    try {
      stats = await lstat(acc)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    if (stats.isSymbolicLink()) throw new OutputRefusedError(`refusing to write through a symlink at ${acc}`)
  }
}

async function writeExclusive(path: string, contents: string, temporaries: string[]): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  temporaries.push(temporary)
  pendingOutputTemps.add(temporary)
  let handle
  try {
    handle = await open(temporary, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW, 0o644)
    await handle.writeFile(contents, 'utf8')
    await handle.sync()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ELOOP') throw new OutputRefusedError(`refusing to write through a symlink at ${path}`)
    throw error
  } finally {
    await handle?.close()
  }
  try {
    await rename(temporary, path)
    temporaries.pop()
    pendingOutputTemps.delete(temporary)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    pendingOutputTemps.delete(temporary)
    temporaries.pop()
    throw error
  }
}

async function preloadConfigs(walk: WalkResult, texts: Map<string, string>, maxBytes: number): Promise<void> {
  for (const file of walk.files) {
    const name = baseName(file.path)
    if (name !== 'package.json' && name !== 'tsconfig.json' && name !== 'jsconfig.json') continue
    if (texts.has(file.path)) continue
    const text = await readConfigText(file.absPath, maxBytes)
    if (text !== undefined) texts.set(file.path, text)
  }
}

function partialReason(result: AdapterParseResult, limitExceeded = false): PartialReason | undefined {
  if (limitExceeded) return 'limit-exceeded'
  if (result.omitted.symbols > 0) return 'too-many-symbols'
  if (result.omitted.edges > 0) return 'too-many-edges'
  if (result.omitted.longNames > 0) return 'name-too-long'
  if (result.syntaxErrorCount > 0) return 'syntax-errors'
  return undefined
}

const READ_FAILURES = new Set(['changed-during-scan', 'permission-denied', 'read-error', 'vanished', 'parser-error'])

interface AnalyseOutcome {
  record: FileRecord
  parsed?: AdapterParseResult
  redactions: number
}

async function analyseFile(
  file: WalkFile,
  limits: ResolvedLimits,
  adapter: LanguageAdapter,
  adapterId: string,
  adapterVersion: string,
  cache: ContentCache,
  fingerprint: string,
  tag: string,
  incremental?: IncrementalScanCache
): Promise<AnalyseOutcome> {
  const read = await readWalkedFile(file, limits.maxFileSizeBytes)
  if (!read.ok) {
    return {
      redactions: 0,
      record: {
        path: file.path,
        language: file.language,
        status: READ_FAILURES.has(read.reason) ? 'failed' : 'skipped',
        reason: read.reason,
        lineCount: null,
        lossy: false
      }
    }
  }
  if (read.binary) {
    return { redactions: 0, record: { path: file.path, language: file.language, status: 'skipped', reason: 'binary', lineCount: null, lossy: false } }
  }
  const decoded = decodeSource(read.content)
  const key = {
    contentHash: contentHash(read.content),
    adapterId,
    adapterVersion,
    grammarFingerprint: fingerprint,
    limitsTag: tag
  }
  let result = incremental?.lookup(file.path, key.contentHash, adapterId, adapterVersion)
  if (!result) {
    result = await cache.get(key)
    if (!result) {
      const outcome = await adapter.parse({
        path: file.path,
        content: decoded.text,
        language: file.language ?? 'typescript',
        limits: {
          maxIdentifierLength: limits.maxIdentifierLength,
          maxSymbolsPerFile: limits.maxSymbolsPerFile,
          maxEdgesPerFile: limits.maxEdgesPerFile
        },
        timeoutMs: limits.parseTimeoutMs,
        memoryLimitBytes: limits.workerMaxMemoryBytes
      })
      if (!outcome.ok) {
        const skipped = outcome.reason === 'timeout' || outcome.reason === 'memory-limit'
        return {
          redactions: 0,
          record: {
            path: file.path,
            language: file.language,
            status: skipped ? 'skipped' : 'failed',
            reason: outcome.reason === 'timeout' ? 'timeout' : outcome.reason === 'memory-limit' ? 'memory-limit' : 'parser-error',
            lineCount: decoded.lineCount,
            lossy: decoded.lossy
          }
        }
      }
      result = outcome.result
      await cache.set(key, result)
    }
    incremental?.remember(file.path, key, result)
  }
  const reason = partialReason(result)
  return {
    redactions: result.redactions,
    parsed: result,
    record: {
      path: file.path,
      language: file.language,
      status: reason ? 'partial' : 'parsed',
      ...(reason ? { reason } : {}),
      lineCount: decoded.lineCount,
      lossy: decoded.lossy
    }
  }
}

/**
 * Scans `root` into a canonical graph.json. Repository code is never executed.
 * Accounting failures throw before a file is written. `--strict` failures are returned after the write.
 */
export async function scanRepository(root: string, options: ScanOptions = {}): Promise<ScanOutput> {
  const started = Date.now()
  if (options.signal?.aborted) throw new InterruptedError()
  const rootInput = isAbsolute(root) ? root : resolve(root)
  let rootAbs: string
  try {
    rootAbs = await realpath(rootInput)
  } catch {
    throw new ScanRootError(`Cannot read scan root "${rootInput}": no such file or directory`)
  }
  const repoText = await readConfigText(join(rootAbs, CONFIG_FILE), resolveLimits().maxConfigFileBytes)
  const limits = resolveLimits(options.limits ?? {}, repoText ? parseRepoLimits(repoText) : {})
  const outDir = resolve(options.outDir ?? join(rootAbs, OUT_DIR))
  const graphPath = options.graphPath ? resolve(options.graphPath) : join(outDir, GRAPH_FILE)
  if (outDir === rootAbs && !options.graphPath) throw new OutputRefusedError('--out cannot be the scan root')
  const resolvedCacheDir = options.noCache ? undefined : resolve(options.cacheDir ?? defaultCacheDir(rootAbs))
  if (!options.noCache && !options.cacheDir && resolvedCacheDir && isInsideRoot(rootAbs, resolvedCacheDir)) {
    throw new OutputRefusedError('default cache directory would be inside the scan root; pass --cache-dir explicitly')
  }
  const cacheDirectory = options.noCache ? undefined : resolvedCacheDir
  const manifestPath = options.noCache ? undefined : resolve(options.cachePath ?? join(outDir, CACHE_FILE))
  const omitPaths: string[] = options.graphPath && outDir === rootAbs ? [graphPath] : [outDir]
  if (options.graphPath && outDir === rootAbs && options.metaPath !== null && options.metaPath === undefined) {
    omitPaths.push(join(outDir, RUN_FILE))
  }
  if (cacheDirectory && isInsideRoot(rootAbs, cacheDirectory)) omitPaths.push(cacheDirectory)
  if (manifestPath && isInsideRoot(rootAbs, manifestPath)) omitPaths.push(manifestPath)
  if (options.metaPath) {
    const metaAbs = resolve(options.metaPath)
    if (metaAbs !== rootAbs && isInsideRoot(rootAbs, metaAbs)) omitPaths.push(metaAbs)
  }

  let walk: WalkResult
  try {
    walk = await walkRepository(rootAbs, {
      limits,
      include: options.include,
      respectGitignore: options.respectGitignore,
      respectToolIgnore: false,
      useDefaultIgnores: options.useDefaultIgnores,
      extraIgnorePatterns: options.extraIgnorePatterns,
      omitPaths
    })
  } catch (error) {
    if (error instanceof MaxFilesExceeded || error instanceof ScanRootError) throw error
    throw error
  }

  const pool = new ParsePool(limits.jobs, { workerMaxFiles: limits.workerMaxFiles, workerMaxMemoryBytes: limits.workerMaxMemoryBytes })
  const tsAdapter = createTypeScriptJavaScriptAdapter({ pool })
  const pyAdapter = createPythonAdapter({ pool })
  const adapterFor = (language: string | null): { adapter: LanguageAdapter; id: string; version: string } => {
    if (language === 'python') return { adapter: pyAdapter, id: PYTHON_ADAPTER_ID, version: PYTHON_ADAPTER_VERSION }
    return { adapter: tsAdapter, id: TS_JS_ADAPTER_ID, version: TS_JS_ADAPTER_VERSION }
  }
  const cache = new ContentCache(cacheDirectory ?? defaultCacheDir(rootAbs), cacheDirectory !== undefined)
  const fingerprint = grammarFingerprint()
  const tag = limitsTag(limits)
  const incrementalHeader = scanCacheHeader(engineVersion(), readCheckedInSchemaHash(), limits, fingerprint)
  let incremental: IncrementalScanCache | undefined
  if (manifestPath) {
    incremental = await IncrementalScanCache.load(manifestPath, incrementalHeader) ?? new IncrementalScanCache(incrementalHeader)
  }
  const texts = new Map<string, string>()
  const records: FileRecord[] = []
  const parsed = new Map<string, AdapterParseResult>()
  let redactions = 0

  try {
    const analyseLanguages = new Set(walk.files.filter(item => item.disposition === 'analyse').map(item => item.language))
    if (analyseLanguages.size > 0) {
      if ([...analyseLanguages].some(lang => lang === 'typescript' || lang === 'javascript')) await tsAdapter.load()
      if (analyseLanguages.has('python')) await pyAdapter.load()
    }
    for (const file of walk.files) {
      if (options.signal?.aborted) throw new InterruptedError()
      if (file.disposition === 'skipped') {
        records.push({ path: file.path, language: file.language, status: 'skipped', reason: file.skipReason, lineCount: null, lossy: false })
        continue
      }
      const picked = adapterFor(file.language)
      const outcome = await analyseFile(file, limits, picked.adapter, picked.id, picked.version, cache, fingerprint, tag, incremental)
      redactions += outcome.redactions
      records.push(outcome.record)
      if (outcome.parsed) parsed.set(file.path, outcome.parsed)
    }
  } finally {
    await pool.shutdown()
  }

  if (incremental) {
    incremental.dropRemoved(new Set(walk.files.map(file => file.path)))
  }

  await preloadConfigs(walk, texts, limits.maxConfigFileBytes)
  const entries = findEntryCandidates(
    new Set(walk.files.map(file => file.path)),
    path => texts.get(path),
    path => readJsonValue(texts.get(path))
  )
  for (const record of records) {
    const entry = entries.get(record.path)
    if (entry) {
      record.entry = entry.primary
      record.entryCandidates = entry.candidates
    }
  }

  const builder = new GraphBuilder()
  builder.addNode({ id: ROOT_DIR_ID, kind: 'directory', path: ROOT_PATH, label: ROOT_PATH })
  for (const record of records) {
    linkDirectory(builder, record.path)
    const facts = parsed.get(record.path)
    if (facts) {
      const limitExceeded = addSymbols(builder, record.path, facts)
      if (limitExceeded) {
        record.status = 'partial'
        record.reason = partialReason(facts, true)
      }
    }
    const node: FileNode = {
      id: fileId(record.path),
      kind: 'file',
      path: record.path,
      label: baseName(record.path),
      language: record.language,
      lineCount: record.lineCount,
      parse: parseInfo(record),
      ...(record.lossy ? { decoding: 'lossy' as const } : {}),
      ...(record.entry ? { entryCandidate: record.entry } : {}),
      ...(record.entryCandidates && record.entryCandidates.length > 0 ? { entryCandidates: record.entryCandidates } : {})
    }
    builder.addNode(node)
  }

  const filesByPath = new Map(walk.files.map(file => [file.path, file]))
  const resolver = await TsJsResolver.create({
    files: new Set(filesByPath.keys()),
    ignoredPaths: walk.ignoredPaths,
    readText: async path => {
      const cached = texts.get(path)
      if (cached !== undefined) return cached
      // Extended configs (tsconfig.base.json and similar) are not named tsconfig.json, so they are
      // read on demand. Missing extended configs are skipped silently.
      const file = filesByPath.get(path)
      if (!file) return undefined
      const text = await readConfigText(file.absPath, limits.maxConfigFileBytes)
      if (text !== undefined) texts.set(path, text)
      return text
    }
  })
  const pythonResolver = PythonResolver.create({
    files: new Set(filesByPath.keys()),
    ignoredPaths: walk.ignoredPaths
  })

  const resolveReference = (reference: ExtractedReference, file: WalkFile, literal: string | null): ResolveOutcome => {
    if (literal === null) return { kind: 'unresolved', reason: 'non-literal-specifier' }
    if (file.language === 'python') {
      if (literal === '.' && reference.names?.length === 1) return pythonResolver.resolveFromDotImport(reference.names[0] as string, file.path)
      const outcome = pythonResolver.resolve(literal, file.path)
      if (outcome.kind === 'external' && pythonResolver.isTypeOnlyExternal(literal)) {
        reference.typeOnly = true
      }
      return outcome
    }
    return resolver.resolve(literal, file.path)
  }
  const unresolvedCounts = new Map<string, number>()
  const bump = (reason: string): void => {
    unresolvedCounts.set(reason, (unresolvedCounts.get(reason) ?? 0) + 1)
  }
  let collapsedEdges = 0

  for (const file of walk.files) {
    const facts = parsed.get(file.path)
    if (!facts) continue
    for (const reference of facts.references) {
      const literal = reference.specifier
      const outcome: ResolveOutcome = resolveReference(reference, file, literal)
      const edgeSpecifier = literal === null ? NON_LITERAL_SPECIFIER : literal
      const target = rememberTarget(builder, outcome, file.path, edgeSpecifier)
      // A non-literal import() is still an import site: EXTRACTED, importKind from the adapter, no confidence.
      const inferred = literal === null ? undefined : target.inferred
      const edge: GraphEdge = inferred
        ? {
          source: fileId(file.path),
          type: reference.edgeType,
          target: target.id,
          provenance: 'INFERRED',
          confidence: inferred.confidence,
          reason: inferred.reason,
          span: reference.span,
          specifier: edgeSpecifier
        }
        : {
          source: fileId(file.path),
          type: reference.edgeType,
          target: target.id,
          provenance: 'EXTRACTED',
          span: reference.span,
          specifier: edgeSpecifier
        }
      applyFlags(edge, reference)
      if (!builder.addEdge(edge)) {
        collapsedEdges += 1
        continue
      }
      if (outcome.kind === 'unresolved') bump(outcome.reason)
    }
  }
  for (const issue of resolver.configIssues) bump(issue.reason)

  const coverage = buildCoverage({
    discovered: walk.discovered,
    ignored: walk.ignored,
    files: records.map(record => ({ language: record.language, status: record.status, ...(record.reason ? { reason: record.reason } : {}) })),
    unnoded: walk.unnodedSkips.map(item => ({ language: item.language, reason: item.reason })),
    unresolved: [...unresolvedCounts.entries()].map(([reason, count]) => ({ reason, count }))
  })
  const graph = builder.build(coverage, entrySummary(records))
  const checked = validateStrict(graph)
  if (!checked.ok) {
    const first = checked.issues.slice(0, 8).map(issue => `${issue.path} ${issue.message}`).join('; ')
    throw new Error(`internal error: produced graph failed validation: ${first}`)
  }
  const graphJson = serializeGraph(graph)
  const failures = options.strict ? strictFailures(graph.coverage) : []
  const finished = Date.now()
  const memory = process.memoryUsage()
  const run: RunMeta = {
    product: PRODUCT_NAME,
    version: engineVersion(),
    command: 'scan',
    root: rootAbs,
    graphPath,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    elapsedMs: finished - started,
    limits,
    cache: {
      enabled: cacheDirectory !== undefined || manifestPath !== undefined,
      ...(cacheDirectory ? { directory: cacheDirectory } : {}),
      ...(manifestPath ? { manifest: manifestPath } : {}),
      hits: incremental?.hits ?? 0,
      misses: incremental?.misses ?? 0,
      removed: incremental?.removed ?? 0,
      extractionHits: cache.hits,
      extractionMisses: cache.misses
    },
    redactions,
    collapsedEdges,
    strictFailures: failures,
    memory: { heapUsed: memory.heapUsed, rss: memory.rss, external: memory.external }
  }

  const temporaries: string[] = []
  const removeTemps = async (): Promise<void> => {
    await Promise.all(temporaries.map(path => unlink(path).catch(() => undefined)))
  }
  if (options.signal?.aborted) {
    await removeTemps()
    throw new InterruptedError()
  }
  let runPath: string | undefined
  try {
    await assertWritablePathComponents(rootAbs, graphPath)
    await assertReplaceable(graphPath, 'graph')
    await writeExclusive(graphPath, graphJson, temporaries)
    if (options.metaPath !== null) {
      runPath = options.metaPath ? resolve(options.metaPath) : join(outDir, RUN_FILE)
      await assertWritablePathComponents(rootAbs, runPath)
      await assertReplaceable(runPath, 'meta')
      await writeExclusive(runPath, `${JSON.stringify(run, null, 2)}\n`, temporaries)
    }
    if (incremental && manifestPath) {
      await assertWritablePathComponents(rootAbs, manifestPath)
      await incremental.save(manifestPath)
    }
  } catch (error) {
    await removeTemps()
    throw error
  }

  const summaryBase = formatCoverageSummary(graph.coverage, graph.summary.entryCandidates)
  const summary = options.verbose && manifestPath
    ? `${summaryBase}\ncache: ${run.cache.hits} hits, ${run.cache.misses} misses, ${run.cache.removed} removed`
    : summaryBase

  return {
    graph,
    graphJson,
    graphPath,
    run,
    ...(runPath ? { runPath } : {}),
    strictFailures: failures,
    summary,
    elapsedMs: finished - started,
    root: rootAbs
  }
}
