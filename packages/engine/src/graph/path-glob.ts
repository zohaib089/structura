import ignore, { type Ignore } from 'ignore'

function ignoresPath(ig: Ignore, path: string): boolean {
  if (path === '.') return false
  return ig.ignores(path) || ig.ignores(`${path}/`)
}

/** True when `path` matches a gitignore-style glob (repo-relative POSIX path). */
export function matchPathPattern(path: string, pattern: string): boolean {
  const ig = ignore().add(pattern)
  if (ignoresPath(ig, path)) return true
  const prefix = pattern.match(/^(.+)\/\*\*$/)
  if (prefix && path === prefix[1]) return true
  return false
}
