import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { GRAPH_FILE, readGraph, type Graph } from '@atlasmith/engine'
import {
  PR_COMMENT_MARKER,
  buildPrReport,
  code,
  parseNameStatusZ,
  renderPrComment,
  type ChangedFile
} from './pr-comment.js'
import { EXIT, run } from './run.js'

const fixtures = fileURLToPath(new URL('../fixtures/pr-check/', import.meta.url))
const update = process.env.PR_COMMENT_UPDATE === '1'
const silent = { stdout: () => undefined, stderr: () => undefined, cwd: process.cwd() }

async function scanFixture(name: string, expectedExit: number): Promise<Graph> {
  const out = mkdtempSync(join(tmpdir(), 'pr-comment-'))
  try {
    const exit = await run(['scan', join(fixtures, name), '--out', out, '--no-cache', '--no-meta', '--jobs', '1', '--strict-architecture'], silent)
    assert.equal(exit, expectedExit, `scan ${name} exit code`)
    return readGraph(readFileSync(join(out, GRAPH_FILE), 'utf8')).graph
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}

function expectComment(name: string, actual: string): void {
  const file = join(fixtures, 'expected', name)
  if (update) writeFileSync(file, actual)
  assert.equal(actual, readFileSync(file, 'utf8'))
}

const SHA = '0123456789abcdef0123456789abcdef01234567'

test('rule-breaking pull request: exact comment text', async () => {
  const base = await scanFixture('base', EXIT.ok)
  const head = await scanFixture('head-violation', EXIT.strict)
  const changed: ChangedFile[] = [
    { path: 'src/ui/view.ts', status: 'modified' },
    { path: 'src/ui/labels.ts', status: 'added' },
    { path: 'src/services/users.ts', status: 'modified' },
    { path: 'src/db/query.ts', status: 'modified' },
    { path: 'README.md', status: 'modified' }
  ]
  const report = buildPrReport({ headGraph: head, baseGraph: base, changed })
  assert.equal(report.findings.length, 2)
  assert.ok(report.findings.every(finding => finding.isNew))
  const body = renderPrComment(report, { headSha: SHA })
  assert.ok(body.startsWith(`${PR_COMMENT_MARKER}\n`))
  expectComment('violation.md', body)
})

test('clean pull request: exact comment text', async () => {
  const base = await scanFixture('base', EXIT.ok)
  const head = await scanFixture('head-clean', EXIT.ok)
  const changed: ChangedFile[] = [
    { path: 'src/db/query.ts', status: 'modified' },
    { path: 'src/ui/format.ts', status: 'added' },
    { path: 'src/ui/view.ts', status: 'modified' }
  ]
  const report = buildPrReport({ headGraph: head, baseGraph: base, changed })
  assert.equal(report.findings.length, 0)
  expectComment('clean.md', renderPrComment(report, { headSha: SHA }))
})

test('no architecture config and a deleted file use the base graph for impact', async () => {
  const base = await scanFixture('base', EXIT.ok)
  const head: Graph = { ...base, architecture: undefined } as Graph
  const report = buildPrReport({ headGraph: head, baseGraph: base, changed: [{ path: 'src/db/query.ts', status: 'deleted' }] })
  assert.deepEqual(report.affected.map(file => file.path), ['src/services/users.ts', 'src/ui/view.ts', 'src/main.ts'])
  const body = renderPrComment(report)
  assert.match(body, /1 file changed\. 3 other files depend on it /)
  assert.match(body, /No architecture rules are declared yet/)
  assert.match(body, /`src\/db\/query\.ts` deleted/)
})

test('parseNameStatusZ reads git -z output', () => {
  const text = 'M\0src/a.ts\0A\0src/new file.ts\0D\0old.ts\0T\0link\0X\0weird\0'
  assert.deepEqual(parseNameStatusZ(text), [
    { path: 'link', status: 'modified' },
    { path: 'old.ts', status: 'deleted' },
    { path: 'src/a.ts', status: 'modified' },
    { path: 'src/new file.ts', status: 'added' }
  ])
})

test('code spans neutralise backticks, newlines and HTML comment tricks in PR paths', () => {
  assert.equal(code('a`b\n<!-- x -->'), "`a'b?<!-- x -->`")
  const report = buildPrReport({ headGraph: { nodes: [], edges: [] } as unknown as Graph, changed: [{ path: 'evil`\n@everyone.md', status: 'added' }] })
  const body = renderPrComment(report)
  assert.ok(!body.includes('\n@everyone'))
  assert.match(body, /`evil'\?@everyone\.md` added \(not in the code graph/)
})

test('very long reports are truncated below the GitHub comment limit', () => {
  const changed = Array.from({ length: 2000 }, (_, i) => ({ path: `${'d/'.repeat(90)}f${i}.md`, status: 'added' as const }))
  const report = buildPrReport({ headGraph: { nodes: [], edges: [] } as unknown as Graph, changed })
  const body = renderPrComment(report, { maxListed: 5000 })
  assert.ok(body.length <= 60_000)
  assert.match(body, /Comment truncated/)
})
