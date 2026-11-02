import { findRestrictionViolations } from '../src/security/restrictions.js'
import { fileURLToPath } from 'node:url'

const violations = findRestrictionViolations(fileURLToPath(new URL('../../../', import.meta.url)))
if (violations.length > 0) {
  for (const violation of violations) console.error(violation)
  process.exit(1)
}
console.log('restriction lint passed')
