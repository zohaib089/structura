import { parseJsonc } from '../adapters/ts-js/jsonc.js'
import { compareStrings } from '../graph/ids.js'
import type { EntryCandidate, EntryCandidateDetail, EntryEvidence, EntryReason, Provenance, Span } from '../graph/types.js'

const CONVENTIONAL = new Set([
  'index.ts', 'index.tsx', 'index.js', 'index.mjs', 'index.cjs', 'index.mts', 'index.cts',
  'main.ts', 'main.js', 'main.mjs', 'main.py', '__main__.py',
  'server.ts', 'server.js', 'server.mjs', 'server.py',
  'cli.ts', 'cli.js', 'cli.mjs', 'cli.py'
])

const BUILD_DIR = /^(?:\.\/)?(?:dist|build|lib|out)\/(.*)$/
const SCRIPT_CMD = /\b(?:node|tsx|ts-node)\s+(\.[^\s]+|\S+\.(?:js|mjs|cjs|ts|tsx|mts|cts))\b/
const PYTHON_MAIN = /^[ \t]*if[ \t]+__name__[ \t]*==[ \t]*(['"])__main__\1[ \t]*:[ \t]*(?:#.*)?$/
const FILEish = /^\.?\/?[\w./-]+\.(?:js|mjs|cjs|ts|tsx|mts|cts|py)(?:\s|$)/

/** Documented confidence table (graph-json-v1.md). */
export const ENTRY_CONFIDENCE: Record<EntryReason, number> = {
  'package-exports': 0.95,
  'package-main': 0.95,
  'package-bin': 0.95,
  'pyproject-script': 0.95,
  'pyproject-gui-script': 0.9,
  'setup-console-script': 0.85,
  'dockerfile-entrypoint': 0.85,
  'dockerfile-cmd': 0.8,
  'package-script': 0.75,
  'python-name-main': 0.85,
  'conventional-name': 0.65
}

const RANK: Record<EntryReason, number> = {
  'package-exports': 10,
  'package-main': 9,
  'package-bin': 8,
  'pyproject-script': 7,
  'pyproject-gui-script': 7,
  'setup-console-script': 7,
  'dockerfile-entrypoint': 6,
  'dockerfile-cmd': 5,
  'package-script': 4,
  'python-name-main': 3,
  'conventional-name': 1
}

const EXTRACTED_REASONS = new Set<EntryReason>([
  'package-exports',
  'package-main',
  'package-bin',
  'pyproject-script',
  'pyproject-gui-script',
  'setup-console-script'
])

export interface EntryScanResult {
  primary: EntryCandidate
  candidates: EntryCandidateDetail[]
}

function dirOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
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

function pickModuleFile(files: ReadonlySet<string>, dotted: string): string | undefined {
  const base = dotted.replace(/\./g, '/')
  const py = `${base}.py`
  const pyi = `${base}.pyi`
  if (files.has(py)) return py
  if (files.has(pyi)) return pyi
  const initPy = joinRepo(base, '__init__.py')
  const initPyi = joinRepo(base, '__init__.pyi')
  if (initPy && files.has(initPy)) return initPy
  if (initPyi && files.has(initPyi)) return initPyi
  return undefined
}

function moduleTarget(files: ReadonlySet<string>, modulePath: string, fromDir: string): string | undefined {
  const cleaned = modulePath.split(':')[0]?.trim() ?? ''
  if (cleaned === '') return undefined
  const dotted = cleaned.replace(/\./g, '/')
  const atPackage = resolveEntryPath(fromDir, dotted, files) ?? pickModuleFile(files, joinRepo(fromDir, dotted) ?? dotted)
  if (atPackage && files.has(atPackage)) return atPackage
  const atRoot = pickModuleFile(files, dotted)
  if (atRoot) return atRoot
  const underSrc = pickModuleFile(files, joinRepo('src', dotted) ?? `src/${dotted}`)
  return underSrc
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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

function pointer(source: string, jsonPointer: string): string {
  return `${source}#${jsonPointer.startsWith('/') ? jsonPointer : `/${jsonPointer}`}`
}

function addCandidate(
  bucket: Map<string, EntryCandidateDetail[]>,
  path: string | undefined,
  reason: EntryReason,
  evidence: EntryEvidence,
  files: ReadonlySet<string>
): void {
  if (path === undefined || path === '' || !files.has(path)) return
  const list = bucket.get(path) ?? []
  const duplicate = list.some(item => item.reason === reason && item.evidence.pointer === evidence.pointer && JSON.stringify(item.evidence.span) === JSON.stringify(evidence.span))
  if (duplicate) return
  list.push({ reason, evidence, confidence: ENTRY_CONFIDENCE[reason] })
  bucket.set(path, list)
}

function compareCandidates(left: EntryCandidateDetail, right: EntryCandidateDetail): number {
  const rank = RANK[right.reason] - RANK[left.reason]
  if (rank !== 0) return rank
  const reason = compareStrings(left.reason, right.reason)
  if (reason !== 0) return reason
  const source = compareStrings(left.evidence.source, right.evidence.source)
  if (source !== 0) return source
  const lp = left.evidence.pointer ?? ''
  const rp = right.evidence.pointer ?? ''
  const ptr = compareStrings(lp, rp)
  if (ptr !== 0) return ptr
  const ls = left.evidence.span?.start.line ?? 0
  const rs = right.evidence.span?.start.line ?? 0
  if (ls !== rs) return ls - rs
  const lc = left.evidence.span?.start.col ?? 0
  const rc = right.evidence.span?.start.col ?? 0
  return lc - rc
}

function sortCandidates(list: EntryCandidateDetail[]): EntryCandidateDetail[] {
  return [...list].sort(compareCandidates)
}

function primaryFrom(list: EntryCandidateDetail[]): EntryCandidate {
  const winner = list[0] as EntryCandidateDetail
  const provenance: Provenance = EXTRACTED_REASONS.has(winner.reason) ? 'EXTRACTED' : 'INFERRED'
  return { reason: winner.reason, provenance }
}

function parseIniSectionLines(text: string, section: string): string[] {
  const lines = text.split('\n')
  const out: string[] = []
  let active = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      active = trimmed.slice(1, -1).trim().toLowerCase() === section.toLowerCase()
      continue
    }
    if (!active || trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith(';')) continue
    out.push(line)
  }
  return out
}

function parseTomlTable(text: string, table: string): Map<string, string> {
  const lines = text.split('\n')
  const out = new Map<string, string>()
  let active = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      active = trimmed.slice(1, -1).trim() === table
      continue
    }
    if (!active || trimmed === '' || trimmed.startsWith('#')) continue
    const match = /^([^=]+?)\s*=\s*(.+)$/.exec(trimmed)
    if (!match) continue
    const key = match[1]?.trim()
    let value = match[2]?.trim() ?? ''
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (key) out.set(key, value)
  }
  return out
}

