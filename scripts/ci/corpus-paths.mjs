import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export function corpusRoots() {
  const file = path.join(repoRoot, 'scripts/ci/golden-corpus-paths.txt')
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map(line => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
}

/** True when a repo-relative POSIX path is part of the golden corpus. */
export function isCorpusRel(relPosix) {
  const parts = relPosix.split('/')
  if (parts.includes('golden-corpus')) return true
  return corpusRoots().some(root => relPosix === root || relPosix.startsWith(`${root}/`))
}
