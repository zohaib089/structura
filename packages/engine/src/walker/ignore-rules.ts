import ignore, { type Ignore } from 'ignore'
import { IGNORE_FILE, OUT_DIR } from '../brand.js'

/**
 * Hard excludes by directory entry name (any depth): never overridable by config, ignore files or `--include`.
 * `.git` and the product output directory (which also holds an in-root cache when one is explicitly requested).
 */
export const HARD_EXCLUDED_NAMES: readonly string[] = ['.git', OUT_DIR]

/** Built-in defaults (gitignore syntax). Lowest priority: a project ignore file can `!negate` them. */
export const DEFAULT_IGNORE_PATTERNS: readonly string[] = [
  'node_modules/',
  'dist/',
  'build/',
  'coverage/',
  '.next/',
  '.nuxt/',
  '.svelte-kit/',
  '.turbo/',
  '.cache/',
  '.parcel-cache/',
  '.venv/',
  'venv/',
  '__pycache__/',
  '.pytest_cache/',
  '.mypy_cache/',
  '.tox/',
  '.idea/',
  '.vscode/',
  'test-results/',
  'playwright-report/',
  '.DS_Store',
  'Thumbs.db',
  '*.tsbuildinfo',
  '*.min.js',
  '*.map',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml'
]

export type IgnoreSource = 'default' | 'gitignore' | 'ignorefile'

export interface IgnoreDecision {
  ignored: boolean
  /** Which kind of rule decided, and the pattern as written. */
  source?: IgnoreSource
  pattern?: string
}

/** Counted rule label for coverage: `default:node_modules`, `gitignore:/dist`, `ignorefile:*.gen.ts`. Bounded and control-free. */
export function ruleLabel(decision: IgnoreDecision): string {
  let pattern = decision.pattern ?? '?'
  if (decision.source === 'default') pattern = pattern.replace(/\/+$/, '')
  pattern = pattern.replace(/[\u0000-\u001f\u007f-\u009f]/g, '?').slice(0, 190)
  return `${decision.source ?? 'default'}:${pattern || '?'}`
}

interface Level {
  /** Directory the patterns are relative to ('' = root). */
  base: string
  label: string
  matcher: Ignore
  patterns: string[]
}

function parsePatterns(content: string): string[] {
  return content.split(/\r?\n/)
}

/**
 * Layered ignore matcher with git semantics: deeper ignore files take precedence over
 * shallower ones, later rules win within a file, and an explicit `!negation` stops the search.
 * Within one directory the tool ignore file outranks `.gitignore`.
 */
export class IgnoreStack {
  private readonly levels: Level[]
  private readonly defaults: Level

  private constructor(levels: Level[], defaults: Level) {
    this.levels = levels
    this.defaults = defaults
  }

  static create(extraPatterns: readonly string[] = [], useDefaults = true): IgnoreStack {
    const matcher = ignore()
    const patterns = [...(useDefaults ? DEFAULT_IGNORE_PATTERNS : []), ...extraPatterns]
    matcher.add(patterns)
    return new IgnoreStack([], { base: '', label: 'default ignore', matcher, patterns })
  }

  /** Returns a new stack that also applies an ignore file found in directory `base`. */
  with(base: string, fileName: string, content: string): IgnoreStack {
    const patterns = parsePatterns(content)
    const matcher = ignore()
    matcher.add(patterns)
    const level: Level = { base, label: fileName, matcher, patterns }
    // Levels are searched from the end: the last one added has the highest priority.
    return new IgnoreStack([...this.levels, level], this.defaults)
  }

  /** `relPath` is repo-relative POSIX; set `isDirectory` so `dir/` patterns apply. */
  test(relPath: string, isDirectory: boolean): IgnoreDecision {
    const candidates = [...this.levels].reverse()
    for (const level of candidates) {
      const scoped = level.base === '' ? relPath : relPath.startsWith(`${level.base}/`) ? relPath.slice(level.base.length + 1) : undefined
      if (scoped === undefined || scoped === '') continue
      const result = level.matcher.test(isDirectory ? `${scoped}/` : scoped)
      if (result.ignored) {
        return { ignored: true, source: level.label === '.gitignore' ? 'gitignore' : 'ignorefile', pattern: result.rule?.pattern ?? '?' }
      }
      if (result.unignored) return { ignored: false }
    }
    const result = this.defaults.matcher.test(isDirectory ? `${relPath}/` : relPath)
    if (result.ignored) return { ignored: true, source: 'default', pattern: result.rule?.pattern ?? '?' }
    return { ignored: false }
  }
}

export const IGNORE_FILE_NAMES = ['.gitignore', IGNORE_FILE] as const
