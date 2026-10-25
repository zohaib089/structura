/**
 * graph.json v1: the versioned, deterministic, closed, brand-free, source-text-free
 * output contract of the scan engine. Authoritative design: the Tech Lead's
 * "graph contract decisions" (section 2). Property order in these types is the
 * serialisation order.
 *
 * Conventions
 *  - Paths are NFC, POSIX, repo-relative; the root directory node uses ".".
 *  - Positions are 1-based; `col` counts UTF-16 code units; `end` is exclusive.
 *  - Nothing run-specific (time, tool version, absolute path, host, brand) is stored.
 */

export const GRAPH_SCHEMA_VERSION = '1.0.0'
export const GRAPH_SCHEMA_MAJOR = 1
export const GRAPH_SCHEMA_MINOR = 0
/** Brand-free schema id: never changes when the product is renamed. */
export const GRAPH_SCHEMA_ID = 'urn:repo-graph:schema:graph:1'

export const PROVENANCES = ['EXTRACTED', 'INFERRED'] as const
export type Provenance = typeof PROVENANCES[number]

export const NODE_KINDS = ['directory', 'file', 'symbol', 'external', 'unresolved'] as const
export type NodeKind = typeof NODE_KINDS[number]

export const EDGE_TYPES = ['contains', 'imports', 'reexports'] as const
export type EdgeType = typeof EDGE_TYPES[number]

export const PARSE_STATUSES = ['parsed', 'partial', 'failed', 'skipped'] as const
export type ParseStatus = typeof PARSE_STATUSES[number]

/** Reasons a file was deliberately not analysed. */
export const SKIP_REASONS = [
  'binary',
  'id-collision',
  'locked',
  'max-depth',
  'not-regular-file',
  'path-too-long',
  'sensitive-file',
  'symlink',
  'symlink-outside-root',
  'timeout',
  'too-large',
  'unrepresentable-path',
  'unsupported-language'
] as const
export type SkipReason = typeof SKIP_REASONS[number]

/** Reasons analysis was attempted (or needed) and did not work. */
export const FAIL_REASONS = ['changed-during-scan', 'parser-error', 'permission-denied', 'read-error', 'vanished'] as const
export type FailReason = typeof FAIL_REASONS[number]

/** Everything allowed in `coverage.skipped[].reason`. */
export const NOT_PARSED_REASONS = [...SKIP_REASONS, ...FAIL_REASONS].sort() as unknown as readonly (SkipReason | FailReason)[]
export type NotParsedReason = SkipReason | FailReason

/** Reasons a file was analysed only in part. */
export const PARTIAL_REASONS = ['name-too-long', 'syntax-errors', 'too-many-edges', 'too-many-symbols'] as const
export type PartialReason = typeof PARTIAL_REASONS[number]

export const UNRESOLVED_REASONS = [
  'config-extends-unresolved',
  'config-outside-root',
  'dynamic',
  'not-found',
  'outside-root',
  'target-ignored',
  'unsupported-resolution',
  'unsupported-specifier'
] as const

/**
 * Reasons that describe a configuration problem rather than one import. They appear only in
 * `coverage.unresolved` (one count per unresolvable `extends`), never on an unresolved node,
 * so edges are identical with and without them.
 */
export const CONFIG_UNRESOLVED_REASONS: readonly string[] = ['config-extends-unresolved', 'config-outside-root']
export type UnresolvedReason = typeof UNRESOLVED_REASONS[number]

export const INFERRED_REASONS = [
  'build-output-mapping',
  'conventional-entry',
  'dynamic-pattern',
  'src-root-guess',
  'src-subpath',
  'submodule-heuristic'
] as const
export type InferredReason = typeof INFERRED_REASONS[number]

export const ENTRY_REASONS = ['conventional-name', 'package-bin', 'package-exports', 'package-main', 'package-script'] as const
export type EntryReason = typeof ENTRY_REASONS[number]

export const SYMBOL_KINDS = ['class', 'default', 'enum', 'function', 'interface', 'namespace', 'type', 'unknown', 'variable'] as const
export type SymbolKind = typeof SYMBOL_KINDS[number]

/** Languages the engine can analyse. Anything else is `null`. */
export const LANGUAGES = ['javascript', 'python', 'typescript'] as const

/** Namespaced extension keys, e.g. `acme:owner`. */
export const EXTENSION_KEY_PATTERN = '^[a-z][a-z0-9-]*:[A-Za-z0-9._-]+$'
/** `hard:.git`, `default:node_modules`, `gitignore:/dist`, `ignorefile:*.gen.ts`, `include:...` */
export const IGNORE_RULE_PATTERN = '^(hard|default|gitignore|ignorefile):.{1,200}$'

