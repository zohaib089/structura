import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
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

test('export writes mermaid to stdout', async () => {
  const cap = capture()
  assert.equal(await run(['export', '--format', 'mermaid', '--graph', canary], cap.io), EXIT.ok)
  assert.match(cap.stdout, /^flowchart LR/)
})

test('export rejects invalid format with exit 2', async () => {
  const cap = capture()
  assert.equal(await run(['export', '--format', 'pdf', '--graph', canary], cap.io), EXIT.usage)
  assert.match(cap.stderr, /unsupported export format/)
})

test('export requires format flag', async () => {
  const cap = capture()
  assert.equal(await run(['export', '--graph', canary], cap.io), EXIT.usage)
})

test('export obsidian requires output directory', async () => {
  const cap = capture()
  assert.equal(await run(['export', '--format', 'obsidian', '--graph', canary], cap.io), EXIT.usage)
  assert.match(cap.stderr, /requires --out/)
})

test('export obsidian writes notes under directory', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'export-notes-'))
  try {
    const cap = capture()
    assert.equal(await run(['export', '--format', 'obsidian', '--graph', canary, '--out', dir], cap.io), EXIT.ok)
    const index = readFileSync(join(dir, 'index.md'), 'utf8')
    assert.match(index, /\[\[module-src\]\]/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('export missing graph path exits 2', async () => {
  const cap = capture()
  assert.equal(await run(['export', '--format', 'mermaid', '--graph', '/no/such/graph.json'], cap.io), EXIT.usage)
})
