/**
 * graph.json v1: the versioned, deterministic, closed, brand-free
 * output contract of the scan engine. It is source-text-free except for the
 * optional sanitised `docSummary` field (doc comments only, never code).
 * Authoritative design: the Tech Lead's "graph contract decisions" (section 2)
 * and the file-insights v1.1 addendum. Property order in these types is the
 * serialisation order.
 *
 * Conventions
 *  - Paths are NFC, POSIX, repo-relative; the root directory node uses ".".
 *  - Positions are 1-based; `col` counts UTF-16 code units; `end` is exclusive.
 *  - Nothing run-specific (time, tool version, absolute path, host, brand) is stored.
 */

import type {
  ArchitectureFinding,
  ArchitectureModuleDecl,
  ArchitecturePolicy,
  ArchitectureSummary
} from '../architecture/types.js'

export type {
  ArchitectureFinding,
  ArchitectureModuleDecl,
  ArchitecturePolicy,
  ArchitectureSummary
} from '../architecture/types.js'
export { ARCHITECTURE_DRIFT_RULES, ARCHITECTURE_EDGE_KINDS, ARCHITECTURE_POLICIES } from '../architecture/types.js'

export const GRAPH_SCHEMA_VERSION = '1.7.0'
export const GRAPH_SCHEMA_MAJOR = 1
export const GRAPH_SCHEMA_MINOR = 7
/** Brand-free schema id: never changes when the product is renamed. */
export const GRAPH_SCHEMA_ID = 'urn:repo-graph:schema:graph:1'

export const PROVENANCES = ['EXTRACTED', 'INFERRED'] as const
export type Provenance = typeof PROVENANCES[number]

export const NODE_KINDS = ['directory', 'file', 'symbol', 'external', 'unresolved'] as const
export type NodeKind = typeof NODE_KINDS[number]

export const EDGE_TYPES = ['contains', 'imports', 'reexports', 'calls'] as const
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
  'memory-limit',
  'too-large',
  'unrepresentable-path',
  'unsupported-language'
] as const
export type SkipReason = typeof SKIP_REASONS[number]

/** Reasons analysis was attempted (or needed) and did not work. */
export const FAIL_REASONS = ['changed-during-scan', 'parser-error', 'permission-denied', 'read-error', 'vanished'] as const
export type FailReason = typeof FAIL_REASONS[number]

/** Everything allowed in `coverage.skipped[].reason`. */
export const SKIPPED_COVERAGE_REASONS = [...SKIP_REASONS].sort() as unknown as readonly SkipReason[]

/** @deprecated Use SKIPPED_COVERAGE_REASONS and FAIL_REASONS separately. */
export const NOT_PARSED_REASONS = [...SKIP_REASONS, ...FAIL_REASONS].sort() as unknown as readonly (SkipReason | FailReason)[]
export type NotParsedReason = SkipReason | FailReason

/** Reasons a file was analysed only in part. */
export const PARTIAL_REASONS = ['limit-exceeded', 'name-too-long', 'syntax-errors', 'too-many-edges', 'too-many-symbols'] as const
export type PartialReason = typeof PARTIAL_REASONS[number]

export const UNRESOLVED_REASONS = [
  'config-outside-root',
  'non-literal-specifier',
  'not-found',
  'outside-root',
  'target-ignored',
  'unsupported-resolution',
  'unsupported-specifier'
] as const

/**
 * Reasons that describe a configuration problem rather than one import. They appear only in
 * `coverage.unresolved` (one count per unreadable `extends` or project reference), never on an unresolved node,
 * so edges are identical with and without them.
 */
export const CONFIG_UNRESOLVED_REASONS: readonly string[] = ['config-outside-root']
export type UnresolvedReason = typeof UNRESOLVED_REASONS[number]

export const INFERRED_REASONS = [
  'build-output-mapping',
  'conventional-entry',
  'src-root-guess',
  'src-subpath',
  'submodule-heuristic'
] as const
export type InferredReason = typeof INFERRED_REASONS[number]

