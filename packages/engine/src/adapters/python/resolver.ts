import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { posix } from 'node:path'
import type { ModuleResolver, ResolveOutcome } from '../adapter.js'
import type { InferredReason } from '../../graph/types.js'

export interface PythonResolverContext {
  files: ReadonlySet<string>
  ignoredPaths: readonly string[]
}

const stdlibModules = new Set(
  (JSON.parse(readFileSync(fileURLToPath(new URL('../../../data/python-stdlib.json', import.meta.url)), 'utf8')) as { modules: string[] }).modules
)

const TYPE_ONLY_STDLIB = new Set(['_typeshed'])

function dirOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

function joinRepo(...parts: string[]): string {
  const joined = posix.normalize(posix.join(...parts.map(part => (part === '' ? '.' : part))))
  return joined === '.' ? '' : joined.replace(/^\.\//, '').replace(/\/$/, '')
}

type PathResult =
  | { kind: 'found'; path: string }
  | { kind: 'ignored' }
  | { kind: 'outside' }
  | { kind: 'missing' }

/** Prefer `.py` over `.pyi` when both exist. */
function pickModuleFile(files: ReadonlySet<string>, basePath: string): string | undefined {
  const py = `${basePath}.py`
  const pyi = `${basePath}.pyi`
  if (files.has(py)) return py
  if (files.has(pyi)) return pyi
  const initPy = joinRepo(basePath, '__init__.py')
  const initPyi = joinRepo(basePath, '__init__.pyi')
  if (files.has(initPy)) return initPy
  if (files.has(initPyi)) return initPyi
  return undefined
}

export class PythonResolver implements ModuleResolver {
  private constructor(
    private readonly context: PythonResolverContext
  ) {}

  static create(context: PythonResolverContext): PythonResolver {
    return new PythonResolver(context)
  }

  private isIgnored(path: string): boolean {
    return this.context.ignoredPaths.some(ignored => path === ignored || path.startsWith(`${ignored}/`))
  }

  private resolvePath(candidate: string): PathResult {
    if (candidate === '..' || candidate.startsWith('../')) return { kind: 'outside' }
    const found = pickModuleFile(this.context.files, candidate)
    if (found) return { kind: 'found', path: found }
    if (this.context.files.has(candidate)) return { kind: 'found', path: candidate }
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

  private resolveAbsoluteModule(specifier: string): ResolveOutcome {
    const cleaned = specifier.replace(/[?#].*$/, '')
    const parts = cleaned.split('.').filter(part => part.length > 0)
    if (parts.length === 0) return { kind: 'unresolved', reason: 'unsupported-specifier' }
    const dotted = parts.join('/')
    const atRoot = this.resolvePath(dotted)
    if (atRoot.kind === 'found') return this.fileOutcome(atRoot.path)
    if (atRoot.kind === 'ignored' || atRoot.kind === 'outside') return this.failure(atRoot)

    const underSrc = this.resolvePath(joinRepo('src', dotted))
    if (underSrc.kind === 'found') return this.inferredOutcome(underSrc.path, 'src-root-guess', 0.7)
    if (underSrc.kind === 'ignored') return this.failure(underSrc)

    const rootName = parts[0] as string
    if (stdlibModules.has(cleaned) || stdlibModules.has(rootName)) {
      return { kind: 'external', ecosystem: 'pypi', name: rootName }
    }
    if (/^[a-zA-Z_]\w*$/.test(rootName)) return { kind: 'external', ecosystem: 'pypi', name: rootName }
    return { kind: 'unresolved', reason: 'not-found' }
  }

  private resolveRelativeModule(specifier: string, fromPath: string, dotImportName?: string): ResolveOutcome {
    const match = /^(\.+)(.*)$/.exec(specifier)
    if (!match) return { kind: 'unresolved', reason: 'unsupported-specifier' }
    const dots = match[1] as string
    const remainder = (match[2] as string).replace(/^\./, '')
    let base = dirOf(fromPath)
    const up = dots.length - 1
    for (let step = 0; step < up; step += 1) {
      base = dirOf(base)
      if (base === '..' || base.startsWith('../')) return { kind: 'unresolved', reason: 'outside-root' }
    }
    if (dotImportName !== undefined && dots === '.' && remainder === '') {
      const sibling = joinRepo(base, dotImportName.replace(/\./g, '/'))
      const found = this.resolvePath(sibling)
      if (found.kind === 'found') return this.inferredOutcome(found.path, 'submodule-heuristic', 0.6)
      return this.failure(found)
    }
    const modulePath = remainder === '' ? base : joinRepo(base, remainder.replace(/\./g, '/'))
    const resolved = this.resolvePath(modulePath)
    if (resolved.kind === 'found') return this.fileOutcome(resolved.path)
    return this.failure(resolved)
  }

  /** `from . import submodule` (specifier `.` on the edge). */
  resolveFromDotImport(name: string, fromPath: string): ResolveOutcome {
    return this.resolveRelativeModule('.', fromPath, name)
  }

  resolve(specifier: string | null, fromPath: string): ResolveOutcome {
    if (specifier === null) return { kind: 'unresolved', reason: 'non-literal-specifier' }
    if (specifier === '') return { kind: 'unresolved', reason: 'unsupported-specifier' }
    if (specifier.startsWith('/')) return { kind: 'unresolved', reason: 'outside-root' }
    if (specifier.startsWith('.')) return this.resolveRelativeModule(specifier, fromPath)
    return this.resolveAbsoluteModule(specifier)
  }

  /** Marks imports that should carry `typeOnly` on the edge (stdlib typing stubs). */
  isTypeOnlyExternal(specifier: string): boolean {
    const root = specifier.split('.')[0] ?? specifier
    return TYPE_ONLY_STDLIB.has(root) || TYPE_ONLY_STDLIB.has(specifier)
  }
}
