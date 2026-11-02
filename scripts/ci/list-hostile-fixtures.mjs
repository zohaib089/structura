#!/usr/bin/env node
/**
 * Print hostile fixture directories, one relative path per line.
 * Golden-corpus paths are never included.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isCorpusRel, repoRoot } from './corpus-paths.mjs'

const CANDIDATES = [
  'packages/engine/fixtures/hostile',
  'packages/engine/test/fixtures/hostile',
  'packages/engine/test/hostile',
  'packages/cli/fixtures/hostile',
  'packages/cli/test/fixtures/hostile',
  'packages/cli/test/hostile',
  'fixtures/hostile'
]

export function hostileFixtures() {
  const found = []
  for (const rel of CANDIDATES) {
    if (isCorpusRel(rel)) continue
    const abs = path.join(repoRoot, rel)
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) found.push(rel)
  }
  return found
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  for (const rel of hostileFixtures()) console.log(rel)
}