export const ENTRY_REASONS = [
  'conventional-name',
  'dockerfile-cmd',
  'dockerfile-entrypoint',
  'package-bin',
  'package-exports',
  'package-main',
  'package-script',
  'pyproject-gui-script',
  'pyproject-script',
  'python-name-main',
  'setup-console-script'
] as const
export type EntryReason = typeof ENTRY_REASONS[number]

/** Config or source file that supports an entry candidate (no file contents in graph.json). */
export interface EntryEvidence {
  /** Repo-relative path of the file that contains the declaration (e.g. package.json, pyproject.toml). */
  source: string
  /** Location inside {@link source}, e.g. `package.json#/bin/cli`. */
  pointer?: string
  /** Source span when the evidence is in a parsed file (1-based, UTF-16). */
  span?: Span
}

/** One ranked entry-point hypothesis for a file (schema v1 additive field `entryCandidates`). */
export interface EntryCandidateDetail {
  reason: EntryReason
  evidence: EntryEvidence
  /** Heuristic strength in (0, 1]; see docs/graph-json-v1.md. */
  confidence: number
}

export const SYMBOL_KINDS = ['class', 'default', 'enum', 'function', 'interface', 'namespace', 'type', 'unknown', 'variable'] as const
export type SymbolKind = typeof SYMBOL_KINDS[number]

/** Scope of a state-bearing symbol. `"local"` is reserved for a later minor and must not be emitted in v1.1. */
export const STATE_SCOPES = ['module', 'class', 'instance', 'global'] as const
export type StateScope = typeof STATE_SCOPES[number]

/** Kind of Vue / Pinia / provide-inject state. Ordinary bindings omit the field (readers treat missing as `"binding"`). */
export const STATE_KINDS = ['binding', 'ref', 'reactive', 'computed', 'prop', 'store', 'provide', 'inject'] as const
export type StateKind = typeof STATE_KINDS[number]

/** Languages the engine can analyse. Anything else is `null`. */
export const LANGUAGES = ['go', 'java', 'javascript', 'python', 'typescript', 'vue'] as const

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
  /** Deterministic list of entry hypotheses; sorted by descending precedence then evidence. */
  entryCandidates?: EntryCandidateDetail[]
  /** Declared architecture module (first matching glob wins). Written only when a config was loaded. */
  module?: string
  /** First sentence of a leading file doc comment or module docstring. Omitted when empty, secret-shaped, or disabled. */
  docSummary?: string
  /** 0–100 hotspot score. Omitted when the score is 0. */
  hotspot?: FileHotspot
  extensions?: Extensions
}

export interface FileHotspot {
  score: number
}

/** JSON-serialisable parameters for a structured message `code` (1.7.0). */
export type MessageParamValue = string | number | boolean | readonly string[]
export type MessageParams = { [key: string]: MessageParamValue }

/** Top-N hotspot entry (plain-English `why`, repo-relative `path`). */
export interface GraphHotspot {
  path: string
  score: number
  why: string
  /** Structured code for `why` (1.7.0). */
  code?: string
  /** Parameters for `code`. Omitted when empty (1.7.0). */
  params?: MessageParams
}

export const QUALITY_GRADES = ['A', 'B', 'C', 'D', 'F'] as const
export type QualityGrade = typeof QUALITY_GRADES[number]

export const QUALITY_CATEGORIES = ['architecture', 'cycles', 'hotspots', 'imports', 'size'] as const
export type QualityCategory = typeof QUALITY_CATEGORIES[number]

export interface QualityBreakdownItem {
  category: QualityCategory
  /** Plain-English summary of this category. */
  label: string
  /** Structured code for `label` (1.7.0). */
  code?: string
  /** Parameters for `code`. Omitted when empty (1.7.0). */
  params?: MessageParams
  penalty: number
}

export interface QualityTip {
  text: string
  /** Structured code for `text` (1.7.0). */
  code?: string
  /** Parameters for `code`. Omitted when empty (1.7.0). */
  params?: MessageParams
  /** Estimated score gain from this fix, computed from the published formula. */
  gain: number
}

export interface QualityScore {
  score: number
  grade: QualityGrade
  breakdown: QualityBreakdownItem[]
  tips: QualityTip[]
}

