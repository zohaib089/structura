export type Provenance = 'EXTRACTED' | 'INFERRED'

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
}

export type GraphError =
  | { code: 'invalid-json'; where: string }
  | { code: 'unsupported-version'; found: string | null; supportedMajor: number }
  | { code: 'invalid-graph'; paths: string[] }
  | { code: 'too-large'; limitBytes: number; actualBytes: number }

export type ReadResult =
  | { ok: true; graph: GraphDocument }
  | { ok: false; error: GraphError }
