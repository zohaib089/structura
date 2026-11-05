import assert from 'node:assert/strict'
import test from 'node:test'
import { buildImprovements } from './improvements.js'
import type { ScanFinding } from './types.js'

function finding(id: string, severity: ScanFinding['severity']): ScanFinding {
  return {
    id,
    section: 'badPractices',
    severity,
    file: 'src/big.ts',
    message: 'Large file',
    rule: 'graph/large-file',
    provenance: 'EXTRACTED'
  }
}

test('improvement severity keeps critical distinct from high', () => {
  const [critical] = buildImprovements([finding('a', 'critical'), finding('b', 'high')])
  assert.equal(critical?.severity, 'critical')
  const [high] = buildImprovements([finding('a', 'high'), finding('b', 'low')])
  assert.equal(high?.severity, 'high')
  const [medium] = buildImprovements([finding('a', 'low')])
  assert.equal(medium?.severity, 'medium')
})
