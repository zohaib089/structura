#!/usr/bin/env node
/**
 * Delete golden-corpus directories from a throwaway checkout before the PR scan,
 * so QA's vendored corpus repos are never scanned (scripts/ci/golden-corpus-paths.txt).
 * Refuses to run outside CI unless --force is given, because it deletes files.
 *
 *   node scripts/pr-check/strip-corpus.mjs <checkout-root> [--force]
 */
import fs from 'node:fs'
import path from 'node:path'
import { corpusRoots } from '../ci/corpus-paths.mjs'

const args = process.argv.slice(2)
const root = args.find(arg => !arg.startsWith('--'))
if (!root) {
  console.error('usage: strip-corpus.mjs <checkout-root> [--force]')
  process.exit(2)
}
if (process.env.CI !== 'true' && !args.includes('--force')) {
  console.error('refusing to delete corpus directories outside CI; pass --force')
  process.exit(2)
}

const abs = path.resolve(root)
const removed = []
for (const rel of corpusRoots()) {
  const target = path.join(abs, rel)
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true })
    removed.push(rel)
  }
}
function walk(dir, rel) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const childRel = rel ? `${rel}/${entry.name}` : entry.name
    const child = path.join(dir, entry.name)
    if (entry.name === 'golden-corpus') {
      fs.rmSync(child, { recursive: true, force: true })
      removed.push(childRel)
    } else {
      walk(child, childRel)
    }
  }
}
walk(abs, '')
console.log(removed.length > 0 ? `removed golden corpus: ${removed.join(', ')}` : 'no golden-corpus directories present')
