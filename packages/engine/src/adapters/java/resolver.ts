import { posix } from 'node:path'
import type { ModuleResolver, ResolveOutcome } from '../adapter.js'

export interface JavaResolverContext {
  files: ReadonlySet<string>
  ignoredPaths: readonly string[]
  /** Repo-relative `.java` path → package name. The empty string is the default package. */
  packages: ReadonlyMap<string, string>
}

const MAVEN_MAIN = 'src/main/java'
const MAVEN_TEST = 'src/test/java'

function dirOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '.' : path.slice(0, index)
}

function isIgnored(ignoredPaths: readonly string[], path: string): boolean {
  return ignoredPaths.some(ignored => path === ignored || path.startsWith(`${ignored}/`))
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

function dottedToPath(name: string): string {
  return name.replace(/\./g, '/')
}

/** `src/main/java` / `src/test/java` prefix of a file path, when present. */
export function mavenSourceRootOf(path: string): string | undefined {
  for (const marker of [MAVEN_MAIN, MAVEN_TEST]) {
    if (path === marker || path.startsWith(`${marker}/`)) return marker
    const needle = `/${marker}/`
    const index = path.indexOf(needle)
    if (index !== -1) return path.slice(0, index + needle.length - 1)
    if (path.endsWith(`/${marker}`)) return path
  }
  return undefined
}

/** Source root implied by a file's path and its `package` declaration. */
export function packageSourceRootOf(filePath: string, packageName: string): string | undefined {
  const dir = dirOf(filePath)
  if (packageName === '') return dir
  const pkgPath = dottedToPath(packageName)
  if (dir === pkgPath) return '.'
  if (dir.endsWith(`/${pkgPath}`)) return dir.slice(0, dir.length - pkgPath.length - 1)
  return undefined
}

/** Discover Maven source roots and package-derived roots from the file set. */
export function discoverJavaSourceRoots(
  files: ReadonlySet<string>,
  packages: ReadonlyMap<string, string>
): string[] {
  const roots = new Set<string>()
  for (const path of files) {
    const maven = mavenSourceRootOf(path)
    if (maven) roots.add(maven)
  }
  for (const [path, packageName] of packages) {
    const derived = packageSourceRootOf(path, packageName)
    if (derived) roots.add(derived)
  }
  return [...roots].sort((a, b) => {
    const rank = (root: string): number => {
      if (root === MAVEN_MAIN || root.endsWith(`/${MAVEN_MAIN}`)) return 0
      if (root === MAVEN_TEST || root.endsWith(`/${MAVEN_TEST}`)) return 1
      return 2
    }
    const delta = rank(a) - rank(b)
    if (delta !== 0) return delta
    return a < b ? -1 : a > b ? 1 : 0
  })
}

/** `.java` files in a package directory, excluding `package-info` and `module-info`. */
export function packageJavaFiles(files: ReadonlySet<string>, packageDir: string): string[] {
  const out: string[] = []
  for (const path of files) {
    if (!path.endsWith('.java')) continue
    const name = path.slice(path.lastIndexOf('/') + 1)
    if (name === 'package-info.java' || name === 'module-info.java') continue
    if (packageDir === '.') {
      if (!path.includes('/')) out.push(path)
      continue
    }
    const prefix = `${packageDir}/`
    if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) out.push(path)
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

export function parseJavaSpecifier(specifier: string): { base: string; wildcard: boolean } | undefined {
  const body = specifier.startsWith('static ') ? specifier.slice('static '.length) : specifier
  if (!body) return undefined
  if (body.endsWith('.*')) {
    const base = body.slice(0, -2)
    return base ? { base, wildcard: true } : undefined
  }
  return { base: body, wildcard: false }
}

function isJavaIdent(part: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part)
}

function parentName(name: string): string | undefined {
  const index = name.lastIndexOf('.')
  return index === -1 ? undefined : name.slice(0, index)
}

export class JavaResolver implements ModuleResolver {
  private readonly roots: string[]

  private constructor(private readonly context: JavaResolverContext) {
    this.roots = discoverJavaSourceRoots(context.files, context.packages)
  }

  static create(context: JavaResolverContext): JavaResolver {
    return new JavaResolver(context)
  }

  private orderedRoots(fromPath: string): string[] {
    const own = mavenSourceRootOf(fromPath) ?? packageSourceRootOf(fromPath, this.context.packages.get(fromPath) ?? '')
    if (!own) return this.roots
    return [own, ...this.roots.filter(root => root !== own)]
  }

  private joinUnderRoot(root: string, rel: string): string | undefined {
    if (hasDotDot(rel) || escapesRoot(rel)) return undefined
    const path = joinRepo(root, rel)
    if (path !== '.' && escapesRoot(path)) return undefined
    return path
  }

  private typeFile(type: string, fromPath: string): { files: string[]; ignored: boolean; outside: boolean } {
    const rel = `${dottedToPath(type)}.java`
    return this.collect(rel, fromPath)
  }

  private filesInPackage(packageName: string, fromPath: string): { files: string[]; ignored: boolean; outside: boolean } {
    const rel = dottedToPath(packageName)
    const found = new Set<string>()
    let ignored = false
    let outside = false
    for (const root of this.orderedRoots(fromPath)) {
      const dir = this.joinUnderRoot(root, rel)
      if (dir === undefined) {
        outside = true
        continue
      }
      if (isIgnored(this.context.ignoredPaths, dir)) {
        ignored = true
        continue
      }
      for (const file of packageJavaFiles(this.context.files, dir)) found.add(file)
    }
    return { files: [...found].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)), ignored, outside }
  }

  private collect(rel: string, fromPath: string): { files: string[]; ignored: boolean; outside: boolean } {
    const found: string[] = []
    let ignored = false
    let outside = false
    for (const root of this.orderedRoots(fromPath)) {
      const path = this.joinUnderRoot(root, rel)
      if (path === undefined) {
        outside = true
        continue
      }
      if (this.context.files.has(path)) {
        found.push(path)
        continue
      }
      if (isIgnored(this.context.ignoredPaths, path)) ignored = true
    }
    return { files: found, ignored, outside }
  }

  private packageDirExists(packageName: string, fromPath: string): boolean {
    const rel = dottedToPath(packageName)
    for (const root of this.orderedRoots(fromPath)) {
      const dir = this.joinUnderRoot(root, rel)
      if (dir === undefined) continue
      if (packageJavaFiles(this.context.files, dir).length > 0) return true
    }
    return false
  }

  private missedInProject(base: string, fromPath: string): boolean {
    const parent = parentName(base)
    if (parent && this.packageDirExists(parent, fromPath)) return true
    return this.packageDirExists(base, fromPath)
  }

  private externalName(parsed: { base: string; wildcard: boolean }, resolvedType?: string): string {
    if (resolvedType) return resolvedType
    return parsed.base
  }

  resolveAll(specifier: string | null, fromPath: string): ResolveOutcome[] {
    if (specifier === null || specifier === '') return [{ kind: 'unresolved', reason: 'non-literal-specifier' }]
    const parsed = parseJavaSpecifier(specifier)
    if (!parsed || !parsed.base.split('.').every(isJavaIdent)) {
      return [{ kind: 'unresolved', reason: 'not-found' }]
    }

    const fileOutcome = (path: string): ResolveOutcome => ({ kind: 'file', path, provenance: 'EXTRACTED' })

    if (parsed.wildcard) {
      const inPackage = this.filesInPackage(parsed.base, fromPath)
      if (inPackage.files.length > 0) return inPackage.files.map(fileOutcome)
      const asType = this.typeFile(parsed.base, fromPath)
      if (asType.files.length > 0) return asType.files.map(fileOutcome)
      if (inPackage.outside && asType.outside && inPackage.files.length === 0 && asType.files.length === 0 && !this.missedInProject(parsed.base, fromPath)) {
        // keep going to ignored / external
      }
      if (inPackage.ignored || asType.ignored) return [{ kind: 'unresolved', reason: 'target-ignored' }]
      if (this.missedInProject(parsed.base, fromPath)) return [{ kind: 'unresolved', reason: 'not-found' }]
      return [{ kind: 'external', ecosystem: 'maven', name: this.externalName(parsed) }]
    }

    const direct = this.typeFile(parsed.base, fromPath)
    if (direct.files.length > 0) return direct.files.map(fileOutcome)
    const parent = parentName(parsed.base)
    if (parent) {
      const enclosing = this.typeFile(parent, fromPath)
      if (enclosing.files.length > 0) return enclosing.files.map(fileOutcome)
    }
    if (direct.ignored) return [{ kind: 'unresolved', reason: 'target-ignored' }]
    if (this.missedInProject(parsed.base, fromPath) || (parent !== undefined && this.missedInProject(parent, fromPath))) {
      return [{ kind: 'unresolved', reason: 'not-found' }]
    }
    return [{ kind: 'external', ecosystem: 'maven', name: parsed.base }]
  }

  resolve(specifier: string | null, fromPath: string): ResolveOutcome {
    return this.resolveAll(specifier, fromPath)[0] ?? { kind: 'unresolved', reason: 'not-found' }
  }
}
