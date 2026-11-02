import { createHash } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGraphJsonSchema } from '../src/graph/schema.js'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../schema')
const target = resolve(dir, 'graph.v1.schema.json')
const hashTarget = resolve(dir, 'SCHEMA_HASH')
mkdirSync(dir, { recursive: true })
const json = `${JSON.stringify(buildGraphJsonSchema(), null, 2)}\n`
writeFileSync(target, json)
writeFileSync(hashTarget, `${createHash('sha256').update(json).digest('hex')}\n`)
console.log(`wrote ${target}`)
console.log(`wrote ${hashTarget}`)
