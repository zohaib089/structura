import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { GRAPH_FILE, RUN_FILE } from '@atlasmith/engine'
import { AccountingError, MaxFilesExceeded, ScanRootError, StrictCoverageError } from '@atlasmith/engine'
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
  const cacheConflict = capture()
  assert.equal(await run(['scan', '--cache-dir', '/tmp/x', '--no-cache'], cacheConflict.io), EXIT.usage)
  const unknownFlag = capture()
  assert.equal(await run(['scan', '--not-a-flag'], unknownFlag.io), EXIT.usage)
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
  assert.equal(exitCodeFor(new MaxFilesExceeded(10)), EXIT.usage)
  assert.equal(exitCodeFor(new ScanRootError('missing')), EXIT.usage)
  assert.equal(EXIT.interrupted, 130)
})

test('scan exits 2 for a missing root and for max-files exceeded', async () => {
  const missing = capture()
  assert.equal(await run(['scan', '/nonexistent-path-7e31'], missing.io), EXIT.usage)
  assert.match(missing.stderr, /scan root|nonexistent|ENOENT/i)
  const root = mkdtempSync(join(tmpdir(), 'cli-max-'))
  writeFileSync(join(root, 'a.ts'), 'export {}\n')
  writeFileSync(join(root, 'b.ts'), 'export {}\n')
  const out = mkdtempSync(join(tmpdir(), 'cli-out-'))
  try {
    const tooMany = capture()
    assert.equal(await run(['scan', root, '--out', out, '--no-cache', '--max-files', '1', '--jobs', '1'], tooMany.io), EXIT.usage)
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(out, { recursive: true, force: true })
  }
})

test('scan --out ending in .json writes that path as the graph file', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cli-scan-json-out-'))
  writeFileSync(join(root, 'main.ts'), 'export const x = 1\n')
  const graphOut = join(mkdtempSync(join(tmpdir(), 'cli-graph-file-')), 'graph.json')
  const cap = capture()
  try {
    assert.equal(await run(['scan', root, '--out', graphOut, '--no-cache', '--jobs', '1'], cap.io), EXIT.ok)
    assert.match(cap.stdout, new RegExp(`wrote ${graphOut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
    assert.equal(readFileSync(graphOut, 'utf8').includes('"schemaVersion": "1.0.0"'), true)
    assert.throws(() => readFileSync(join(graphOut, GRAPH_FILE), 'utf8'))
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(dirname(graphOut), { recursive: true, force: true })
  }
})

test('human-readable CLI output escapes control characters in paths', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cli-esc-'))
  const out = join(root, `out\u202edir`)
  mkdirSync(out, { recursive: true })
  writeFileSync(join(root, 'main.ts'), 'export const x = 1\n')
  const cap = capture()
  try {
    await run(['scan', root, '--out', out, '--no-cache', '--jobs', '1'], cap.io)
    assert.match(cap.stdout, /\\u\{202e\}/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
