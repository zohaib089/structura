import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { GRAPH_FILE, RUN_FILE } from '@atlasmith/engine'
import { AccountingError, StrictCoverageError } from '@atlasmith/engine'
import { EXIT, exitCodeFor, run } from './run.js'

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

test('help exits 0 and a missing command exits 2', async () => {
  const help = capture()
  assert.equal(await run(['--help'], help.io), EXIT.ok)
  assert.match(help.stdout, /scan \[path\]/)
  const missing = capture()
  assert.equal(await run([], missing.io), EXIT.usage)
  const unknown = capture()
  assert.equal(await run(['explode'], unknown.io), EXIT.usage)
  const flag = capture()
  assert.equal(await run(['scan', '--max-file-size', '0'], flag.io), EXIT.usage)
  const both = capture()
  assert.equal(await run(['scan', '--meta', 'run.json', '--no-meta'], both.io), EXIT.usage)
})

test('scan writes graph.json and json mode prints run metadata', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cli-scan-'))
  const out = mkdtempSync(join(tmpdir(), 'cli-out-'))
  writeFileSync(join(root, 'main.ts'), "import { x } from './other'\nexport const y = 1\n")
  writeFileSync(join(root, 'other.ts'), 'export const x = 2\n')
  const logged = capture()
  try {
    const code = await run(['scan', root, '--out', out, '--no-cache', '--json', '--jobs', '1'], logged.io)
    assert.equal(code, EXIT.ok)
    const meta = JSON.parse(logged.stdout) as { graphPath: string; command: string }
    assert.equal(meta.command, 'scan')
    assert.equal(meta.graphPath, join(out, GRAPH_FILE))
    assert.match(logged.stderr, /discovered/)
    const graph = readFileSync(join(out, GRAPH_FILE), 'utf8')
    assert.equal(graph.endsWith('\n'), true)
    assert.equal(graph.includes('"schemaVersion": "1.0.0"'), true)
    const quiet = capture()
    assert.equal(await run(['scan', root, '--out', out, '--no-cache', '--jobs', '1'], quiet.io), EXIT.ok)
    assert.match(quiet.stdout, new RegExp(`wrote ${join(out, GRAPH_FILE).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
    assert.equal(readFileSync(join(out, RUN_FILE), 'utf8').includes('"command": "scan"'), true)
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(out, { recursive: true, force: true })
  }
})

test('exit codes for accounting, strict coverage and usage stay distinct', () => {
  assert.equal(exitCodeFor(new AccountingError('dropped')), EXIT.accounting)
  assert.equal(exitCodeFor(new StrictCoverageError(['failed'])), EXIT.strict)
  assert.equal(EXIT.interrupted, 130)
})
