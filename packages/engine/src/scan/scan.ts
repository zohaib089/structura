import { readFileSync } from 'node:fs'
import { constants as fsConstants } from 'node:fs'
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG_FILE, CACHE_FILE, GRAPH_FILE, OUT_DIR, PRODUCT_NAME, RUN_FILE } from '../brand.js'
import {
  buildModuleMap,
  detectArchitectureDrift,
  loadArchitectureFromYaml
} from '../architecture/index.js'
import { architectureConfigHash } from '../architecture/config-hash.js'
import { ContentCache, contentHash, defaultCacheDir, isInsideRoot, limitsTag } from '../cache/content-cache.js'
import { IncrementalScanCache, scanCacheHeader } from '../cache/scan-cache.js'
import { buildCoverage, formatCoverageSummary, strictFailures } from '../report/index.js'
import type { AdapterParseResult, ExtractedCall, ExtractedReference, LanguageAdapter, ResolveOutcome } from '../adapters/adapter.js'
import { ParsePool } from '../adapters/pool.js'
import { grammarFingerprint } from '../adapters/tree-sitter-runtime.js'
import { TS_JS_ADAPTER_ID, TS_JS_ADAPTER_VERSION, createTypeScriptJavaScriptAdapter } from '../adapters/ts-js/adapter.js'
import { TsJsResolver } from '../adapters/ts-js/resolver.js'
import { PYTHON_ADAPTER_ID, PYTHON_ADAPTER_VERSION, createPythonAdapter } from '../adapters/python/adapter.js'
import { PythonResolver } from '../adapters/python/resolver.js'
import { GO_ADAPTER_ID, GO_ADAPTER_VERSION, createGoAdapter } from '../adapters/go/adapter.js'
import { GoResolver, parseGoModulePath } from '../adapters/go/resolver.js'
import { JAVA_ADAPTER_ID, JAVA_ADAPTER_VERSION, createJavaAdapter } from '../adapters/java/adapter.js'
import { JavaResolver } from '../adapters/java/resolver.js'
import { readJavaPackage } from '../adapters/java/extract.js'
import { GraphBuilder } from '../graph/builder.js'
import { GraphVersionUnsupported } from '../graph/errors.js'
import { serializeGraph } from '../graph/canonical.js'
import { attachHotspots } from '../graph/hotspots.js'
import { attachQuality } from '../graph/quality.js'
import { attachDuplicates } from '../graph/duplicates.js'
import { readCheckedInSchemaHash } from '../graph/hash.js'
import { readGraph } from '../graph/read.js'
import { validateStrict } from '../graph/validate-strict.js'
import { ROOT_DIR_ID, ROOT_PATH, baseName, compareStrings, dirId, externalId, fileId, parentPath, symbolId, unresolvedId } from '../graph/ids.js'
import type {
  ContainsEdge,
  EntryCandidate,
  EntryCandidateDetail,
  FailReason,
  FileNode,
  Graph,
  GraphArchitecture,
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
import { extractFileSummary } from './file-summary.js'

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
  strictArchitecture?: boolean
  /** Repo-relative or absolute path to declared architecture config (default: `<root>/${CONFIG_FILE}`). */
  configPath?: string
  limits?: LimitOverrides
  respectGitignore?: boolean
  useDefaultIgnores?: boolean
  extraIgnorePatterns?: readonly string[]
  signal?: AbortSignal
  /** When true, write sanitised `docSummary` fields. Off by default (opt-in). */
  docSummaries?: boolean
}