function lineSpan(text: string, lineIndex: number): Span {
  const lines = text.split('\n')
  const line = lineIndex + 1
  const content = lines[lineIndex] ?? ''
  return { start: { line, col: 1 }, end: { line, col: Math.max(2, content.length + 1) } }
}

function dockerExecPaths(payload: string): string[] {
  const trimmed = payload.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && (item.startsWith('.') || /\.(?:js|mjs|cjs|ts|tsx|mts|cts|py)$/.test(item)))
      }
    } catch {
      return []
    }
  }
  return trimmed.split(/\s+/).filter(token => FILEish.test(token) || token.endsWith('.js') || token.endsWith('.ts') || token.endsWith('.py'))
}

function markPackage(
  bucket: Map<string, EntryCandidateDetail[]>,
  configFile: string,
  dir: string,
  rel: string,
  files: ReadonlySet<string>,
  reason: EntryReason,
  jsonPointer: string
): void {
  const target = resolveEntryPath(dir, rel, files)
  addCandidate(bucket, target, reason, { source: configFile, pointer: pointer(configFile, jsonPointer) }, files)
}

function scanPackageJson(
  bucket: Map<string, EntryCandidateDetail[]>,
  file: string,
  json: Record<string, unknown>,
  files: ReadonlySet<string>
): void {
  const dir = dirOf(file)
  for (const field of ['main', 'module'] as const) {
    if (typeof json[field] === 'string') {
      markPackage(bucket, file, dir, json[field], files, 'package-main', `/${field}`)
    }
  }
  const exportsValue = json.exports
  if (exportsValue !== undefined) {
    const paths: string[] = []
    exportPaths(exportsValue, paths)
    paths.sort(compareStrings)
    for (const rel of paths) {
      markPackage(bucket, file, dir, rel, files, 'package-exports', `/exports/${rel.replace(/^\.\//, '')}`)
    }
  }
  const bin = json.bin
  if (typeof bin === 'string') markPackage(bucket, file, dir, bin, files, 'package-bin', '/bin')
  else if (isObject(bin)) {
    for (const [name, value] of Object.entries(bin).sort(([a], [b]) => compareStrings(a, b))) {
      if (typeof value === 'string') markPackage(bucket, file, dir, value, files, 'package-bin', `/bin/${name}`)
    }
  }
  if (isObject(json.scripts)) {
    for (const [name, value] of Object.entries(json.scripts).sort(([a], [b]) => compareStrings(a, b))) {
      if (typeof value !== 'string') continue
      const match = SCRIPT_CMD.exec(value)
      const rel = match?.[1] ?? (/^\.[^\s]+$/.test(value) ? value : undefined)
      if (rel) markPackage(bucket, file, dir, rel, files, 'package-script', `/scripts/${name}`)
    }
  }
}

