import ignore from 'ignore'

/** True when `path` matches a gitignore-style glob (repo-relative POSIX path). */
export function matchPathPattern(path: string, pattern: string): boolean {
  const ig = ignore().add(pattern)
  if (ig.ignores(path)) return true
  if (ig.ignores(`${path}/`)) return true
  const prefix = pattern.match(/^(.+)\/\*\*$/)
  if (prefix && path === prefix[1]) return true
  return false
}