export interface ScanOutput {
  graph: Graph
  graphJson: string
  graphPath: string
  run: RunMeta
  runPath?: string
  /** Repo-relative paths to leading comment summaries computed during the scan (not stored in graph.v1). */
  fileSummaries: Readonly<Record<string, string | null>>
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
  if (edge.type !== 'imports' && edge.type !== 'reexports') return edge
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

export function addSymbols(
  builder: GraphBuilder,
  filePath: string,
  facts: AdapterParseResult,
  options?: { docSummaries?: boolean; firstIds?: Map<string, string> }
): boolean {
  const counts = new Map<string, number>()
  const firstId = options?.firstIds ?? new Map<string, string>()
  const created: Array<{ name: string; id: string; symbol: AdapterParseResult['symbols'][number] }> = []
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
    created.push({ name: symbol.qualifiedName, id, symbol })
  }
  const hideDocs = options?.docSummaries !== true
  for (const item of created) {
    const dottedParent = (() => {
      const dot = item.name.lastIndexOf('.')
      return dot === -1 ? undefined : item.name.slice(0, dot)
    })()
    const parentName = item.symbol.parent ?? dottedParent
    const parentId = parentName ? firstId.get(parentName) : undefined
    const node: SymbolNode = {
      id: item.id,
      kind: 'symbol',
      file: fileId(filePath),
      label: truncateCodePoints(item.symbol.label, MAX_LABEL_CODE_POINTS),
      symbolKind: item.symbol.symbolKind,
      exported: item.symbol.exported,
      span: item.symbol.span,
      ...(parentId ? { parent: parentId } : {}),
      ...(item.symbol.paramCount !== undefined ? { paramCount: item.symbol.paramCount } : {}),
      ...(item.symbol.scope ? { scope: item.symbol.scope } : {}),
      ...(item.symbol.mutable !== undefined ? { mutable: item.symbol.mutable } : {}),
      ...(item.symbol.stateKind ? { stateKind: item.symbol.stateKind } : {}),
      ...(!hideDocs && item.symbol.docSummary ? { docSummary: item.symbol.docSummary } : {})
    }
    builder.addNode(node)
  }
  for (const item of created) {
    const dottedParent = (() => {
      const dot = item.name.lastIndexOf('.')
      return dot === -1 ? undefined : item.name.slice(0, dot)
    })()
    const parentName = item.symbol.parent ?? dottedParent
    const parentId = parentName ? firstId.get(parentName) : undefined
    builder.addEdge(contains(parentId ?? fileId(filePath), item.id))
  }
  return limitExceeded
}

interface ResolvedImportBinding {
  local: string
  imported: string
  targetPath: string
  provenance: 'EXTRACTED' | 'INFERRED'
  reason?: InferredReason
  confidence?: number
}

interface ResolvedReexport {
  star: boolean
  local?: string
  imported?: string
  targetPath: string
}

function callSortKey(call: ExtractedCall): string {
  return call.intraFileCallee ?? call.importLocal ?? call.caller ?? ''
}

function compareExtractedCalls(left: ExtractedCall, right: ExtractedCall): number {
  const line = left.span.start.line - right.span.start.line
  if (line !== 0) return line
  const col = left.span.start.col - right.span.start.col
  if (col !== 0) return col
  return compareStrings(callSortKey(left), callSortKey(right))
}

function makeCallEdge(
  source: string,
  target: string,
  span: ExtractedCall['span'],
  inferred?: { reason: InferredReason; confidence: number }
): GraphEdge {
  if (inferred) {
    return {
      source,
      type: 'calls',
      target,
      provenance: 'INFERRED',
      confidence: inferred.confidence,
      reason: inferred.reason,
      span
    }
  }
  return { source, type: 'calls', target, provenance: 'EXTRACTED', span }
}

function exportedSymbolId(exportedName: string, firstIds: Map<string, string>, facts: AdapterParseResult): string | undefined {
  const root = exportedName === '#default' ? 'default' : exportedName
  const candidates = [`${root}.constructor`, `${root}.__init__`, root]
  const exported = new Set(facts.symbols.filter(symbol => symbol.exported).map(symbol => symbol.qualifiedName))
  for (const name of candidates) {
    if (!exported.has(name)) continue
    const id = firstIds.get(name)
    if (id) return id
  }
  return undefined
}

