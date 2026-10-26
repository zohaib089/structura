#!/usr/bin/env node
/**
 * Fails if a tsconfig or the lint ignore file drops the golden-corpus excludes.
 * Corpus directories are not required to exist.
 */
import fs from 'node:fs'
import path from 'node:path'
import { corpusRoots, isCorpusRel, repoRoot } from './corpus-paths.mjs'
import { hostileFixtures } from './list-hostile-fixtures.mjs'

const nestedExclude = '**/golden-corpus/**'
const problems = []

function listTsconfigs(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
    const full = path.join(dir, entry.name)
    const rel = path.relative(repoRoot, full).split(path.sep).join('/')
    if (isCorpusRel(rel)) continue
    if (entry.isDirectory()) listTsconfigs(full, out)
    else if (/^tsconfig.*\.json$/.test(entry.name)) out.push(full)
  }
}

const tsconfigs = []
listTsconfigs(repoRoot, tsconfigs)
if (tsconfigs.length === 0) problems.push('no tsconfig files found')

for (const file of tsconfigs) {
  let json
  try {
    const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    json = JSON.parse(text)
  } catch (error) {
    problems.push(`${path.relative(repoRoot, file)} is not JSON: ${error instanceof Error ? error.message : error}`)
    continue
  }
  const exclude = Array.isArray(json.exclude) ? json.exclude : []
  const dir = path.dirname(file)
  const display = path.relative(repoRoot, file).split(path.sep).join('/')
  for (const corpusPath of corpusRoots()) {
    const rel = path.relative(dir, path.join(repoRoot, corpusPath)).split(path.sep).join('/')
    if (!exclude.includes(rel)) problems.push(`${display} exclude is missing ${rel}`)
  }
  if (!exclude.includes(nestedExclude)) problems.push(`${display} exclude is missing ${nestedExclude}`)
  const include = Array.isArray(json.include) ? json.include : []
  for (const pattern of include) {
    const norm = String(pattern).split('\\').join('/')
    if (norm.includes('golden-corpus') || norm.includes('test-fixtures')) {
      problems.push(`${display} include pattern reaches the golden corpus: ${pattern}`)
    }
  }
}

const ignorePath = path.join(repoRoot, '.eslintignore')
if (!fs.existsSync(ignorePath)) {
  problems.push('.eslintignore is missing')
} else {
  const lines = fs.readFileSync(ignorePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
  for (const corpusPath of corpusRoots()) {
    if (!lines.some(line => line.replace(/\/$/, '') === corpusPath)) {
      problems.push(`.eslintignore is missing ${corpusPath}`)
    }
  }
  if (!lines.some(line => line.includes('golden-corpus'))) {
    problems.push('.eslintignore is missing a golden-corpus pattern')
  }
}

for (const rel of ['apps/web/vitest.config.ts', 'apps/web/playwright.config.ts']) {
  const text = fs.readFileSync(path.join(repoRoot, rel), 'utf8')
  if (text.includes('test-fixtures') || text.includes('golden-corpus')) {
    problems.push(`${rel} references a golden-corpus path`)
  }
}

const guard = fs.readFileSync(path.join(repoRoot, 'scripts/ci/import-guard.mjs'), 'utf8')
if (!guard.includes('isCorpusRel')) problems.push('import guard does not consult corpus paths')

const lister = fs.readFileSync(path.join(repoRoot, 'scripts/ci/list-hostile-fixtures.mjs'), 'utf8')
if (!lister.includes('isCorpusRel')) problems.push('hostile fixture list does not consult corpus paths')

if (!isCorpusRel('packages/test-fixtures/example-repo')) {
  problems.push('packages/test-fixtures was not classified as corpus')
}
if (!isCorpusRel('qa/golden-corpus/example-repo')) {
  problems.push('a golden-corpus directory was not classified as corpus')
}
if (isCorpusRel('fixtures/hostile')) {
  problems.push('fixtures/hostile was classified as corpus')
}

const present = corpusRoots().filter(rel => fs.existsSync(path.join(repoRoot, rel)))
if (present.length === 0) {
  console.log(`Golden-corpus directories are not in this revision. Excluding ${corpusRoots().join(', ')} and any **/golden-corpus/** directory.`)
} else {
  console.log(`Golden-corpus directories present and excluded: ${present.join(', ')}`)
}

const fixtures = hostileFixtures()
if (fixtures.length === 0) console.log('No hostile fixture directories in this revision; the offline scan skips.')
else console.log(`Hostile fixtures outside the corpus: ${fixtures.join(', ')}`)

if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}

console.log(`Corpus exclusion check passed (${tsconfigs.length} tsconfig files).`)