export interface FolderQualityScore extends QualityScore {
  path: string
}

export interface GraphQuality {
  project: QualityScore
  /** Folder scores, worst first then by path. Omitted when the repo has no subfolders with files. */
  folders?: FolderQualityScore[]
}

export interface DuplicateSource {
  path: string
  content: string
  language: string | null
}

export interface DuplicateOccurrence {
  path: string
  startLine: number
  endLine: number
}

export interface DuplicateGroup {
  id: string
  lineCount: number
  occurrences: DuplicateOccurrence[]
  description: string
  /** Structured code for `description` (1.7.0). */
  code?: string
  /** Parameters for `code`. Omitted when empty (1.7.0). */
  params?: MessageParams
}

export interface DuplicatesSummary {
  groups: number
  duplicatedLines: number
  percentage: number
}

export interface GraphDuplicates {
  summary: DuplicatesSummary
  groups: DuplicateGroup[]
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
  /** Id of the enclosing class, namespace, or outer function symbol. Omitted at file top level. */
  parent?: string
  /** Formal parameter count, written only on `function` (and `default` when it is a function). */
  paramCount?: number
  /** Present on state-bearing symbols only. */
  scope?: StateScope
  /** Binding mutability, not deep immutability of a `const` object. State symbols only. */
  mutable?: boolean
  /** Written for Vue / Pinia / provide-inject state. Omit for ordinary bindings. */
  stateKind?: StateKind
  /** First sentence of the declaration's doc comment or docstring. Omitted when empty, secret-shaped, or disabled. */
  docSummary?: string
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

export interface ExtractedCallEdge {
  source: string
  type: 'calls'
  target: string
  provenance: 'EXTRACTED'
  span: Span
  extensions?: Extensions
}

export interface InferredCallEdge {
  source: string
  type: 'calls'
  target: string
  provenance: 'INFERRED'
  /** In (0, 1]. */
  confidence: number
  reason: InferredReason
  span: Span
  extensions?: Extensions
}

export type GraphEdge = ContainsEdge | ExtractedRefEdge | InferredRefEdge | ExtractedCallEdge | InferredCallEdge

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
  /** Reasons for every skipped file (sum = files.skipped). Sorted by reason. */
  skipped: CoverageReason[]
  /** Reasons for every failed file (sum = files.failed). Sorted by reason. */
  failed: CoverageReason[]
  /** Sorted by rule. */
  ignored: CoverageIgnored[]
  /**
   * Unresolved references grouped by reason (sorted): one per edge that ends at an unresolved node, plus
   * configuration problems (`config-*` for an `extends` or project `references` target that is missing or outside the root).
   */
  unresolved: CoverageReason[]
  /**
   * Resolved and unresolved call sites. Omitted when both counts are 0.
   * Not mixed into `unresolved` (that bucket is import-specifier reasons).
   */
  calls?: { resolved: number; unresolved: number }
  /** Must be equal; unequal means a silent drop and the engine exits 3. */
  accounting: { discovered: number; accounted: number }
}

export interface SummaryEntryCandidates {
  files: number
  candidates: number
}

export interface Summary {
  nodes: number
  edges: number
  files: number
  entryCandidates?: SummaryEntryCandidates
}

export interface GraphArchitecture {
  config: string
  defaultPolicy?: ArchitecturePolicy
  modules: ArchitectureModuleDecl[]
  unassigned: string[]
  findings?: ArchitectureFinding[]
  summary: ArchitectureSummary
}

export interface Graph {
  schemaVersion: string
  summary: Summary
  coverage: Coverage
  /** Sorted by id. */
  nodes: GraphNode[]
  /** Sorted by (source, type, target, span.start.line, span.start.col). */
  edges: GraphEdge[]
  architecture?: GraphArchitecture
  /** Top-N hotspot files, highest score first. Omitted when every file scores 0. */
  hotspots?: GraphHotspot[]
  /** Project and per-folder quality scores (1.3.0). */
  quality?: GraphQuality
  /** Duplicate code groups (1.4.0). Omitted when none are found. */
  duplicates?: GraphDuplicates
  extensions?: Extensions
}
