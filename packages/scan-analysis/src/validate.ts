import { Ajv2020 } from 'ajv/dist/2020.js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ScanReport } from './types.js'

let cachedValidator: ReturnType<Ajv2020['compile']> | undefined

function loadSchema(): object {
  const here = dirname(fileURLToPath(import.meta.url))
  const schemaPath = join(here, '..', 'schema', 'report.v1.schema.json')
  return JSON.parse(readFileSync(schemaPath, 'utf8')) as object
}

export function validateScanReport(report: ScanReport): void {
  if (!cachedValidator) {
    const ajv = new Ajv2020({ allErrors: true, strict: true })
    cachedValidator = ajv.compile(loadSchema())
  }
  const valid = cachedValidator!(report)
  if (!valid) {
    const detail = cachedValidator!.errors?.map(error => `${error.instancePath} ${error.message}`).join('; ')
    throw new Error(`report.json failed schema validation: ${detail ?? 'unknown error'}`)
  }
}
