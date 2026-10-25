/**
 * Browser-safe entry (subpath `@atlasmith/engine/graph-reader`): types, `readGraph`, schema and ids.
 * No Node built-ins, no Ajv, no eval/new Function => works under a strict Content-Security-Policy.
 */
export * from './types.js'
export * from './ids.js'
export * from './errors.js'
export { buildGraphJsonSchema } from './schema.js'
export { checkAgainstSchema, type SchemaIssue, type CheckOptions } from './schema-check.js'
export { checkSemantics, type SemanticOptions } from './semantic.js'
export { readGraph, peekSchemaVersion, type ReadGraphOptions, type ReadGraphResult } from './read.js'
