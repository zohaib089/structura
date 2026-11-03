export { assignModule, buildModuleMap } from './assign-modules.js'
export { buildArchitectureConfigSchema, buildArchitectureSectionSchema, ARCHITECTURE_CONFIG_SCHEMA_ID } from './config-schema.js'
export { detectArchitectureDrift } from './drift.js'
export { ArchitectureConfigError } from './errors.js'
export { loadArchitectureFromYaml } from './load-config.js'
export {
  ARCHITECTURE_DRIFT_RULES,
  ARCHITECTURE_EDGE_KINDS,
  ARCHITECTURE_POLICIES,
  type ArchitectureDriftRule,
  type ArchitectureEdgeKind,
  type ArchitectureFinding,
  type ArchitectureModuleDecl,
  type ArchitecturePolicy,
  type ArchitectureSummary,
  type ResolvedArchitecture
} from './types.js'
export { formatIssues, resolveArchitectureConfig } from './validate-config.js'
