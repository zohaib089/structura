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
export {
  HOTSPOTS_DEFAULT_LIMIT,
  attachHotspots,
  collectFileHotspotSignals,
  describeHotspot,
  type FileHotspotSignals
} from './hotspots.js'
export {
  attachQuality,
  collectQualityInputs,
  gradeOf,
  penaltiesOf,
  scoreOf,
  tipsOf,
  QUALITY_CAPS,
  type QualityInputs
} from './quality.js'
export {
  attachDuplicates,
  buildDuplicates,
  detectDuplicateGroups,
  DUPLICATES_DEFAULT_LIMIT,
  MIN_MEANINGFUL_LINES,
  MIN_BLOCK_CHARS
} from './duplicates.js'
export {
  GRAPH_QA_INTENTS,
  GRAPH_QA_MAX_QUESTION_LENGTH,
  answerGraphQuestion,
  isGraphLike,
  type GraphQaCitation,
  type GraphQaCitationKind,
  type GraphQaIntent,
  type GraphQaResponse
} from './qa.js'
export { CANARY_GRAPH_PATH, CANARY_V110_GRAPH_PATH, CANARY_V120_GRAPH_PATH, CANARY_V130_GRAPH_PATH, CANARY_V140_GRAPH_PATH, SCHEMA_HASH_PATH, SCHEMA_JSON_PATH, hashSchemaDocument, readCheckedInSchema, readCheckedInSchemaHash, schemaDocumentText } from './hash.js'
