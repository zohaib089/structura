export type Provenance = 'EXTRACTED' | 'INFERRED'

export type ImportKind = 'static' | 'dynamic' | 'require'

/**
 * Written on a file when the engine marks it as an entry.
 * These strings match packages/engine graph v1. The viewer does not import that package.
 */
export type EntryReason = 'conventional-name' | 'package-bin' | 'package-exports' | 'package-main' | 'package-script'

export interface EntryCandidate {
  reason: EntryReason
  provenance: Provenance
}

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
}

export interface FileNode {
  id: string
  kind: 'file'
  path: string
  label: string
  language: string | null
  lineCount: number | null
  parse: { status: 'parsed' | 'partial' | 'failed' | 'skipped'; reason?: string }
  decoding?: 'lossy'
  entryCandidate?: EntryCandidate
  /** Declared architecture module (first matching glob wins). Present when graph includes architecture. */
  module?: string
}

export interface SymbolNode {
  id: string
  kind: 'symbol'
  file: string
  label: string
  symbolKind: string
  exported: boolean
  span: Span
}

export interface ExternalNode {
  id: string
  kind: 'external'
  ecosystem: string
  label: string
}

export interface UnresolvedNode {
  id: string
  kind: 'unresolved'
  label: string
  reason: string
}

export interface GenericNode {
  id: string
  kind: string
  label: string
}

export type GraphNode =
  | DirectoryNode
  | FileNode
  | SymbolNode
  | ExternalNode
  | UnresolvedNode
  | GenericNode

export interface ContainsEdge {
  source: string
  type: 'contains'
  target: string
  provenance: 'EXTRACTED'
}

export interface ImportEdge {
  source: string
  type: 'imports' | 'reexports'
  target: string
  provenance: Provenance
  span: Span
  specifier: string
  /**
   * In memory this is always set. The published schema omits `static` and writes
   * only `dynamic` or `require`.
   */
  importKind: ImportKind
  /**
   * In memory this is always set. The published schema writes `typeOnly` only when true.
   */
  typeOnly: boolean
  confidence?: number
  reason?: string
}

export interface GenericEdge {
  source: string
  type: string
  target: string
  provenance: Provenance
  span: Span
  confidence?: number
  reason?: string
}

export type GraphEdge = ContainsEdge | ImportEdge | GenericEdge

export const ARCHITECTURE_EDGE_KINDS = ['imports', 'reexports', 'calls'] as const
export type ArchitectureEdgeKind = (typeof ARCHITECTURE_EDGE_KINDS)[number]

export const ARCHITECTURE_DRIFT_RULES = ['deny-list', 'allow-list', 'deny-undeclared'] as const
export type ArchitectureDriftRule = (typeof ARCHITECTURE_DRIFT_RULES)[number] | string

export const ARCHITECTURE_POLICIES = ['deny-undeclared', 'allow-undeclared'] as const
export type ArchitecturePolicy = (typeof ARCHITECTURE_POLICIES)[number]

export interface ArchitectureModuleDecl {
  name: string
  paths: string[]
  allow?: string[]
  deny?: string[]
  policy?: ArchitecturePolicy
}

export interface ArchitectureFinding {
  from: string
  to: string
  edgeKind: ArchitectureEdgeKind
  file: string
  line: number
  rule: ArchitectureDriftRule
  provenance: 'EXTRACTED'
}

export interface ArchitectureSummary {
  violations: number
  unassignedFiles: number
}

export interface GraphArchitecture {
  config: string
  defaultPolicy?: ArchitecturePolicy
  modules: ArchitectureModuleDecl[]
  unassigned: string[]
  findings?: ArchitectureFinding[]
  summary: ArchitectureSummary
}

export interface Coverage {
  files: {
    discovered: number
    parsed: number
    partial: number
    failed: number
    skipped: number
    ignored: number
  }
  byLanguage: {
    language: string | null
    parsed: number
    partial: number
    failed: number
    skipped: number
  }[]
  skipped: { reason: string; count: number }[]
  ignored: { rule: string; count: number }[]
  unresolved: { reason: string; count: number }[]
  accounting: { discovered: number; accounted: number }
}

export interface GraphDocument {
  schemaVersion: string
  summary: { nodes: number; edges: number; files: number }
  coverage: Coverage
  nodes: GraphNode[]
  edges: GraphEdge[]
  architecture?: GraphArchitecture
}

export type GraphError =
  | { code: 'invalid-json'; where: string }
  | { code: 'unsupported-version'; found: string | null; supportedMajor: number }
  | { code: 'invalid-graph'; paths: string[] }
  | { code: 'too-large'; limitBytes: number; actualBytes: number }

export type ReadResult =
  | { ok: true; graph: GraphDocument }
  | { ok: false; error: GraphError }