function scanPyproject(
  bucket: Map<string, EntryCandidateDetail[]>,
  file: string,
  text: string,
  files: ReadonlySet<string>
): void {
  const dir = dirOf(file)
  for (const [table, reason] of [['project.scripts', 'pyproject-script'], ['project.gui-scripts', 'pyproject-gui-script']] as const) {
    const entries = parseTomlTable(text, table)
    for (const [name, target] of [...entries.entries()].sort(([a], [b]) => compareStrings(a, b))) {
      const path = moduleTarget(files, target, dir) ?? resolveEntryPath(dir, target, files)
      addCandidate(bucket, path, reason, { source: file, pointer: pointer(file, `/${table.replace('.', '/')}/${name}`) }, files)
    }
  }
}

function scanSetupCfg(
  bucket: Map<string, EntryCandidateDetail[]>,
  file: string,
  text: string,
  files: ReadonlySet<string>
): void {
  const dir = dirOf(file)
  const lines = parseIniSectionLines(text, 'options.entry_points')
  const scripts: Array<{ name: string; target: string }> = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const keyMatch = /^console_scripts\s*=\s*(.*)$/.exec(trimmed)
    if (keyMatch) {
      const inline = keyMatch[1]?.trim() ?? ''
      if (inline) scripts.push(...splitConsoleScript(inline))
      continue
    }
    const entry = /^\s*(\S+)\s*=\s*(.+)$/.exec(line)
    if (entry) scripts.push({ name: entry[1] as string, target: (entry[2] as string).trim() })
  }
  for (const { name, target } of scripts.sort((a, b) => compareStrings(a.name, b.name))) {
    const path = moduleTarget(files, target, dir)
    addCandidate(bucket, path, 'setup-console-script', { source: file, pointer: pointer(file, `/options.entry_points/console_scripts/${name}`) }, files)
  }
}

function splitConsoleScript(value: string): Array<{ name: string; target: string }> {
  return value.split(/[\n,]/).map(item => item.trim()).filter(Boolean).flatMap(part => {
    const eq = part.indexOf('=')
    if (eq === -1) return []
    return [{ name: part.slice(0, eq).trim(), target: part.slice(eq + 1).trim() }]
  })
}

function scanDockerfile(
  bucket: Map<string, EntryCandidateDetail[]>,
  file: string,
  text: string,
  files: ReadonlySet<string>
): void {
  const dir = dirOf(file)
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const match = /^(?:CMD|ENTRYPOINT)\s+(.+)$/i.exec(line.trim())
    if (!match) continue
    const reason: EntryReason = line.trim().toUpperCase().startsWith('ENTRYPOINT') ? 'dockerfile-entrypoint' : 'dockerfile-cmd'
    for (const token of dockerExecPaths(match[1] as string)) {
      const rel = token.replace(/^\.\//, '')
      const target = resolveEntryPath(dir, rel, files) ?? resolveEntryPath('', rel, files)
      addCandidate(bucket, target, reason, { source: file, span: lineSpan(text, index) }, files)
    }
  }
}

