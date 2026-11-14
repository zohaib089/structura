export const ARCHITECTURE_POLICIES = ['deny-undeclared', 'allow-undeclared'] as const
export type ArchitecturePolicy = typeof ARCHITECTURE_POLICIES[number]

export const ARCHITECTURE_DRIFT_RULES = ['deny-list', 'allow-list', 'deny-undeclared'] as const
export type ArchitectureDriftRule = typeof ARCHITECTURE_DRIFT_RULES[number]

export const ARCHITECTURE_EDGE_KINDS = ['imports', 'reexports', 'calls'] as const
export type ArchitectureEdgeKind = typeof ARCHITECTURE_EDGE_KINDS[number]

export interface ArchitectureModuleDecl {
  name: string
  paths: readonly string[]
  allow?: readonly string[]
  deny?: readonly string[]
  policy?: ArchitecturePolicy
}

export interface ResolvedArchitecture {
  configPath: string
  defaultPolicy?: ArchitecturePolicy
  modules: readonly ArchitectureModuleDecl[]
}

export interface ArchitectureFinding {
  from: string
  to: string
  edgeKind: ArchitectureEdgeKind
  file: string
  line: number
  rule: ArchitectureDriftRule | string
  /** INFERRED when the import names a workspace package whose entry file was mapped (e.g. dist -> src). */
  provenance: 'EXTRACTED' | 'INFERRED'
}

export interface ArchitectureSummary {
  violations: number
  unassignedFiles: number
}