function resolveExportedName(
  filePath: string,
  exportedName: string,
  firstIdsByFile: Map<string, Map<string, string>>,
  parsed: Map<string, AdapterParseResult>,
  reexportsByFile: Map<string, ResolvedReexport[]>,
  visited: Set<string>
): string | undefined {
  if (visited.has(filePath)) return undefined
  const nextVisited = new Set(visited)
  nextVisited.add(filePath)
  const facts = parsed.get(filePath)
  const firstIds = firstIdsByFile.get(filePath)
  if (facts && firstIds) {
    const direct = exportedSymbolId(exportedName, firstIds, facts)
    if (direct) return direct
  }
  for (const reexport of reexportsByFile.get(filePath) ?? []) {
    if (reexport.star) {
      const hit = resolveExportedName(reexport.targetPath, exportedName, firstIdsByFile, parsed, reexportsByFile, nextVisited)
      if (hit) return hit
      continue
    }
    if (reexport.local !== exportedName) continue
    const nextName = reexport.imported === 'default' || reexport.imported === '#default' ? 'default' : reexport.imported
    if (!nextName || nextName === '*') continue
    const hit = resolveExportedName(reexport.targetPath, nextName, firstIdsByFile, parsed, reexportsByFile, nextVisited)
    if (hit) return hit
  }
  return undefined
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
  fileSummary: string | null
  content?: string
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
      fileSummary: null,
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
    return {
      redactions: 0,
      fileSummary: null,
      record: { path: file.path, language: file.language, status: 'skipped', reason: 'binary', lineCount: null, lossy: false }
    }
  }
  const decoded = decodeSource(read.content)
  const fileSummary = extractFileSummary(decoded.text, file.language)
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
          fileSummary,
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
    fileSummary,
    content: decoded.text,
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

  const configRel = options.configPath ?? CONFIG_FILE
  const configAbs = isAbsolute(configRel) ? resolve(configRel) : resolve(rootAbs, configRel)
  if (!isInsideRoot(rootAbs, configAbs) && configAbs !== rootAbs) {
    throw new OutputRefusedError('architecture config path must be inside the scan root')
  }
  const configText = await readConfigText(configAbs, limits.maxConfigFileBytes)
  if (options.configPath && configText === undefined) {
    throw new OutputRefusedError(`architecture config not found or unreadable: ${configRel}`)
  }
  const architectureConfig = configText !== undefined
    ? loadArchitectureFromYaml(configText, relative(rootAbs, configAbs).split(sep).join('/'))
    : undefined
  const configRelPosix = relative(rootAbs, configAbs).split(sep).join('/')
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
  const goAdapter = createGoAdapter()
  const javaAdapter = createJavaAdapter()
  const adapterFor = (language: string | null): { adapter: LanguageAdapter; id: string; version: string } => {
    if (language === 'python') return { adapter: pyAdapter, id: PYTHON_ADAPTER_ID, version: PYTHON_ADAPTER_VERSION }
    if (language === 'go') return { adapter: goAdapter, id: GO_ADAPTER_ID, version: GO_ADAPTER_VERSION }
    if (language === 'java') return { adapter: javaAdapter, id: JAVA_ADAPTER_ID, version: JAVA_ADAPTER_VERSION }
    return { adapter: tsAdapter, id: TS_JS_ADAPTER_ID, version: TS_JS_ADAPTER_VERSION }
  }
  const cache = new ContentCache(cacheDirectory ?? defaultCacheDir(rootAbs), cacheDirectory !== undefined)
  const fingerprint = grammarFingerprint()
  const tag = limitsTag(limits)
  const incrementalHeader = scanCacheHeader(
    engineVersion(),
    readCheckedInSchemaHash(),
    limits,
    fingerprint,
    architectureConfigHash(configText)
  )
  let incremental: IncrementalScanCache | undefined
  if (manifestPath) {
    incremental = await IncrementalScanCache.load(manifestPath, incrementalHeader) ?? new IncrementalScanCache(incrementalHeader)
  }
  const texts = new Map<string, string>()
  const sources: Array<{ path: string; content: string; language: string | null }> = []
  const records: FileRecord[] = []
  const parsed = new Map<string, AdapterParseResult>()
  const fileSummaries: Record<string, string | null> = {}
  let redactions = 0

  try {
    const analyseLanguages = new Set(walk.files.filter(item => item.disposition === 'analyse').map(item => item.language))
    if (analyseLanguages.size > 0) {
      if ([...analyseLanguages].some(lang => lang === 'typescript' || lang === 'javascript' || lang === 'vue')) await tsAdapter.load()
      if (analyseLanguages.has('python')) await pyAdapter.load()
      if (analyseLanguages.has('go')) await goAdapter.load()
      if (analyseLanguages.has('java')) await javaAdapter.load()
    }
    for (const file of walk.files) {
      if (options.signal?.aborted) throw new InterruptedError()
      if (file.disposition === 'skipped') {
        records.push({ path: file.path, language: file.language, status: 'skipped', reason: file.skipReason, lineCount: null, lossy: false })
        fileSummaries[file.path] = null
        continue
      }
      const picked = adapterFor(file.language)
      const outcome = await analyseFile(file, limits, picked.adapter, picked.id, picked.version, cache, fingerprint, tag, incremental)
      redactions += outcome.redactions
      records.push(outcome.record)
      fileSummaries[file.path] = outcome.fileSummary
      if (outcome.parsed) parsed.set(file.path, outcome.parsed)
      if (outcome.content !== undefined && (outcome.record.status === 'parsed' || outcome.record.status === 'partial')) {
        sources.push({ path: file.path, content: outcome.content, language: outcome.record.language })
      }
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

  const moduleAssignment = architectureConfig
    ? buildModuleMap(records.map(record => record.path), architectureConfig.modules)
    : undefined

  const builder = new GraphBuilder()
  const firstIdsByFile = new Map<string, Map<string, string>>()
  const recordsByPath = new Map(records.map(record => [record.path, record]))
  builder.addNode({ id: ROOT_DIR_ID, kind: 'directory', path: ROOT_PATH, label: ROOT_PATH })
  for (const record of records) {
    linkDirectory(builder, record.path)
    const facts = parsed.get(record.path)
    if (facts) {
      const firstIds = new Map<string, string>()
      const limitExceeded = addSymbols(builder, record.path, facts, {
        docSummaries: options.docSummaries === true,
        firstIds
      })
      firstIdsByFile.set(record.path, firstIds)
      if (limitExceeded) {
        record.status = 'partial'
        record.reason = partialReason(facts, true)
      }
    }
    const assignedModule = moduleAssignment?.byPath.get(record.path)
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
      ...(record.entryCandidates && record.entryCandidates.length > 0 ? { entryCandidates: record.entryCandidates } : {}),
      ...(assignedModule ? { module: assignedModule } : {}),
      ...(options.docSummaries === true && facts?.fileDocSummary ? { docSummary: facts.fileDocSummary } : {})
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
  const goModules = new Map<string, string>()
  for (const file of walk.files) {
    if (baseName(file.path) !== 'go.mod') continue
    const read = await readWalkedFile(file, limits.maxFileSizeBytes)
    if (!read.ok || read.binary) continue
    const modulePath = parseGoModulePath(decodeSource(read.content).text)
    if (modulePath) goModules.set(parentPath(file.path) ?? ROOT_PATH, modulePath)
  }
  const goResolver = GoResolver.create({
    files: new Set(filesByPath.keys()),
    ignoredPaths: walk.ignoredPaths,
    modules: goModules
  })
  const javaPackages = new Map<string, string>()
  for (const source of sources) {
    if (source.language !== 'java') continue
    javaPackages.set(source.path, readJavaPackage(source.content) ?? '')
  }
  const javaResolver = JavaResolver.create({
    files: new Set(filesByPath.keys()),
    ignoredPaths: walk.ignoredPaths,
    packages: javaPackages
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
  const bindingsByFile = new Map<string, Map<string, ResolvedImportBinding>>()
  const reexportsByFile = new Map<string, ResolvedReexport[]>()
  const fileRefEdgeCounts = new Map<string, number>()

  for (const file of walk.files) {
    const facts = parsed.get(file.path)
    if (!facts) continue
    for (const reference of facts.references) {
      const literal = reference.specifier
      const outcomes: ResolveOutcome[] = file.language === 'go'
        ? goResolver.resolveAll(literal, file.path)
        : file.language === 'java'
          ? javaResolver.resolveAll(literal, file.path)
          : [resolveReference(reference, file, literal)]
      for (const outcome of outcomes) {
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
      const added = builder.addEdge(edge)
      if (!added) collapsedEdges += 1
      else fileRefEdgeCounts.set(file.path, (fileRefEdgeCounts.get(file.path) ?? 0) + 1)
      if (outcome.kind === 'file') {
        if (reference.edgeType === 'imports') {
          let map = bindingsByFile.get(file.path)
          if (!map) {
            map = new Map()
            bindingsByFile.set(file.path, map)
          }
          const inferred = literal === null ? undefined : target.inferred
          for (const binding of reference.bindings ?? []) {
            if (map.has(binding.local)) continue
            map.set(binding.local, {
              local: binding.local,
              imported: binding.imported,
              targetPath: outcome.path,
              provenance: inferred ? 'INFERRED' : 'EXTRACTED',
              ...(inferred ? { reason: inferred.reason, confidence: inferred.confidence } : {})
            })
          }
        } else if (reference.edgeType === 'reexports') {
          const list = reexportsByFile.get(file.path) ?? []
          const bindings = reference.bindings ?? []
          if (bindings.length === 0) list.push({ star: true, targetPath: outcome.path })
          else {
            for (const binding of bindings) {
              if (binding.imported === '*' && binding.local) continue
              list.push({ star: false, local: binding.local, imported: binding.imported, targetPath: outcome.path })
            }
          }
          reexportsByFile.set(file.path, list)
        }
      }
      if (added && outcome.kind === 'unresolved') bump(outcome.reason)
      }
    }
  }
  for (const issue of resolver.configIssues) bump(issue.reason)

  let resolvedCalls = 0
  let unresolvedCalls = 0
  for (const file of walk.files) {
    const facts = parsed.get(file.path)
    if (!facts) continue
    unresolvedCalls += facts.unresolvedCalls
    const firstIds = firstIdsByFile.get(file.path) ?? new Map()
    const bindings = bindingsByFile.get(file.path)
    let used = fileRefEdgeCounts.get(file.path) ?? 0
    let droppedForCap = false
    const calls = [...facts.calls].sort(compareExtractedCalls)
    for (const call of calls) {
      if (droppedForCap || used >= limits.maxEdgesPerFile) {
        if (!droppedForCap) {
          droppedForCap = true
          const record = recordsByPath.get(file.path)
          if (record) {
            record.status = 'partial'
            if (record.reason !== 'limit-exceeded' && record.reason !== 'too-many-symbols') {
              record.reason = 'too-many-edges'
            }
            const node = builder.getNode(fileId(file.path))
            if (node?.kind === 'file') node.parse = parseInfo(record)
          }
        }
        unresolvedCalls += 1
        continue
      }
      const source = call.caller === null ? fileId(file.path) : firstIds.get(call.caller)
      if (!source) {
        unresolvedCalls += 1
        continue
      }
      let target: string | undefined
      let inferred: { reason: InferredReason; confidence: number } | undefined
      if (call.intraFileCallee) {
        target = firstIds.get(call.intraFileCallee)
      } else if (call.importLocal) {
        const dot = call.importLocal.indexOf('.')
        const local = dot === -1 ? call.importLocal : call.importLocal.slice(0, dot)
        const member = dot === -1 ? undefined : call.importLocal.slice(dot + 1)
        const binding = bindings?.get(local)
        if (binding) {
          const exportedName = member
            ? (binding.imported === '*' ? member : undefined)
            : (binding.imported === 'default' ? 'default' : binding.imported === '*' ? undefined : binding.imported)
          if (exportedName) {
            target = resolveExportedName(binding.targetPath, exportedName, firstIdsByFile, parsed, reexportsByFile, new Set())
            if (target && binding.provenance === 'INFERRED' && binding.reason !== undefined && binding.confidence !== undefined) {
              inferred = { reason: binding.reason, confidence: binding.confidence }
            }
          }
        }
      }
      if (!target) {
        unresolvedCalls += 1
        continue
      }
      const added = builder.addEdge(makeCallEdge(source, target, call.span, inferred))
      resolvedCalls += 1
      if (added) used += 1
    }
    fileRefEdgeCounts.set(file.path, used)
  }

  const coverage = buildCoverage({
    discovered: walk.discovered,
    ignored: walk.ignored,
    files: records.map(record => ({ language: record.language, status: record.status, ...(record.reason ? { reason: record.reason } : {}) })),
    unnoded: walk.unnodedSkips.map(item => ({ language: item.language, reason: item.reason })),
    unresolved: [...unresolvedCounts.entries()].map(([reason, count]) => ({ reason, count })),
    calls: { resolved: resolvedCalls, unresolved: unresolvedCalls }
  })
  let graph = builder.build(coverage, entrySummary(records))
  if (architectureConfig && moduleAssignment) {
    const findings = detectArchitectureDrift(graph, architectureConfig, moduleAssignment.byPath)
    const architecture: GraphArchitecture = {
      config: configRelPosix,
      ...(architectureConfig.defaultPolicy ? { defaultPolicy: architectureConfig.defaultPolicy } : {}),
      modules: architectureConfig.modules.map(mod => ({
        name: mod.name,
        paths: [...mod.paths],
        ...(mod.allow ? { allow: [...mod.allow] } : {}),
        ...(mod.deny ? { deny: [...mod.deny] } : {}),
        ...(mod.policy ? { policy: mod.policy } : {})
      })),
      unassigned: moduleAssignment.unassigned,
      ...(findings.length > 0 ? { findings } : {}),
      summary: { violations: findings.length, unassignedFiles: moduleAssignment.unassigned.length }
    }
    graph = { ...graph, architecture }
  }
  graph = attachDuplicates(attachQuality(attachHotspots(graph)), sources)
  const checked = validateStrict(graph)
  if (!checked.ok) {
    const first = checked.issues.slice(0, 8).map(issue => `${issue.path} ${issue.message}`).join('; ')
    throw new Error(`internal error: produced graph failed validation: ${first}`)
  }
  const graphJson = serializeGraph(graph)
  const failures = [
    ...(options.strict ? strictFailures(graph.coverage) : []),
    ...(options.strictArchitecture && graph.architecture?.findings && graph.architecture.findings.length > 0
      ? [`architecture drift: ${graph.architecture.findings.length} violation(s)`]
      : [])
  ]
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
    fileSummaries,
    strictFailures: failures,
    summary,
    elapsedMs: finished - started,
    root: rootAbs
  }
}
