import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { CANARY_GRAPH_PATH } from '@atlasmith/engine'
import { EXIT, run } from './run.js'

const here = dirname(fileURLToPath(import.meta.url))
const canary = join(here, '../../engine/schema-fixtures/v1.0.0.graph.json')

function capture(): { stdout: string; stderr: string; io: { stdout: (text: string) => void; stderr: (text: string) => void; cwd: string } } {
  const chunks = { stdout: '', stderr: '' }
  return {
    get stdout() { return chunks.stdout },
    get stderr() { return chunks.stderr },
    io: {
      stdout: text => { chunks.stdout += text },
      stderr: text => { chunks.stderr += text },
      cwd: process.cwd()
    }
  }
}

test('query lists nodes and supports json output', async () => {
  const cap = capture()
  assert.equal(await run(['query', canary, '--kind', 'file'], cap.io), EXIT.ok)
  assert.match(cap.stdout, /file:src\/app\.ts  file  app\.ts/)
  const json = capture()
  assert.equal(await run(['query', canary, '--type', 'imports', '--json'], json.io), EXIT.ok)
  const parsed = JSON.parse(json.stdout) as { mode: string; edges: unknown[] }
  assert.equal(parsed.mode, 'edges')
  assert.equal(parsed.edges.length, 1)
})

test('explain reports unknown ids with exit 2', async () => {
  const cap = capture()
  assert.equal(await run(['explain', canary, 'missing.ts'], cap.io), EXIT.usage)
  assert.match(cap.stderr, /unknown node/)
})

test('explain json includes grouped edges', async () => {
  const cap = capture()
  assert.equal(await run(['explain', canary, 'src/app.ts', '--json'], cap.io), EXIT.ok)
  const parsed = JSON.parse(cap.stdout) as { kind: string; outbound: Record<string, unknown[]> }
  assert.equal(parsed.kind, 'file')
  assert.equal(parsed.outbound.imports?.length, 1)
})

test('query exits 2 for invalid graph path usage', async () => {
  const cap = capture()
  assert.equal(await run(['query', canary], cap.io), EXIT.ok)
  assert.equal(await run(['query'], cap.io), EXIT.usage)
  assert.equal(await run(['query', '/no/such/graph.json'], cap.io), EXIT.usage)
})

test('canary path matches engine fixture', () => {
  assert.equal(readFileSync(canary, 'utf8'), readFileSync(CANARY_GRAPH_PATH, 'utf8'))
})