/** How a reference was written. `static` is the default and is never serialised. */
export const IMPORT_KINDS = ['static', 'dynamic', 'require'] as const
export type ImportKind = typeof IMPORT_KINDS[number]

export type Extensions = Record<string, unknown>

export interface Pos {
  line: number
  col: number
}

export interface Span {
  start: Pos
  end: Pos
}

export interface DirectoryNode {
  id: string
  kind: 'directory'
  path: string
  label: string
  extensions?: Extensions
}

export type ParseInfo =
  | { status: 'parsed' }
  | { status: 'partial'; reason: PartialReason }
  | { status: 'skipped'; reason: SkipReason }
  | { status: 'failed'; reason: FailReason }

export interface EntryCandidate {
  reason: EntryReason
  provenance: Provenance
}

export interface FileNode {
  id: string
  kind: 'file'
  path: string
  label: string
  language: string | null
  /** Number of `\n` plus one; `null` when the file was not read. */
  lineCount: number | null
  parse: ParseInfo
  decoding?: 'lossy'
  entryCandidate?: EntryCandidate
  extensions?: Extensions
}

export interface SymbolNode {
  id: string
  kind: 'symbol'
  /** Id of the file node that declares the symbol. */
  file: string
  label: string
  symbolKind: SymbolKind
  exported: boolean
  span: Span
  extensions?: Extensions
}

export interface ExternalNode {
  id: string
  kind: 'external'
  ecosystem: string
  label: string
  extensions?: Extensions
}

export interface UnresolvedNode {
  id: string
  kind: 'unresolved'
  label: string
  reason: UnresolvedReason
  extensions?: Extensions
}

export type GraphNode = DirectoryNode | FileNode | SymbolNode | ExternalNode | UnresolvedNode

export interface ContainsEdge {
  source: string
  type: 'contains'
  target: string
  provenance: 'EXTRACTED'
  extensions?: Extensions
}

export interface ExtractedRefEdge {
  source: string
  type: 'imports' | 'reexports'
  target: string
  provenance: 'EXTRACTED'
  span: Span
  specifier: string
  /** Written only when not `static`. */
  importKind?: ImportKind
  /** Written only when `true` (type-only import / re-export). */
  typeOnly?: boolean
  extensions?: Extensions
}

export interface InferredRefEdge {
  source: string
  type: 'imports' | 'reexports'
  target: string
  provenance: 'INFERRED'
  /** In (0, 1]. */
  confidence: number
  reason: InferredReason
  span: Span
  specifier: string
  /** Written only when not `static`. */
  importKind?: ImportKind
  /** Written only when `true` (type-only import / re-export). */
  typeOnly?: boolean
  extensions?: Extensions
}

export type GraphEdge = ContainsEdge | ExtractedRefEdge | InferredRefEdge

export interface CoverageFiles {
  discovered: number
  parsed: number
  partial: number
  failed: number
  skipped: number
  ignored: number
}

export interface CoverageByLanguage {
  language: string | null
  parsed: number
  partial: number
  failed: number
  skipped: number
}

export interface CoverageReason {
  reason: string
  count: number
}

export interface CoverageIgnored {
  rule: string
  count: number
}

export interface Coverage {
  files: CoverageFiles
  /** Sorted by language (`null` first). */
  byLanguage: CoverageByLanguage[]
  /** Reasons for every file that is `skipped` or `failed` (sum = files.skipped + files.failed). Sorted by reason. */
  skipped: CoverageReason[]
  /** Sorted by rule. */
  ignored: CoverageIgnored[]
  /**
   * Unresolved references grouped by reason (sorted): one per edge that ends at an unresolved node, plus
   * configuration problems (`config-*`, `unsupported-resolution` for tsconfig project references).
   */
  unresolved: CoverageReason[]
  /** Must be equal; unequal means a silent drop and the engine exits 3. */
  accounting: { discovered: number; accounted: number }
}

export interface Summary {
  nodes: number
  edges: number
  files: number
}

export interface Graph {
  schemaVersion: string
  summary: Summary
  coverage: Coverage
  /** Sorted by id. */
  nodes: GraphNode[]
  /** Sorted by (source, type, target, span.start.line, span.start.col). */
  edges: GraphEdge[]
  extensions?: Extensions
}
