/** Code-unit order comparison. Locale independent => reproducible everywhere. Never use localeCompare. */
export function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export const ROOT_PATH = '.'
export const ROOT_DIR_ID = 'dir:.'

export const dirId = (path: string): string => `dir:${path}`
export const fileId = (path: string): string => `file:${path}`
export const symbolId = (filePath: string, qualifiedName: string): string => `sym:${filePath}#${qualifiedName}`
export const externalId = (ecosystem: string, name: string): string => `ext:${ecosystem}:${name}`
export const unresolvedId = (importerPath: string, specifier: string): string => `unresolved:${importerPath}::${specifier}`

/** Last path segment (root => "."). */
export function baseName(path: string): string {
  if (path === ROOT_PATH) return ROOT_PATH
  return path.slice(path.lastIndexOf('/') + 1)
}

/** Parent directory path, `"."` for top-level entries, `undefined` for the root. */
export function parentPath(path: string): string | undefined {
  if (path === ROOT_PATH) return undefined
  const index = path.lastIndexOf('/')
  return index === -1 ? ROOT_PATH : path.slice(0, index)
}

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/
const MAX_PATH_LENGTH = 4096

/**
 * Can this repo-relative path be used in an id? POSIX separators, NFC, no leading `/`,
 * no `.`/`..` segments, no backslash, no control characters, no lone surrogates.
 * The root path "." is only valid for the root directory node (`allowRoot`).
 */
export function isRepresentablePath(path: unknown, allowRoot = false): path is string {
  if (typeof path !== 'string') return false
  if (path === ROOT_PATH) return allowRoot
  if (path.length === 0 || path.length > MAX_PATH_LENGTH) return false
  if (path.startsWith('/') || path.includes('\\') || CONTROL.test(path)) return false
  if (/^[A-Za-z]:/.test(path)) return false
  if (path !== path.normalize('NFC')) return false
  if (/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(path)) return false
  return path.split('/').every(segment => segment.length > 0 && segment !== '.' && segment !== '..')
}
