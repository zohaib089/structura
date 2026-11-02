import { resolve, sep } from 'node:path'

export function assertSafeRelativeEntryPath(entryPath: string): string {
  const normalized = entryPath.split('\\').join('/')
  if (
    normalized.length === 0 ||
    normalized.length > 4096 ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.includes('\0')
  ) {
    throw new Error('Archive entry path is not allowed.')
  }

  const segments = normalized.split('/')
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') {
      throw new Error('Archive entry path traversal is not allowed.')
    }
  }

  return segments.join('/')
}

export function resolveInsideRoot(rootDir: string, relativePath: string): string {
  const safeRelative = assertSafeRelativeEntryPath(relativePath)
  const absolute = resolve(rootDir, ...safeRelative.split('/'))
  const rootWithSep = rootDir.endsWith(sep) ? rootDir : `${rootDir}${sep}`
  if (absolute !== rootDir && !absolute.startsWith(rootWithSep)) {
    throw new Error('Archive entry resolves outside the extraction directory.')
  }
  return absolute
}
