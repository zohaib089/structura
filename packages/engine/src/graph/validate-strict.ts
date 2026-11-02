import { Ajv2020 } from 'ajv/dist/2020.js'
import { buildGraphJsonSchema } from './schema.js'
import { checkSemantics } from './semantic.js'
import type { SchemaIssue } from './schema-check.js'
import type { Graph } from './types.js'

export interface ValidationResult {
  ok: boolean
  issues: SchemaIssue[]
}

let validator: ReturnType<Ajv2020['compile']> | undefined

function compiled(): ReturnType<Ajv2020['compile']> {
  if (!validator) {
    // strict:true => unknown keywords / ambiguous schemas are compile-time errors, never silently ignored.
    const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
    validator = ajv.compile(buildGraphJsonSchema())
  }
  return validator
}

/**
 * Producer-side check run on every graph before it is written: the JSON Schema compiled by
 * Ajv in strict mode (closed objects, no unknown properties) plus the semantic rules.
 * Node-only (Ajv uses code generation); the viewer uses `readGraph`.
 */
export function validateStrict(graph: unknown): ValidationResult {
  const validate = compiled()
  if (!validate(graph)) {
    const issues = (validate.errors ?? []).slice(0, 200).map(error => ({
      path: error.instancePath,
      message: `${error.message ?? 'invalid'}${error.params && 'additionalProperty' in error.params ? ` "${String(error.params.additionalProperty)}"` : ''}`
    }))
    return { ok: false, issues }
  }
  const issues = checkSemantics(graph as Graph)
  return { ok: issues.length === 0, issues }
}
