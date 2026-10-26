import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGraphJsonSchema } from './schema.js'

/** Canonical schema document: the bytes written to `schema/graph.v1.schema.json`. */
export function schemaDocumentText(): string {
  return `${JSON.stringify(buildGraphJsonSchema(), null, 2)}\n`
}

/** SHA-256 of {@link schemaDocumentText}. This is the value stored in `schema/SCHEMA_HASH`. */
export function hashSchemaDocument(text: string = schemaDocumentText()): string {
  return createHash('sha256').update(text).digest('hex')
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export const SCHEMA_JSON_PATH = resolve(packageRoot, 'schema/graph.v1.schema.json')
export const SCHEMA_HASH_PATH = resolve(packageRoot, 'schema/SCHEMA_HASH')
export const CANARY_GRAPH_PATH = resolve(packageRoot, 'schema-fixtures/v1.0.0.graph.json')

export function readCheckedInSchema(): string {
  return readFileSync(SCHEMA_JSON_PATH, 'utf8')
}

export function readCheckedInSchemaHash(): string {
  return readFileSync(SCHEMA_HASH_PATH, 'utf8').trim()
}
