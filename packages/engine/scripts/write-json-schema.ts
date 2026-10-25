import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGraphJsonSchema } from '../src/graph/schema.js'

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../schema/graph.v1.schema.json')
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, `${JSON.stringify(buildGraphJsonSchema(), null, 2)}\n`)
console.log(`wrote ${target}`)
