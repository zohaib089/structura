import { posix } from 'node:path'
import type { ModuleResolver, ResolveOutcome } from '../adapter.js'

export const RUST_STD_CRATES = new Set(['std', 'core', 'alloc'])

export interface RustResolverContext {
  files: ReadonlySet<string>
  ignoredPaths: readonly string[]
  /** Directories that contain a `Cargo.toml` (`.` at the repo root). */
  cargoDirs: ReadonlySet<string>
}

function dirOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '.' : path.slice(0, index)
}

function baseName(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? path : path.slice(index + 1)
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

/** `foo.rs` or `foo/mod.rs` under a module directory. Prefers `foo.rs` when both exist. */
export function rustModuleFile(files: ReadonlySet<string>, moduleDir: string, name: string): string | undefined {
  if (!name || hasDotDot(name) || name.includes('/')) return undefined
  const file = joinRepo(moduleDir, `${name}.rs`)
  if (!escapesRoot(file) && files.has(file)) return file
  const nested = joinRepo(moduleDir, `${name}/mod.rs`)
  if (!escapesRoot(nested) && files.has(nested)) return nested
  return undefined
}

/** Directory in which `mod name;` looks for `name.rs` or `name/mod.rs`. */
export function rustChildModuleDir(filePath: string): string {
  const dir = dirOf(filePath)
  const name = baseName(filePath)
  if (name === 'mod.rs' || name === 'lib.rs' || name === 'main.rs') return dir
  const stem = name.endsWith('.rs') ? name.slice(0, -3) : name
  return joinRepo(dir, stem)
}

function srcDirOf(cargoDir: string): string {
  return cargoDir === '.' ? 'src' : `${cargoDir}/src`
}

export class RustResolver implements ModuleResolver {
  private constructor(private readonly context: RustResolverContext) {}

  static create(context: RustResolverContext): RustResolver {
    return new RustResolver(context)
  }

  private cargoDirFor(fromPath: string): string | undefined {
    let dir: string | undefined = dirOf(fromPath)
    while (dir !== undefined) {
      if (this.context.cargoDirs.has(dir)) return dir
      if (dir === '.') return undefined
      const parent = dir.lastIndexOf('/')
      dir = parent === -1 ? '.' : dir.slice(0, parent)
    }
    return undefined
  }

  private crateRoots(cargoDir: string): { lib?: string; main?: string; src: string } {
    const src = srcDirOf(cargoDir)
    const lib = joinRepo(src, 'lib.rs')
    const main = joinRepo(src, 'main.rs')
    return {
      src,
      lib: this.context.files.has(lib) ? lib : undefined,
      main: this.context.files.has(main) ? main : undefined
    }
  }

  private crateRootFile(fromPath: string, cargoDir: string): string | undefined {
    const roots = this.crateRoots(cargoDir)
    if (fromPath === roots.main || (roots.main && !roots.lib)) return roots.main
    return roots.lib ?? roots.main
  }

  private moduleSegments(filePath: string, cargoDir: string): string[] | undefined {
    const roots = this.crateRoots(cargoDir)
    if (filePath === roots.lib || filePath === roots.main) return []
    const prefix = `${roots.src}/`
    if (!filePath.startsWith(prefix)) return undefined
    let rel = filePath.slice(prefix.length)
    if (rel.endsWith('/mod.rs')) rel = rel.slice(0, -'/mod.rs'.length)
    else if (rel.endsWith('.rs')) rel = rel.slice(0, -3)
    else return undefined
    if (!rel || hasDotDot(rel)) return undefined
    return rel.split('/')
  }

  private fileForSegments(cargoDir: string, segments: string[], fromPath: string): string | undefined {
    if (segments.length === 0) return this.crateRootFile(fromPath, cargoDir)
    const src = srcDirOf(cargoDir)
    const dir = segments.length === 1 ? src : joinRepo(src, segments.slice(0, -1).join('/'))
    if (dir !== '.' && escapesRoot(dir)) return undefined
    return rustModuleFile(this.context.files, dir, segments[segments.length - 1] as string)
  }

  private childOf(filePath: string, name: string): string | undefined {
    return rustModuleFile(this.context.files, rustChildModuleDir(filePath), name)
  }

  private outcomeForFile(path: string): ResolveOutcome {
    if (isIgnored(this.context.ignoredPaths, path)) return { kind: 'unresolved', reason: 'target-ignored' }
    if (this.context.files.has(path)) return { kind: 'file', path, provenance: 'EXTRACTED' }
    return { kind: 'unresolved', reason: 'not-found' }
  }

  private parseSpecifier(specifier: string): { kind: 'mod'; name: string } | { kind: 'path'; segments: string[] } {
    if (specifier.startsWith('mod ')) return { kind: 'mod', name: specifier.slice(4).trim() }
    const trimmed = specifier.startsWith('::') ? specifier.slice(2) : specifier
    const segments = trimmed.split('::').filter(part => part.length > 0)
    return { kind: 'path', segments }
  }

  private externalName(segments: string[]): string {
    return segments[0] ?? ''
  }

  private isExternal(segments: string[]): boolean {
    const root = segments[0] ?? ''
    if (root === 'crate' || root === 'self' || root === 'super') return false
    return root.length > 0
  }

  private resolveInternal(segments: string[], fromPath: string): ResolveOutcome[] {
    const cargoDir = this.cargoDirFor(fromPath)
    const first = segments[0]
    let current: string | undefined
    let rest: string[]

    if (first === 'crate') {
      if (!cargoDir) return [{ kind: 'unresolved', reason: 'not-found' }]
      current = this.crateRootFile(fromPath, cargoDir)
      if (!current) return [{ kind: 'unresolved', reason: 'not-found' }]
      rest = segments.slice(1)
    } else if (first === 'self') {
      current = fromPath
      rest = segments.slice(1)
    } else if (first === 'super') {
      if (!cargoDir) {
        // Climb file-system parents of the current module dir, but not without a crate.
        return [{ kind: 'unresolved', reason: 'not-found' }]
      }
      const segs = this.moduleSegments(fromPath, cargoDir)
      if (segs === undefined) return [{ kind: 'unresolved', reason: 'not-found' }]
      let climbed = [...segs]
      rest = segments
      while (rest[0] === 'super') {
        if (climbed.length === 0) return [{ kind: 'unresolved', reason: 'outside-root' }]
        climbed.pop()
        rest = rest.slice(1)
      }
      current = this.fileForSegments(cargoDir, climbed, fromPath)
      if (!current) return [{ kind: 'unresolved', reason: 'not-found' }]
    } else {
      return [{ kind: 'unresolved', reason: 'not-found' }]
    }

    for (let index = 0; index < rest.length; index += 1) {
      const segment = rest[index] as string
      if (segment === '*') break
      if (segment === 'self') continue
      if (segment === 'super') {
        if (!cargoDir) return [{ kind: 'unresolved', reason: 'not-found' }]
        const segs = this.moduleSegments(current, cargoDir)
        if (!segs || segs.length === 0) return [{ kind: 'unresolved', reason: 'outside-root' }]
        const parent = this.fileForSegments(cargoDir, segs.slice(0, -1), fromPath)
        if (!parent) return [{ kind: 'unresolved', reason: 'not-found' }]
        current = parent
        continue
      }
      const child = this.childOf(current, segment)
      if (child) {
        current = child
        continue
      }
      if (index === rest.length - 1) break
      return [{ kind: 'unresolved', reason: 'not-found' }]
    }

    if (!current) return [{ kind: 'unresolved', reason: 'not-found' }]
    if (current !== '.' && escapesRoot(current)) return [{ kind: 'unresolved', reason: 'outside-root' }]
    return [this.outcomeForFile(current)]
  }

  resolveAll(specifier: string | null, fromPath: string): ResolveOutcome[] {
    if (specifier === null || specifier === '') return [{ kind: 'unresolved', reason: 'non-literal-specifier' }]
    const parsed = this.parseSpecifier(specifier)
    if (parsed.kind === 'mod') {
      if (!parsed.name || hasDotDot(parsed.name)) return [{ kind: 'unresolved', reason: 'not-found' }]
      const path = this.childOf(fromPath, parsed.name)
      if (!path) {
        const candidateDir = rustChildModuleDir(fromPath)
        const ignoredFile = joinRepo(candidateDir, `${parsed.name}.rs`)
        const ignoredMod = joinRepo(candidateDir, `${parsed.name}/mod.rs`)
        if (isIgnored(this.context.ignoredPaths, ignoredFile) || isIgnored(this.context.ignoredPaths, ignoredMod)) {
          return [{ kind: 'unresolved', reason: 'target-ignored' }]
        }
        return [{ kind: 'unresolved', reason: 'not-found' }]
      }
      return [this.outcomeForFile(path)]
    }
    if (parsed.segments.length === 0) return [{ kind: 'unresolved', reason: 'not-found' }]
    if (this.isExternal(parsed.segments)) {
      return [{ kind: 'external', ecosystem: 'cargo', name: this.externalName(parsed.segments) }]
    }
    return this.resolveInternal(parsed.segments, fromPath)
  }

  resolve(specifier: string | null, fromPath: string): ResolveOutcome {
    return this.resolveAll(specifier, fromPath)[0] ?? { kind: 'unresolved', reason: 'not-found' }
  }
}
