import { GraphReadError, GraphVersionUnsupported, MAX_REPORTED_ISSUES } from './errors.js'
import { buildGraphJsonSchema } from './schema.js'
import { checkAgainstSchema } from './schema-check.js'
import { checkSemantics } from './semantic.js'
import { GRAPH_SCHEMA_MAJOR, GRAPH_SCHEMA_MINOR, type Graph } from './types.js'

export interface ReadGraphOptions {
  /** Refuse inputs larger than this many UTF-16 code units (default 256 MiB). */
  maxLength?: number
  /** Maximum JSON nesting depth (default 64). */
  maxDepth?: number
}

export interface ReadGraphResult {
  graph: Graph
  /** `schemaVersion` of the document as written. */
  version: string
  /** True when the document is a newer minor version: unknown properties were dropped, unknown kinds kept generically. */
  newerMinor: boolean
}

const DEFAULT_MAX_LENGTH = 256 * 1024 * 1024
const DEFAULT_MAX_DEPTH = 64
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/

let cachedSchema: Record<string, unknown> | undefined

/** Browser-safe: reads the version without parsing the whole document (looks at the first 4 KiB). */
export function peekSchemaVersion(text: string): string | undefined {
  const match = /"schemaVersion"\s*:\s*"([^"\\]{1,32})"/.exec(text.slice(0, 4096))
  return match?.[1]
}

/** Iterative scan (strings aware) so that a hostile 10 MB `[[[[…` cannot blow the parser stack. */
function assertDepth(text: string, maxDepth: number): void {
  let depth = 0
  let inString = false
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i)
    if (inString) {
      if (c === 92) i += 1
      else if (c === 34) inString = false
    } else if (c === 34) inString = true
    else if (c === 123 || c === 91) {
      depth += 1
      if (depth > maxDepth) throw new GraphReadError('GraphInvalid', `JSON nesting is deeper than ${maxDepth} levels`, { issues: [{ path: '', message: `nesting deeper than ${maxDepth}` }] })
    } else if (c === 125 || c === 93) depth -= 1
  }
}

/**
 * Parses and validates a graph.json document. The one entry point for consumers (CLI, viewer).
 *  - major above the supported one => GraphVersionUnsupported (CLI exit 2)
 *  - same major, newer minor => accepted: unknown properties stripped, unknown kinds/types kept generically
 *  - any structural or semantic problem => GraphInvalid carrying the first 20 JSON-pointer paths; nothing is partially loaded
 * No eval, no Ajv, no Node APIs: safe to bundle under a strict CSP.
 */
export function readGraph(input: string | unknown, options: ReadGraphOptions = {}): ReadGraphResult {
  let document: unknown = input
  if (typeof input === 'string') {
    if (input.length > (options.maxLength ?? DEFAULT_MAX_LENGTH)) throw new GraphReadError('GraphTooLarge', 'graph.json is too large to load')
    assertDepth(input, options.maxDepth ?? DEFAULT_MAX_DEPTH)
    try {
      document = JSON.parse(input.charCodeAt(0) === 0xfeff ? input.slice(1) : input, (key, value: unknown) => {
        if (FORBIDDEN_KEYS.has(key)) throw new GraphReadError('GraphInvalid', `forbidden key "${key}"`, { issues: [{ path: `/${key}`, message: 'forbidden key' }] })
        return value
      })
    } catch (error) {
      if (error instanceof GraphReadError) throw error
      throw new GraphReadError('GraphParseError', `graph.json is not valid JSON: ${(error as Error).message}`)
    }
  } else {
    assertObjectSafe(document, options.maxDepth ?? DEFAULT_MAX_DEPTH)
  }

  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    throw new GraphReadError('GraphInvalid', 'graph.json must be a JSON object', { issues: [{ path: '', message: 'must be object' }] })
  }
  const version = (document as Record<string, unknown>).schemaVersion
  const parsed = typeof version === 'string' ? VERSION.exec(version) : null
  if (!parsed) {
    throw new GraphReadError('GraphInvalid', 'graph.json has no valid schemaVersion', { issues: [{ path: '/schemaVersion', message: 'missing or not a MAJOR.MINOR.PATCH string' }] })
  }
  const major = Number(parsed[1])
  const minor = Number(parsed[2])
  if (major !== GRAPH_SCHEMA_MAJOR) throw new GraphVersionUnsupported(version as string, GRAPH_SCHEMA_MAJOR)
  const newerMinor = minor > GRAPH_SCHEMA_MINOR

  cachedSchema ??= buildGraphJsonSchema()
  const checked = checkAgainstSchema(cachedSchema, document, { mode: 'tolerant', lenient: newerMinor })
  if (checked.issues.length > 0) throw invalid(checked.issues)
  const graph = checked.value as Graph
  const semantic = checkSemantics(graph, { requireCanonicalOrder: !newerMinor })
  if (semantic.length > 0) throw invalid(semantic)
  return { graph, version: version as string, newerMinor }
}

function invalid(issues: { path: string; message: string }[]): GraphReadError {
  const shown = issues.slice(0, MAX_REPORTED_ISSUES)
  return new GraphReadError('GraphInvalid', `graph.json is invalid (${issues.length >= MAX_REPORTED_ISSUES ? `${MAX_REPORTED_ISSUES}+` : issues.length} problem(s)); first: ${shown[0]?.path || '/'} ${shown[0]?.message}`, { issues: shown })
}

function assertObjectSafe(value: unknown, maxDepth: number, depth = 0): void {
  if (typeof value !== 'object' || value === null) return
  if (depth > maxDepth) throw new GraphReadError('GraphInvalid', `nesting is deeper than ${maxDepth} levels`)
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new GraphReadError('GraphInvalid', `forbidden key "${key}"`, { issues: [{ path: `/${key}`, message: 'forbidden key' }] })
    assertObjectSafe((value as Record<string, unknown>)[key], maxDepth, depth + 1)
  }
}
