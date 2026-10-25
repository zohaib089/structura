export type LanguageCategory = 'code' | 'data' | 'markup' | 'doc' | 'unknown'

export interface LanguageInfo {
  /** Stable language id (`typescript`, `javascript`, `python`, `json`, ..., `unknown`). */
  id: string
  /**
   * `code` languages are expected to be analysed; skipping one is an *unexpected* skip
   * in strict mode. Everything else is expected to be skippable.
   */
  category: LanguageCategory
}

export const UNKNOWN_LANGUAGE: LanguageInfo = Object.freeze({ id: 'unknown', category: 'unknown' })

const code = (id: string): LanguageInfo => ({ id, category: 'code' })
const data = (id: string): LanguageInfo => ({ id, category: 'data' })
const markup = (id: string): LanguageInfo => ({ id, category: 'markup' })
const doc = (id: string): LanguageInfo => ({ id, category: 'doc' })

const typescript = code('typescript')
const javascript = code('javascript')
const python = code('python')
const cpp = code('cpp')
const c = code('c')

const BY_EXTENSION: Readonly<Record<string, LanguageInfo>> = {
  '.ts': typescript,
  '.tsx': typescript,
  '.mts': typescript,
  '.cts': typescript,
  '.js': javascript,
  '.jsx': javascript,
  '.mjs': javascript,
  '.cjs': javascript,
  '.py': python,
  '.pyi': python,
  '.go': code('go'),
  '.rs': code('rust'),
  '.java': code('java'),
  '.kt': code('kotlin'),
  '.kts': code('kotlin'),
  '.swift': code('swift'),
  '.cs': code('csharp'),
  '.rb': code('ruby'),
  '.php': code('php'),
  '.scala': code('scala'),
  '.dart': code('dart'),
  '.lua': code('lua'),
  '.c': c,
  '.h': c,
  '.cc': cpp,
  '.cpp': cpp,
  '.cxx': cpp,
  '.hpp': cpp,
  '.sh': code('shell'),
  '.bash': code('shell'),
  '.zsh': code('shell'),
  '.vue': code('vue'),
  '.svelte': code('svelte'),
  '.json': data('json'),
  '.jsonc': data('json'),
  '.json5': data('json'),
  '.yaml': data('yaml'),
  '.yml': data('yaml'),
  '.toml': data('toml'),
  '.xml': data('xml'),
  '.csv': data('csv'),
  '.ini': data('ini'),
  '.sql': data('sql'),
  '.html': markup('html'),
  '.htm': markup('html'),
  '.css': markup('css'),
  '.scss': markup('scss'),
  '.less': markup('less'),
  '.svg': markup('svg'),
  '.md': doc('markdown'),
  '.mdx': doc('markdown'),
  '.rst': doc('rst'),
  '.txt': doc('text')
}

const BY_FILENAME: Readonly<Record<string, LanguageInfo>> = {
  dockerfile: data('dockerfile'),
  makefile: data('make'),
  jenkinsfile: data('groovy'),
  gemfile: code('ruby'),
  rakefile: code('ruby')
}

const SHEBANG_INTERPRETERS: ReadonlyArray<readonly [RegExp, LanguageInfo]> = [
  [/^(node|nodejs|deno|bun|tsx|ts-node)$/, javascript],
  [/^python[\d.]*$/, python],
  [/^(ba|z|k|da)?sh$/, code('shell')],
  [/^ruby$/, code('ruby')],
  [/^php$/, code('php')]
]

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(index).toLowerCase() : ''
}

/** Whether a path has no extension and no well-known name, so a shebang might help. */
export function needsShebangProbe(path: string): boolean {
  const name = basename(path)
  return extensionOf(name) === '' && !BY_FILENAME[name.toLowerCase()]
}

/** Language from a shebang line such as `#!/usr/bin/env node`. */
export function languageFromShebang(firstLine: string): LanguageInfo | undefined {
  if (!firstLine.startsWith('#!')) return undefined
  const parts = firstLine.slice(2).trim().split(/\s+/)
  let program = basename(parts[0] ?? '')
  if (program === 'env') {
    // `env [-S] [VAR=val ...] interpreter`
    program = basename(parts.slice(1).find(part => !part.startsWith('-') && !part.includes('=')) ?? '')
  }
  for (const [pattern, info] of SHEBANG_INTERPRETERS) {
    if (pattern.test(program)) return info
  }
  return undefined
}

/** Detects the language by file name/extension, falling back to the shebang line when given. */
export function detectLanguage(path: string, firstLine?: string): LanguageInfo {
  const name = basename(path)
  const byName = BY_FILENAME[name.toLowerCase()] ?? (name.toLowerCase().startsWith('dockerfile.') ? BY_FILENAME.dockerfile : undefined)
  if (byName) return byName
  const byExtension = BY_EXTENSION[extensionOf(name)]
  if (byExtension) return byExtension
  if (firstLine !== undefined) {
    const byShebang = languageFromShebang(firstLine)
    if (byShebang) return byShebang
  }
  return UNKNOWN_LANGUAGE
}
