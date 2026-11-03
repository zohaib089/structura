import { matchPathPattern } from '../graph/path-glob.js'
import type { ArchitectureModuleDecl } from './types.js'

/** First matching module wins (declaration order: layers then modules). */
export function assignModule(path: string, modules: readonly ArchitectureModuleDecl[]): string | undefined {
  for (const mod of modules) {
    for (const pattern of mod.paths) {
      if (matchPathPattern(path, pattern)) return mod.name
    }
  }
  return undefined
}

export function buildModuleMap(
  paths: readonly string[],
  modules: readonly ArchitectureModuleDecl[]
): { byPath: Map<string, string | undefined>; unassigned: string[] } {
  const byPath = new Map<string, string | undefined>()
  const unassigned: string[] = []
  for (const path of paths) {
    const mod = assignModule(path, modules)
    byPath.set(path, mod)
    if (mod === undefined) unassigned.push(path)
  }
  unassigned.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return { byPath, unassigned }
}
