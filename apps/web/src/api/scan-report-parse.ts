import Ajv2020 from 'ajv/dist/2020.js'
import type { ValidateFunction } from 'ajv'
import reportSchema from '../../../../packages/scan-analysis/schema/report.v1.schema.json'
import type { ScanReportV1 } from './scan-report-types'

let cachedValidator: ValidateFunction | undefined

function getValidator(): ValidateFunction {
  if (!cachedValidator) {
    const ajv = new Ajv2020({ allErrors: true, strict: true })
    cachedValidator = ajv.compile(reportSchema)
  }
  return cachedValidator
}

export function parseScanReportV1(value: unknown): ScanReportV1 {
  const validate = getValidator()
  if (!validate(value)) {
    throw new Error('The scan report response was invalid.')
  }
  return value as ScanReportV1
}
