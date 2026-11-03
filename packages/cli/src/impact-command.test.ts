import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { run } from './run.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, '../../engine/schema-fixtures')
const graphFile = 'v1.0.0.graph.json'

async function captureImpact(argv: string[]) {
  let stdout = ''
  let stderr = ''
  const code = await run(['impact', ...argv], {
    cwd: fixtureDir,
    stdout: text => { stdout += text },
    stderr: text => { stderr += text }
  })
  return { code, stdout, stderr }
}

test('impact requires a target argument', async () => {
  const { code, stderr } = await captureImpact([`--graph`, graphFile])
  assert.equal(code, 2)
  assert.match(stderr, /usage:/)
})

test('impact prints json upstream on canary file', async () => {
  const { code, stdout } = await captureImpact(['src/app.ts', '--graph', graphFile, '--json'])
  assert.equal(code, 0)
  const result = JSON.parse(stdout) as { upstream: { nodes: string[] }[]; downstream: unknown[] }
  assert.equal(result.upstream.length, 1)
  assert.equal(result.upstream[0]?.nodes.at(-1), 'ext:npm:left-pad')
  assert.deepEqual(result.downstream, [])
})

test('impact exits 2 for unknown target', async () => {
  const { code, stderr } = await captureImpact(['missing.ts', '--graph', graphFile])
  assert.equal(code, 2)
  assert.match(stderr, /unknown impact target/)
})
