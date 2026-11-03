#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { listCorpusCases, scanFixtureRepo } from './lib.mjs'

const cases = listCorpusCases()
if (cases.length === 0) {
  console.error('No golden corpus cases under packages/test-fixtures/*/repo')
  process.exit(1)
}

for (const corpusCase of cases) {
  const graphJson = await scanFixtureRepo(corpusCase.repoPath)
  fs.mkdirSync(path.dirname(corpusCase.expectedPath), { recursive: true })
  fs.writeFileSync(corpusCase.expectedPath, graphJson)
  console.log(`updated ${path.relative(process.cwd(), corpusCase.expectedPath)}`)
}
