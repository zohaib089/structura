import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPORT_SCHEMA_VERSION } from '../../src/api/scan-report-types'

describe('report.json v1 schema alignment', () => {
  it('keeps REPORT_SCHEMA_VERSION in sync with the canonical schema file', () => {
    const schemaPath = resolve(
      import.meta.dirname,
      '../../../../packages/scan-analysis/schema/report.v1.schema.json'
    )
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as {
      properties?: { schemaVersion?: { const?: string } }
    }
    expect(schema.properties?.schemaVersion?.const).toBe(REPORT_SCHEMA_VERSION)
  })
})
