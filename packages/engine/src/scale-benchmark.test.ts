import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  generateSyntheticRepo,
  planSyntheticRepo,
  runScaleBenchmark
} from '../../../scripts/scale-benchmark.mjs'

test('planSyntheticRepo is deterministic and hits the requested file count', () => {
  const first = planSyntheticRepo(25)
  const second = planSyntheticRepo(25)
  assert.deepEqual(first, second)
  assert.equal(first.fileCount, 25)
  assert.equal(first.files.length, 25)
  assert.equal(first.tsCount + first.pythonCount, 25)
  assert.ok(first.files.some(file => file.path === 'src/index.ts'))
  assert.ok(first.files.some(file => file.path === 'src/core/shared.ts'))
  assert.ok(first.files.some(file => file.path === 'main.py'))
  assert.ok(first.files.some(file => file.hasDuplicate))
  assert.ok(first.files.some(file => file.language === 'python'))
  assert.deepEqual(planSyntheticRepo(24), planSyntheticRepo(24))
  assert.notDeepEqual(planSyntheticRepo(24).files.map(file => file.path), first.files.map(file => file.path))
})

test('generateSyntheticRepo writes a multi-folder TypeScript and Python tree', async () => {
  const root = await mkdtemp(join(tmpdir(), 'scale-gen-'))
  try {
    const generated = await generateSyntheticRepo(root, 25)
    assert.equal(generated.files.length, 25)
    for (const file of generated.files) {
      assert.equal(existsSync(join(root, file.path)), true, file.path)
    }
    const shared = generated.files.find(file => file.path === 'src/core/shared.ts')
    assert.ok(shared)
    const importer = generated.files.find(
      file => file.language === 'typescript' && file.path !== shared.path && file.path.split('/').length >= 3
    )
    assert.ok(importer)
    const { readFile } = await import('node:fs/promises')
    const text = await readFile(join(root, importer.path), 'utf8')
    assert.match(text, /import \{ shared \} from '[^']+'/)
    assert.match(text, /from '\.\./)
    assert.ok(generated.files.some(file => file.hasDuplicate))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('runScaleBenchmark scans 25 files, answers questions, and cleans up', { timeout: 60_000 }, async () => {
  const report = await runScaleBenchmark({ fileCount: 25, rssIntervalMs: 25 })
  assert.equal(report.generatedFiles, 25)
  assert.equal(report.fileCount, 25)
  assert.equal(report.cleaned, true)
  assert.equal(existsSync(report.tempDir), false)
  assert.ok(report.generateMs > 0)
  assert.ok(report.scanMs > 0)
  assert.ok(report.peakRssBytes > 0)
  assert.ok(report.graphJsonBytes > 0)
  assert.equal(report.graph.schemaVersion, '1.4.0')
  assert.equal(report.graph.files, 25)
  assert.ok(report.graph.nodes > 25)
  assert.ok(report.coverage?.parsed ?? 0 >= 20)
  assert.equal(report.coverage?.failed ?? 0, 0)
  assert.ok(report.graph.hotspots.count >= 0)
  assert.ok(report.graph.quality)
  assert.ok(report.graph.quality.score >= 0)
  assert.ok(report.qaCount >= 8)
  const intents = new Set(report.qa.map((item: { intent: string }) => item.intent))
  assert.ok(intents.has('overview'))
  assert.ok(intents.has('quality') || intents.has('hotspots') || intents.has('duplicates') || intents.has('architecture'))
  assert.ok(report.qa.every(item => item.ms >= 0))
  const again = await runScaleBenchmark({ fileCount: 25, rssIntervalMs: 25 })
  assert.equal(again.graph.files, report.graph.files)
  assert.equal(again.graph.nodes, report.graph.nodes)
  assert.equal(again.graph.edges, report.graph.edges)
  assert.equal(again.graphJsonBytes, report.graphJsonBytes)
  assert.deepEqual(
    again.qa.map((item: { intent: string }) => item.intent),
    report.qa.map((item: { intent: string }) => item.intent)
  )
})
