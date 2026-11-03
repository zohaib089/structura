export * from './types.js'
export * from './ids.js'
export * from './errors.js'
export { buildGraphJsonSchema } from './schema.js'
export { checkAgainstSchema, type SchemaIssue, type CheckOptions } from './schema-check.js'
export { checkSemantics, type SemanticOptions } from './semantic.js'
export { readGraph, peekSchemaVersion, type ReadGraphOptions, type ReadGraphResult } from './read.js'
export { GraphNodeNotFoundError, resolveNodeRef, indexNodes } from './resolve-ref.js'
export { queryGraph, QueryUsageError, type QueryGraphOptions, type QueryGraphResult } from './query.js'
export { explainGraphNode, type ExplainNodeResult, type ExplainedEdge } from './explain.js'
export {
  IMPACT_DEFAULT_DEPTH,
  IMPACT_MAX_DEPTH,
  ImpactTargetAmbiguousError,
  ImpactTargetNotFoundError,
  ImpactUsageError,
  graphImpact,
  impactNodeLabel,
  resolveImpactTarget,
  walkFileImpact,
  type GraphImpactResult,
  type ImpactPath,
  type ImpactPathEdge,
  type ImpactTarget,
  type ImpactTargetCandidate,
  type WalkFileImpactOptions,
  type WalkFileImpactResult
} from './impact.js'
export { validateStrict, type ValidationResult } from './validate-strict.js'
export { canonicalizeGraph, serializeGraph, graphChunks, compareEdges, compareNodes } from './canonical.js'
export { GraphBuilder } from './builder.js'
export { CANARY_GRAPH_PATH, SCHEMA_HASH_PATH, SCHEMA_JSON_PATH, hashSchemaDocument, readCheckedInSchema, readCheckedInSchemaHash, schemaDocumentText } from './hash.js'
