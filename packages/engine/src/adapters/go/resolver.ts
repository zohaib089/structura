import { posix } from 'node:path'
import type { ModuleResolver, ResolveOutcome } from '../adapter.js'

export interface GoResolverContext {
  files: ReadonlySet<string>
  ignoredPaths: readonly string[]
  /** Directory of each `go.mod` (`.` at the repo root) → module path. */
  modules: ReadonlyMap<string, string>
}

function dirOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '.' : path.slice(0, index)
}

function isIgnored(ignoredPaths: readonly string[], path: string): boolean {
  return ignoredPaths.some(ignored => path === ignored || path.startsWith(`${ignored}/`))
}

/**
 * Parse the `module` path from a go.mod file. Comments are ignored; a quoted
 * path is accepted. Returns `undefined` when no module clause is present.
 */
export function parseGoModulePath(content: string): string | undefined {
  const lines = content.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.replace(/\/\/.*$/, '').trim()
    if (!line.startsWith('module')) continue
    const rest = line.slice('module'.length).trim()
    if (!rest) return undefined
    const token = rest.split(/\s+/)[0] ?? ''
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith('`') && token.endsWith('`'))) {
      return token.slice(1, -1) || undefined
    }
    return token || undefined
  }
  return undefined
}

function isStdlibOrBare(importPath: string): boolean {
  const root = importPath.split('/')[0] ?? importPath
  return root.length > 0 && !root.includes('.')
}

function underModule(importPath: string, modulePath: string): boolean {
  return importPath === modulePath || importPath.startsWith(`${modulePath}/`)
}

function joinRepo(dir: string, suffix: string): string {
  if (!suffix) return dir === '.' ? '.' : dir
  if (dir === '.' || dir === '') return suffix
  return posix.normalize(posix.join(dir, suffix)).replace(/^\.\//, '')
}

function escapesRoot(path: string): boolean {
  return path === '..' || path.startsWith('../') || posix.isAbsolute(path)
}

function hasDotDot(rel: string): boolean {
  return rel.split('/').some(part => part === '' || part === '.' || part === '..')
}

/** Non-test `.go` files that belong to a package directory (not its subdirectories). */
export function packageGoFiles(files: ReadonlySet<string>, packageDir: string): string[] {
  const out: string[] = []
  for (const path of files) {
    if (!path.endsWith('.go') || path.endsWith('_test.go')) continue
    if (packageDir === '.') {
      if (!path.includes('/')) out.push(path)
      continue
    }
    const prefix = `${packageDir}/`
    if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) out.push(path)
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

export class GoResolver implements ModuleResolver {
  private constructor(private readonly context: GoResolverContext) {}

  static create(context: GoResolverContext): GoResolver {
    return new GoResolver(context)
  }

  private moduleFor(fromPath: string): { dir: string; modulePath: string } | undefined {
    let dir: string | undefined = dirOf(fromPath)
    while (dir !== undefined) {
      const modulePath = this.context.modules.get(dir)
      if (modulePath) return { dir, modulePath }
      if (dir === '.') return undefined
      const parent = dir.lastIndexOf('/')
      dir = parent === -1 ? '.' : dir.slice(0, parent)
    }
    return undefined
  }

  private packageDir(importPath: string, fromPath: string): { kind: 'dir'; path: string } | { kind: 'outside' } | undefined {
    const mod = this.moduleFor(fromPath)
    if (!mod || !underModule(importPath, mod.modulePath)) return undefined
    const suffix = importPath === mod.modulePath ? '' : importPath.slice(mod.modulePath.length + 1)
    if (suffix && hasDotDot(suffix)) return { kind: 'outside' }
    const dir = joinRepo(mod.dir, suffix)
    if (dir !== '.' && escapesRoot(dir)) return { kind: 'outside' }
    return { kind: 'dir', path: dir === '.' ? '.' : dir }
  }

  /** Every non-test package file, or a single external / unresolved outcome. */
  resolveAll(specifier: string | null, fromPath: string): ResolveOutcome[] {
    if (specifier === null || specifier === '') return [{ kind: 'unresolved', reason: 'non-literal-specifier' }]
    const located = this.packageDir(specifier, fromPath)
    if (located?.kind === 'outside') return [{ kind: 'unresolved', reason: 'outside-root' }]
    if (located?.kind === 'dir') {
      if (isIgnored(this.context.ignoredPaths, located.path)) return [{ kind: 'unresolved', reason: 'target-ignored' }]
      const files = packageGoFiles(this.context.files, located.path)
      if (files.length > 0) return files.map(path => ({ kind: 'file' as const, path, provenance: 'EXTRACTED' as const }))
      return [{ kind: 'unresolved', reason: isIgnored(this.context.ignoredPaths, located.path) ? 'target-ignored' : 'not-found' }]
    }
    return [{ kind: 'external', ecosystem: 'go', name: specifier }]
  }

  resolve(specifier: string | null, fromPath: string): ResolveOutcome {
    return this.resolveAll(specifier, fromPath)[0] ?? { kind: 'unresolved', reason: 'not-found' }
  }
}
