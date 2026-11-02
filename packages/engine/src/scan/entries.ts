import type { EntryCandidate, EntryReason } from '../graph/types.js'
import { parseJsonc } from '../adapters/ts-js/jsonc.js'

const CONVENTIONAL = new Set([
  'index.ts', 'index.tsx', 'index.js', 'index.mjs', 'index.cjs', 'index.mts', 'index.cts',
  'main.ts', 'main.js', 'main.mjs', 'main.py', '__main__.py'
])

const BUILD_DIR = /^(?:\.\/)?(?:dist|build|lib|out)\/(.*)$/

const RANK: Record<EntryReason, number> = {
  'package-exports': 5,
  'package-main': 4,
  'package-bin': 3,
  'package-script': 2,
  'conventional-name': 1
}

function dirOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function resolveEntryPath(dir: string, rel: string, files: ReadonlySet<string>): string | undefined {
  const direct = joinRepo(dir, rel)
  if (direct && files.has(direct)) return direct
  const normalized = rel.replace(/^\.\//, '')
  const mapped = BUILD_DIR.exec(normalized)
  if (mapped) {
    const source = joinRepo(dir, `src/${mapped[1] ?? ''}`)
    if (source && files.has(source)) return source
  }
  return direct
}

function joinRepo(dir: string, rel: string): string | undefined {
  if (rel.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(rel)) return undefined
  const parts = `${dir === '' ? '' : `${dir}/`}${rel.replace(/^\.\//, '')}`.split('/')
  const stack: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (stack.length === 0) return undefined
      stack.pop()
      continue
    }
    stack.push(part)
  }
  return stack.join('/')
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Relative file paths named by a package.json `exports` value. Conditions are walked, nothing is executed. */
function exportPaths(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    if (value.startsWith('.')) out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) exportPaths(item, out)
    return
  }
  if (isObject(value)) {
    for (const item of Object.values(value)) exportPaths(item, out)
  }
}

/**
 * One entry candidate per file (the schema stores a single object). Several files may be candidates.
 * Package.json fields outrank conventional names. The highest-precedence reason wins when a file matches more than once.
 */
export function findEntryCandidates(files: ReadonlySet<string>, readJson: (path: string) => unknown): Map<string, EntryCandidate> {
  const chosen = new Map<string, { candidate: EntryCandidate; rank: number }>()
  const mark = (path: string | undefined, reason: EntryReason, provenance: EntryCandidate['provenance']): void => {
    if (path === undefined || path === '' || !files.has(path)) return
    const rank = RANK[reason]
    const existing = chosen.get(path)
    if (existing && existing.rank >= rank) return
    chosen.set(path, { rank, candidate: { reason, provenance } })
  }

  const packageFiles = [...files].filter(file => baseName(file) === 'package.json').sort()
  const packageDirs = new Set<string>()
  for (const file of packageFiles) {
    const dir = dirOf(file)
    packageDirs.add(dir)
    const json = readJson(file)
    if (!isObject(json)) continue
    for (const field of ['main', 'module'] as const) {
      if (typeof json[field] === 'string') mark(resolveEntryPath(dir, json[field], files), 'package-main', 'EXTRACTED')
    }
    const exportsValue = json.exports
    if (exportsValue !== undefined) {
      const paths: string[] = []
      exportPaths(exportsValue, paths)
      for (const rel of paths) mark(resolveEntryPath(dir, rel, files), 'package-exports', 'EXTRACTED')
    }
    const bin = json.bin
    if (typeof bin === 'string') mark(resolveEntryPath(dir, bin, files), 'package-bin', 'EXTRACTED')
    else if (isObject(bin)) {
      for (const value of Object.values(bin)) {
        if (typeof value === 'string') mark(resolveEntryPath(dir, value, files), 'package-bin', 'EXTRACTED')
      }
    }
    if (isObject(json.scripts)) {
      for (const value of Object.values(json.scripts)) {
        if (typeof value !== 'string') continue
        const node = /\bnode\s+(\.[^\s]+|\S+\.(?:js|mjs|cjs|ts|tsx|mts|cts))\b/.exec(value)
        const rel = node?.[1] ?? (/^\.[^\s]+$/.test(value) ? value : undefined)
        if (rel) mark(resolveEntryPath(dir, rel, files), 'package-script', 'INFERRED')
      }
    }
  }

  for (const file of files) {
    if (!CONVENTIONAL.has(baseName(file))) continue
    const dir = dirOf(file)
    if (dir === '' || packageDirs.has(dir)) mark(file, 'conventional-name', 'INFERRED')
  }

  return new Map([...chosen.entries()].map(([path, value]) => [path, value.candidate]))
}

export function readJsonValue(text: string | undefined): unknown {
  if (text === undefined) return undefined
  try {
    return parseJsonc(text)
  } catch {
    return undefined
  }
}
