import type { ImportKind, InferredReason, Span, SymbolKind, UnresolvedReason } from '../graph/types.js'

/**
 * Language adapter contract. An adapter turns source text into language-neutral facts
 * (references, symbols, spans, syntax-problem counts). Adapters PARSE ONLY: they never execute,
 * import, `eval` or `require` the code under scan, and never spawn processes or touch the network.
 *
 * Positions follow the graph contract: 1-based line and column, columns counted in UTF-16 code units,
 * `end` exclusive, `\n` is the only line break and a leading BOM is not part of the text.
 */

export class AdapterLoadError extends Error {
  readonly adapterId: string
  readonly code: string

  constructor(adapterId: string, code: string, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AdapterLoadError'
    this.adapterId = adapterId
    this.code = code
  }
}

/** Per-file caps an adapter must honour; they bound the work and the output (threat model T-19, T-25). */
export interface ExtractLimits {
  maxIdentifierLength: number
  maxSymbolsPerFile: number
  maxEdgesPerFile: number
}

export interface AdapterFileInput {
  /** Repo-relative POSIX path (graph path). */
  path: string
  /** Decoded text without a leading BOM. */
  content: string
  /** Language id from the walker (`typescript`, `javascript`). */
  language: string
  limits: ExtractLimits
  /** Per-file parse budget. The worker is terminated if cancellation does not return in time. */
  timeoutMs?: number
}

/** One import-like reference found in a file. */
export interface ExtractedReference {
  edgeType: 'imports' | 'reexports'
  /** `static` unless `import()` or `require()`. */
  importKind: ImportKind
  typeOnly: boolean
  /** Literal specifier as written, or `null` when it is computed at runtime (never stores source text). */
  specifier: string | null
  /** True when the literal specifier looked like a secret; `specifier` then is "[redacted]". */
  redacted: boolean
  span: Span
  /** Bound names (`import { a, b as c }` contributes `a` and `b`). Omitted when there are none. Not written to graph.json. */
  names?: string[]
}

export interface ExtractedSymbol {
  /** Dotted name within the file (`Class.method`). Duplicates are numbered by the graph builder. */
  qualifiedName: string
  label: string
  symbolKind: SymbolKind
  exported: boolean
  span: Span
}

export interface SyntaxIssue {
  span: Span
}

export interface AdapterParseResult {
  references: ExtractedReference[]
  symbols: ExtractedSymbol[]
  /** Number of ERROR/MISSING regions found by parser error recovery (0 = clean parse). */
  syntaxErrorCount: number
  /** Outermost ERROR/MISSING regions. Spans only: the source text is not stored. */
  syntaxErrors: SyntaxIssue[]
  /** Things dropped because of the caps; any non-zero value makes the file `partial`. */
  omitted: { longNames: number; symbols: number; edges: number }
  /** Number of specifiers replaced by "[redacted]". */
  redactions: number
}

/** Result of asking an adapter to parse one file. Fatal loader failures throw `AdapterLoadError` instead. */
export type AdapterParseOutcome =
  | { ok: true; result: AdapterParseResult }
  | { ok: false; reason: 'timeout' }
  | { ok: false; reason: 'parser-error'; message: string }

/**
 * Where a specifier points. Shared by every language adapter (TypeScript/JavaScript now,
 * Python later). `provenance` is EXTRACTED for standard resolution and INFERRED when the
 * adapter had to guess. External `name` is the package root (`react`, `fs`, `os`).
 */
export type ResolveOutcome =
  | { kind: 'file'; path: string; provenance: 'EXTRACTED' }
  | { kind: 'file'; path: string; provenance: 'INFERRED'; reason: InferredReason; confidence: number }
  | { kind: 'external'; ecosystem: string; name: string }
  | { kind: 'unresolved'; reason: UnresolvedReason }

export interface ModuleResolver {
  resolve(specifier: string | null, fromPath: string): ResolveOutcome
}

export interface LanguageAdapter {
  readonly id: string
  /** Bump when output for the same input can change (invalidates cached extractions). */
  readonly version: string
  readonly languageIds: readonly string[]
  /** Loads grammars. A failure here aborts the scan; it is never reported as "0 files parsed". */
  load(): Promise<void>
  parse(input: AdapterFileInput): Promise<AdapterParseOutcome>
}
