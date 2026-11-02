import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { analyseGraphHeuristics } from './graph-heuristics.js'
import { runScanAnalysis } from './run-analysis.js'

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'engine',
  'schema-fixtures',
  'v1.0.0.graph.json'
)

test('graph heuristics flag unused npm dependency', () => {
  const graph = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
    nodes: Array<Record<string, unknown>>
  }
  graph.nodes.push({
    id: 'ext:npm:unused-pkg',
    kind: 'external',
    ecosystem: 'npm',
    label: 'unused-pkg'
  })
  const result = analyseGraphHeuristics(graph)
  assert.ok(
    result.removals.some(
      finding => finding.rule === 'graph/unused-dependency' && finding.file === 'unused-pkg'
    )
  )
})

test('graph heuristics detects large files when lineCount exceeds threshold', () => {
  const graph = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
    nodes: Array<Record<string, unknown>>
  }
  graph.nodes = graph.nodes.map(node =>
    node.kind === 'file' ? { ...node, lineCount: 900 } : node
  )
  const result = analyseGraphHeuristics(graph)
  assert.ok(result.badPractices.some(finding => finding.rule === 'graph/large-file'))
})

test('runScanAnalysis skips history without git', async () => {
  const report = await runScanAnalysis({
    rootDir: '/tmp/empty',
    graph: JSON.parse(readFileSync(fixturePath, 'utf8')),
    hasGit: false,
    runCommand: async () => ({
      stdout: '',
      stderr: '',
      code: 0,
      timedOut: false
    })
  })
  assert.equal(report.analysers.history.status, 'skipped')
  assert.equal(report.history, null)
  assert.equal(report.schemaVersion, '1.0.0')
})