function scanPythonMainGuard(
  bucket: Map<string, EntryCandidateDetail[]>,
  file: string,
  text: string,
  files: ReadonlySet<string>
): void {
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    if (!PYTHON_MAIN.test(lines[index] ?? '')) continue
    addCandidate(bucket, file, 'python-name-main', { source: file, span: lineSpan(text, index) }, files)
    break
  }
}

/**
 * Collects deterministic entry candidates per file. The legacy {@link EntryCandidate} is the highest-precedence reason.
 */
export function findEntryCandidates(
  files: ReadonlySet<string>,
  readText: (path: string) => string | undefined,
  readJson: (path: string) => unknown
): Map<string, EntryScanResult> {
  const bucket = new Map<string, EntryCandidateDetail[]>()
  const packageFiles = [...files].filter(file => baseName(file) === 'package.json').sort(compareStrings)
  const packageDirs = new Set<string>()

  for (const file of packageFiles) {
    packageDirs.add(dirOf(file))
    const json = readJson(file)
    if (isObject(json)) scanPackageJson(bucket, file, json, files)
  }

  for (const file of [...files].sort(compareStrings)) {
    const name = baseName(file)
    if (name === 'pyproject.toml') scanPyproject(bucket, file, readText(file) ?? '', files)
    else if (name === 'setup.cfg') scanSetupCfg(bucket, file, readText(file) ?? '', files)
    else if (name === 'Dockerfile' || name.toLowerCase().startsWith('dockerfile.')) scanDockerfile(bucket, file, readText(file) ?? '', files)
    else if (name.endsWith('.py')) scanPythonMainGuard(bucket, file, readText(file) ?? '', files)
  }

  for (const file of [...files].sort(compareStrings)) {
    if (!CONVENTIONAL.has(baseName(file))) continue
    const dir = dirOf(file)
    if (dir === '' || packageDirs.has(dir)) {
      addCandidate(bucket, file, 'conventional-name', { source: file, pointer: pointer(file, '/conventional') }, files)
    }
  }

  const out = new Map<string, EntryScanResult>()
  for (const [path, list] of bucket.entries()) {
    const candidates = sortCandidates(list)
    if (candidates.length === 0) continue
    out.set(path, { candidates, primary: primaryFrom(candidates) })
  }
  return out
}

export function readJsonValue(text: string | undefined): unknown {
  if (text === undefined) return undefined
  try {
    return parseJsonc(text)
  } catch {
    return undefined
  }
}

export function entryCandidateIssues(node: { path: string; entryCandidate?: EntryCandidate; entryCandidates?: EntryCandidateDetail[] }, base: string): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = []
  const list = node.entryCandidates
  if (!list || list.length === 0) return issues
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index] as EntryCandidateDetail
    const at = `${base}/entryCandidates/${index}`
    if (item.confidence !== ENTRY_CONFIDENCE[item.reason]) {
      issues.push({ path: `${at}/confidence`, message: `must equal ${ENTRY_CONFIDENCE[item.reason]} for reason "${item.reason}"` })
    }
    const evidence = item.evidence
    if (!evidence.pointer && !evidence.span) issues.push({ path: `${at}/evidence`, message: 'must include pointer or span' })
    if (index > 0 && compareCandidates(list[index - 1] as EntryCandidateDetail, item) > 0) {
      issues.push({ path: at, message: 'entryCandidates must be in canonical order' })
    }
  }
  if (node.entryCandidate) {
    const top = list[0] as EntryCandidateDetail
    if (node.entryCandidate.reason !== top.reason) {
      issues.push({ path: `${base}/entryCandidate/reason`, message: 'must match the first entryCandidates reason' })
    }
    const provenance: Provenance = EXTRACTED_REASONS.has(top.reason) ? 'EXTRACTED' : 'INFERRED'
    if (node.entryCandidate.provenance !== provenance) {
      issues.push({ path: `${base}/entryCandidate/provenance`, message: 'must match provenance implied by the first entryCandidates reason' })
    }
  }
  return issues
}
