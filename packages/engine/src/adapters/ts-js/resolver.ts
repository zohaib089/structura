import { builtinModules } from 'node:module'
import { posix } from 'node:path'
import type { ModuleResolver, ResolveOutcome } from '../adapter.js'
import type { InferredReason, UnresolvedReason } from '../../graph/types.js'
import { LIMITS } from '../../limits.js'
import { parseJsonc } from './jsonc.js'

/** What the resolver may know about the repository. */
export interface ResolverContext {
  /** All scanned (non-ignored) file paths, repo-relative graph paths. */
  files: ReadonlySet<string>
  /** Ignored entries (files and directories) so ignored targets can be told apart from missing ones. */
  ignoredPaths: readonly string[]
  /** Reads a scanned file as text (config data only: package.json, tsconfig). `undefined` when unreadable. */
  readText(path: string): Promise<string | undefined>
}

const EXTENSIONS = ['.ts', '.tsx', '.d.ts', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.json'] as const
const JS_TO_TS: Readonly<Record<string, readonly string[]>> = {
  '.js': ['.ts', '.tsx', '.d.ts'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts', '.d.mts'],
  '.cjs': ['.cts', '.d.cts']
}
const BUILD_DIR = /^(?:\.\/)?(?:dist|build|lib|out)\/(.*)$/
const PACKAGE_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i
const CONDITIONS = ['source', 'import', 'default', 'require', 'node', 'types'] as const
const builtins = new Set(builtinModules.map(name => (name.startsWith('node:') ? name.slice(5) : name)))

interface TsConfigInfo {
  /** Repo-relative directory non-relative specifiers resolve against (`compilerOptions.baseUrl`). */
  baseUrl?: string
  /** `compilerOptions.paths` plus the repo-relative directory its targets are relative to. */
  paths?: { entries: Array<[pattern: string, targets: string[]]>; base: string }
}

/** Configuration problems, reported in `coverage.unresolved`; they never change edges. */
export interface ConfigIssue {
  reason: 'config-extends-unresolved' | 'config-outside-root' | 'unsupported-resolution'
  /** Config file the problem was found in (never written to graph.json). */
  file: string
}

interface LocalPackage {
  dir: string
  name: string
  json: Record<string, unknown>
}

type PathResult =
  | { kind: 'found'; path: string }
  | { kind: 'ignored' }
  | { kind: 'outside' }
  | { kind: 'missing' }

type JsonObject = Record<string, unknown>
const isObject = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value)

function dirOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function joinRepo(...parts: string[]): string {
  const joined = posix.normalize(posix.join(...parts.map(part => (part === '' ? '.' : part))))
  return joined === '.' ? '' : joined.replace(/^\.\//, '').replace(/\/$/, '')
}

function workspacePatternToRegex(pattern: string): RegExp {
  const cleaned = pattern.replace(/^\.\//, '').replace(/\/$/, '')
  const source = cleaned
    .split('/')
    .map(segment => (segment === '**' ? '.*' : segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')))
    .join('/')
  return new RegExp(`^${source}$`)
}

async function readJsonObject(context: ResolverContext, path: string): Promise<JsonObject | undefined> {
  const text = await context.readText(path)
  if (text === undefined) return undefined
  try {
    const value = parseJsonc(text)
    return isObject(value) ? value : undefined
  } catch {
    return undefined
  }
}

async function loadTsConfig(context: ResolverContext, path: string, issues: ConfigIssue[], depth = 0, seen = new Set<string>()): Promise<TsConfigInfo | undefined> {
  if (depth > LIMITS.maxResolutionDepth.default || seen.has(path) || !context.files.has(path)) return undefined
  seen.add(path)
  const json = await readJsonObject(context, path)
  if (!json) return undefined
  const dir = dirOf(path)

  let merged: TsConfigInfo = {}
  const extendsValue = json.extends
  const parents = typeof extendsValue === 'string' ? [extendsValue] : Array.isArray(extendsValue) ? extendsValue.filter((item): item is string => typeof item === 'string') : []
  if (Array.isArray(json.references)) {
    // Project references are out of v1 scope: reported, never silently ignored.
    for (const _ of json.references) issues.push({ reason: 'unsupported-resolution', file: path })
  }
  for (const parent of parents) {
    if (!parent.startsWith('.') && !parent.startsWith('/')) {
      // A bare package (e.g. "@tsconfig/node20"): node_modules is never read, so it cannot be followed.
      issues.push({ reason: 'config-extends-unresolved', file: path })
      continue
    }
    let target = joinRepo(dir, parent)
    if (parent.startsWith('/') || target === '..' || target.startsWith('../')) {
      issues.push({ reason: 'config-outside-root', file: path })
      continue
    }
    if (!target.endsWith('.json')) target += '.json'
    const info = await loadTsConfig(context, target, issues, depth + 1, seen)
    if (info) merged = { ...merged, ...info }
    else issues.push({ reason: 'config-extends-unresolved', file: path })
  }

  const options = isObject(json.compilerOptions) ? json.compilerOptions : {}
  if (typeof options.baseUrl === 'string') merged.baseUrl = joinRepo(dir, options.baseUrl)
  if (isObject(options.paths)) {
    const entries: Array<[string, string[]]> = []
    for (const [pattern, targets] of Object.entries(options.paths)) {
      if (Array.isArray(targets)) entries.push([pattern, targets.filter((t): t is string => typeof t === 'string')])
    }
    merged.paths = { entries, base: dir }
  }
  if (merged.paths && merged.baseUrl !== undefined) merged.paths = { ...merged.paths, base: merged.baseUrl }
  return merged
}

function dedupeIssues(issues: ConfigIssue[]): ConfigIssue[] {
  // A shared base config extended by several tsconfigs is reported once per (file, reason, occurrence).
  return issues
}

export class TsJsResolver implements ModuleResolver {
  private readonly dirs = new Set<string>([''])

  private constructor(
    private readonly context: ResolverContext,
    private readonly packagesByDir: Map<string, LocalPackage>,
    private readonly packagesByName: Map<string, LocalPackage>,
    private readonly configs: Map<string, TsConfigInfo>,
    readonly configIssues: readonly ConfigIssue[]
  ) {
    for (const file of context.files) {
      let dir = dirOf(file)
      while (dir !== '' && !this.dirs.has(dir)) {
        this.dirs.add(dir)
        dir = dirOf(dir)
      }
    }
  }

  static async create(context: ResolverContext): Promise<TsJsResolver> {
    const packageFiles = [...context.files].filter(file => baseName(file) === 'package.json').sort()
    const parsed = new Map<string, JsonObject>()
    for (const file of packageFiles) {
      const json = await readJsonObject(context, file)
      if (json) parsed.set(dirOf(file), json)
    }

    // Honour the root `workspaces` field when present; otherwise every named package counts.
    const rootJson = parsed.get('')
    const workspaces = rootJson?.workspaces
    const patternList = Array.isArray(workspaces) ? workspaces : isObject(workspaces) && Array.isArray(workspaces.packages) ? workspaces.packages : undefined
    const patterns = patternList?.filter((item): item is string => typeof item === 'string' && !item.startsWith('!')).map(workspacePatternToRegex)

    const packagesByDir = new Map<string, LocalPackage>()
    const packagesByName = new Map<string, LocalPackage>()
    for (const [dir, json] of [...parsed.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      packagesByDir.set(dir, { dir, name: typeof json.name === 'string' ? json.name : '', json })
      if (typeof json.name !== 'string' || json.name === '') continue
      if (patterns && dir !== '' && !patterns.some(pattern => pattern.test(dir))) continue
      if (!packagesByName.has(json.name)) packagesByName.set(json.name, { dir, name: json.name, json })
    }

    const configs = new Map<string, TsConfigInfo>()
    const issues: ConfigIssue[] = []
    for (const file of [...context.files].sort()) {
      const name = baseName(file)
      if (name !== 'tsconfig.json' && name !== 'jsconfig.json') continue
      const dir = dirOf(file)
      if (name === 'jsconfig.json' && configs.has(dir)) continue
      const info = await loadTsConfig(context, file, issues)
      if (info) configs.set(dir, info)
    }
    return new TsJsResolver(context, packagesByDir, packagesByName, configs, dedupeIssues(issues))
  }

  /* ------------------------------ file lookup ------------------------------ */

  private isIgnored(path: string): boolean {
    return this.context.ignoredPaths.some(ignored => path === ignored || path.startsWith(`${ignored}/`))
  }

  private resolvePath(candidate: string, depth = 0): PathResult {
    if (candidate === '..' || candidate.startsWith('../')) return { kind: 'outside' }
    const files = this.context.files
    if (candidate !== '' && files.has(candidate)) return { kind: 'found', path: candidate }

    const jsExtension = /\.(?:js|jsx|mjs|cjs)$/.exec(candidate)?.[0]
    if (jsExtension) {
      const stem = candidate.slice(0, -jsExtension.length)
      for (const replacement of JS_TO_TS[jsExtension] ?? []) {
        if (files.has(stem + replacement)) return { kind: 'found', path: stem + replacement }
      }
    }
    if (candidate !== '') {
      for (const extension of EXTENSIONS) {
        if (files.has(candidate + extension)) return { kind: 'found', path: candidate + extension }
      }
    }
    if (this.dirs.has(candidate)) {
      const pkg = this.packagesByDir.get(candidate)
      if (pkg && depth < 3) {
        for (const field of ['module', 'main'] as const) {
          const value = pkg.json[field]
          if (typeof value === 'string') {
            const result = this.resolvePath(joinRepo(candidate, value), depth + 1)
            if (result.kind === 'found') return result
          }
        }
      }
      for (const extension of EXTENSIONS) {
        const index = joinRepo(candidate, `index${extension}`)
        if (files.has(index)) return { kind: 'found', path: index }
      }
    }
    return this.isIgnored(candidate) ? { kind: 'ignored' } : { kind: 'missing' }
  }

  private fileOutcome(path: string): ResolveOutcome {
    return { kind: 'file', path, provenance: 'EXTRACTED' }
  }

  private inferredOutcome(path: string, reason: InferredReason, confidence: number): ResolveOutcome {
    return { kind: 'file', path, provenance: 'INFERRED', reason, confidence }
  }

  private failure(result: PathResult): ResolveOutcome {
    if (result.kind === 'outside') return { kind: 'unresolved', reason: 'outside-root' }
    if (result.kind === 'ignored') return { kind: 'unresolved', reason: 'target-ignored' }
    return { kind: 'unresolved', reason: 'not-found' }
  }

  /* ------------------------------- configuration ------------------------------ */

  private configFor(fromPath: string): TsConfigInfo | undefined {
    let dir = dirOf(fromPath)
    for (;;) {
      const config = this.configs.get(dir)
      if (config) return config
      if (dir === '') return undefined
      dir = dirOf(dir)
    }
  }

  private matchPaths(config: TsConfigInfo, spec: string): { pattern: string; targets: string[] } | undefined {
    if (!config.paths) return undefined
    let best: { pattern: string; targets: string[]; score: number; star: string } | undefined
    for (const [pattern, targets] of config.paths.entries) {
      const star = pattern.indexOf('*')
      let score = -1
      let captured = ''
      if (star === -1) {
        if (pattern === spec) score = Number.MAX_SAFE_INTEGER
      } else {
        const prefix = pattern.slice(0, star)
        const suffix = pattern.slice(star + 1)
        if (spec.length >= pattern.length - 1 && spec.startsWith(prefix) && spec.endsWith(suffix)) {
          score = prefix.length
          captured = spec.slice(prefix.length, spec.length - suffix.length)
        }
      }
      if (score >= 0 && (!best || score > best.score)) best = { pattern, targets, score, star: captured }
    }
    if (!best) return undefined
    return { pattern: best.pattern, targets: best.targets.map(target => target.replace('*', best.star)) }
  }

  /* --------------------------- package entry resolution --------------------------- */

  private pickExport(value: unknown): string[] {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.flatMap(item => this.pickExport(item))
    if (isObject(value)) {
      const keys = [...CONDITIONS.filter(key => key in value), ...Object.keys(value).filter(key => !(CONDITIONS as readonly string[]).includes(key))]
      return keys.flatMap(key => this.pickExport(value[key]))
    }
    return []
  }

  private exportTargets(pkg: LocalPackage, subpath: string): Array<{ field: string; rel: string }> {
    const exportsField = pkg.json.exports
    const key = subpath === '' ? '.' : `./${subpath}`
    const out: Array<{ field: string; rel: string }> = []
    if (exportsField !== undefined) {
      let selected: unknown
      if (isObject(exportsField) && Object.keys(exportsField).some(name => name.startsWith('.'))) {
        selected = exportsField[key]
        if (selected === undefined) {
          for (const [pattern, value] of Object.entries(exportsField)) {
            const star = pattern.indexOf('*')
            if (star === -1) continue
            const prefix = pattern.slice(0, star)
            const suffix = pattern.slice(star + 1)
            if (key.startsWith(prefix) && key.endsWith(suffix) && key.length >= pattern.length - 1) {
              const captured = key.slice(prefix.length, key.length - suffix.length)
              selected = JSON.parse(JSON.stringify(value).replaceAll('*', captured))
              break
            }
          }
        }
      } else if (subpath === '') selected = exportsField
      for (const rel of this.pickExport(selected)) out.push({ field: `exports["${key}"]`, rel })
    }
    if (subpath === '') {
      for (const field of ['module', 'main', 'types', 'typings'] as const) {
        const value = pkg.json[field]
        if (typeof value === 'string') out.push({ field, rel: value })
      }
    }
    return out
  }

  private resolveLocalPackage(pkg: LocalPackage, subpath: string): ResolveOutcome {
    for (const { rel } of this.exportTargets(pkg, subpath)) {
      const direct = this.resolvePath(joinRepo(pkg.dir, rel))
      if (direct.kind === 'found') return this.fileOutcome(direct.path)
      const mapped = BUILD_DIR.exec(rel)
      if (mapped) {
        const source = this.resolvePath(joinRepo(pkg.dir, 'src', mapped[1] ?? ''))
        if (source.kind === 'found') {
          return this.inferredOutcome(source.path, 'build-output-mapping', 0.8)
        }
      }
    }
    if (subpath !== '') {
      const direct = this.resolvePath(joinRepo(pkg.dir, subpath))
      if (direct.kind === 'found') return this.fileOutcome(direct.path)
      const source = this.resolvePath(joinRepo(pkg.dir, 'src', subpath))
      if (source.kind === 'found') {
        return this.inferredOutcome(source.path, 'src-subpath', 0.7)
      }
    } else {
      for (const conventional of ['src/index', 'index']) {
        const result = this.resolvePath(joinRepo(pkg.dir, conventional))
        if (result.kind === 'found') {
          return this.inferredOutcome(result.path, 'conventional-entry', 0.6)
        }
      }
    }
    return { kind: 'unresolved', reason: 'not-found' }
  }

  private ownPackageName(fromPath: string): string | undefined {
    let dir = dirOf(fromPath)
    for (;;) {
      const pkg = this.packagesByDir.get(dir)
      if (pkg) return pkg.name
      if (dir === '') return undefined
      dir = dirOf(dir)
    }
  }

  /* -------------------------------- public API -------------------------------- */

  resolve(specifier: string | null, fromPath: string): ResolveOutcome {
    if (specifier === null) return { kind: 'unresolved', reason: 'non-literal-specifier' }
    if (specifier === '') return { kind: 'unresolved', reason: 'unsupported-specifier' }

    if (specifier.startsWith('./') || specifier.startsWith('../') || specifier === '.' || specifier === '..') {
      const cleaned = specifier.replace(/[?#].*$/, '')
      const result = this.resolvePath(joinRepo(dirOf(fromPath), cleaned))
      return result.kind === 'found' ? this.fileOutcome(result.path) : this.failure(result)
    }
    if (specifier.startsWith('/')) return { kind: 'unresolved', reason: 'outside-root' }
    if (specifier.startsWith('node:')) {
      const bare = specifier.slice(5)
      const root = bare.split('/')[0]
      return { kind: 'external', ecosystem: 'node', name: root || bare || specifier }
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(specifier)) return { kind: 'unresolved', reason: 'unsupported-specifier' }
    if (specifier.startsWith('#')) return { kind: 'unresolved', reason: 'unsupported-resolution' }

    const config = this.configFor(fromPath)
    if (config) {
      const matched = this.matchPaths(config, specifier)
      if (matched && config.paths) {
        let last: PathResult = { kind: 'missing' }
        for (const target of matched.targets) {
          const result = this.resolvePath(joinRepo(config.paths.base, target))
          if (result.kind === 'found') return this.fileOutcome(result.path)
          if (result.kind === 'ignored' || last.kind === 'missing') last = result
        }
        return this.failure(last)
      }
      if (config.baseUrl !== undefined) {
        const result = this.resolvePath(joinRepo(config.baseUrl, specifier))
        if (result.kind === 'found') return this.fileOutcome(result.path)
      }
    }

    const parts = specifier.split('/')
    const nameLength = specifier.startsWith('@') ? 2 : 1
    const name = parts.slice(0, nameLength).join('/')
    const subpath = parts.slice(nameLength).join('/')

    if (builtins.has(specifier) || builtins.has(name)) return { kind: 'external', ecosystem: 'node', name: builtins.has(name) ? name : (name.split('/')[0] || name) }
    if (!PACKAGE_NAME.test(name)) {
      return { kind: 'unresolved', reason: 'unsupported-specifier' }
    }
    const local = this.packagesByName.get(name)
    if (local && this.ownPackageName(fromPath) === name) return { kind: 'unresolved', reason: 'unsupported-resolution' } // package.json "exports" self-reference: out of v1 scope
    if (local) return this.resolveLocalPackage(local, subpath)
    return { kind: 'external', ecosystem: 'npm', name }
  }
}
