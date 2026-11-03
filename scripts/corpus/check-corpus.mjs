#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { listCorpusCases, scanFixtureRepo } from './lib.mjs'

const cases = listCorpusCases()
if (cases.length === 0) {
  console.error('No golden corpus cases under packages/test-fixtures/*/repo')
  process.exit(1)
}

let failed = 0

for (const corpusCase of cases) {
  if (!fs.existsSync(corpusCase.expectedPath)) {
    console.error(`Missing snapshot: ${corpusCase.expectedPath}`)
    failed += 1
    continue
  }
  const expected = fs.readFileSync(corpusCase.expectedPath, 'utf8')
  const actual = await scanFixtureRepo(corpusCase.repoPath)
  if (actual === expected) {
    console.log(`ok ${corpusCase.id}`)
    continue
  }
  failed += 1
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structura-corpus-'))
  const actualPath = path.join(tmpDir, 'actual.graph.json')
  fs.writeFileSync(actualPath, actual)
  console.error(`\n=== ${corpusCase.id} ===`)
  const diff = spawnSync('diff', ['-u', corpusCase.expectedPath, actualPath], { encoding: 'utf8' })
  if (diff.stdout) console.error(diff.stdout)
  if (diff.stderr) console.error(diff.stderr)
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

if (failed > 0) {
  console.error(`\n${failed} golden corpus case(s) failed. Run npm run corpus:update to refresh snapshots.`)
  process.exit(1)
}

console.log(`All ${cases.length} golden corpus case(s) match.`)
