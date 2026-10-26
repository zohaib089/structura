import { lstat, open, readdir, readlink, realpath } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { IGNORE_FILE } from '../brand.js'
import { compareStrings, isRepresentablePath } from '../graph/ids.js'
import { LANGUAGES, type FailReason, type SkipReason } from '../graph/types.js'
import { LIMITS, resolveLimits, type ResolvedLimits } from '../limits.js'
import ignore, { type Ignore } from 'ignore'
import { HARD_EXCLUDED_NAMES, IgnoreStack, ruleLabel } from './ignore-rules.js'
import { detectLanguage, needsShebangProbe, UNKNOWN_LANGUAGE, type LanguageInfo } from './languages.js'
import { O_NOFOLLOW, readConfigText, readRegularFileSafely, type FileIdentity } from './safe-fs.js'
import { isSensitiveFileName } from './sensitive.js'
import { constants as fsConstants } from 'node:fs'

const GRAPH_LANGUAGES = new Set<string>(LANGUAGES)

/** Languages an adapter exists for. Everything else is recorded as `skipped: unsupported-language`. */
export const ANALYSED_LANGUAGES: readonly string[] = ['typescript', 'javascript']

export interface WalkOptions {
  limits?: Partial<ResolvedLimits>
  /** Honour `.gitignore` files (default true). Parsed in-process; global git config is never read. */
  respectGitignore?: boolean
  /** Honour the tool ignore file (brand IGNORE_FILE; default true). */
  respectToolIgnore?: boolean
  /** Apply the built-in default ignore list (default true). */
  useDefaultIgnores?: boolean
  /** Extra gitignore-syntax patterns at the lowest priority (repo-independent, user supplied). */
  extraIgnorePatterns?: readonly string[]
  /** `--include` globs: override default/.gitignore/ignore-file rules, never hard excludes. */
  include?: readonly string[]
  /** Absolute paths (output file/dir, cache dir) that are hard-excluded when inside the root. */
  hardExcludePaths?: readonly string[]
  /** Called for diagnostics; never carries file contents. */
  onWarning?: (message: string) => void
}

/** A file entry that becomes a file node. */
export interface WalkFile {
  /** Graph path: NFC, POSIX, repo-relative. */
  path: string
  /** Absolute path on disk (the real, un-normalised name). Never written to graph.json. */
  absPath: string
  size: number
  dev: number
  ino: number
  /** Detector result, including languages the graph stores as null (json, markdown, unknown). */
  detected: LanguageInfo
  /** Graph language: `typescript` | `javascript` | `python`, or null. */
  language: string | null
  /** `analyse` files are read and parsed; `skipped` files only get a node. */
  disposition: 'analyse' | 'skipped'
  skipReason?: SkipReason
}

export interface WalkResult {
  rootAbs: string
  files: WalkFile[]
  /** Skipped entries that cannot have a node (unrepresentable name, collision, too-deep directory...). */
  unnodedSkips: { reason: SkipReason; language: string | null }[]
  /** Ignored entries per rule label. A directory counts as one entry. */
  ignored: Map<string, number>
  /** Repo-relative paths of ignored entries (a directory stands for its children). Not written to graph.json. */
  ignoredPaths: string[]
  /** Every directory entry examined: files + ignored + skipped (descended directories are not counted). */
  discovered: number
}

export class MaxFilesExceeded extends Error {
  readonly code = 'MAX_FILES_EXCEEDED'
  constructor(readonly limit: number) {
    super(`More than ${limit} files found; refusing to produce a partial graph. Raise --max-files (hard ceiling applies) or narrow the root.`)
    this.name = 'MaxFilesExceeded'
  }
}

export class ScanRootError extends Error {
  readonly code = 'SCAN_ROOT_INVALID'
}

const isInside = (root: string, candidate: string): boolean => candidate === root || candidate.startsWith(root.endsWith(sep) ? root : root + sep)

async function probeFirstLine(absPath: string): Promise<string | undefined> {
  let handle
  try {
    handle = await open(absPath, fsConstants.O_RDONLY | O_NOFOLLOW | (fsConstants.O_NONBLOCK ?? 0))
    const stats = await handle.stat()
    if (!stats.isFile()) return undefined
    const buffer = Buffer.alloc(160)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    const text = buffer.subarray(0, bytesRead).toString('latin1')
    const newline = text.indexOf('\n')
    return (newline === -1 ? text : text.slice(0, newline)).replace(/\r$/, '')
  } catch {
    return undefined
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

/** Could an include glob match something inside `dir`? Conservative: wildcard segments count as a match. */
function includeMayReach(patterns: readonly string[], dir: string): boolean {
  const dirSegments = dir.split('/')
  return patterns.some(raw => {
    const pattern = raw.replace(/^!/, '').replace(/^\//, '')
    if (!pattern.includes('/') || pattern.startsWith('**')) return true
    const segments = pattern.split('/')
    for (let i = 0; i < Math.min(dirSegments.length, segments.length); i += 1) {
      const segment = segments[i] as string
      if (segment === '**') return true
      if (/[*?[]/.test(segment)) continue
      if (segment !== dirSegments[i]) return false
    }
    return true
  })
}

/**
 * Deterministic, iterative repository walk. It never follows symlinks, never leaves the root,
 * never opens special files, never reads sensitive files, and accounts for every entry it
 * sees: `discovered = files.length + unnodedSkips.length + sum(ignored)`.
 */
export async function walkRepository(root: string, options: WalkOptions = {}): Promise<WalkResult> {
  const limits = resolveLimits(options.limits ?? {})
  const respectGitignore = options.respectGitignore ?? true
  const respectToolIgnore = options.respectToolIgnore ?? true
  const include: Ignore | undefined = options.include && options.include.length > 0 ? ignore().add([...options.include]) : undefined

  let rootAbs: string
  try {
    rootAbs = await realpath(root)
    if (!(await lstat(rootAbs)).isDirectory()) throw new ScanRootError(`Scan root is not a directory: ${root}`)
  } catch (error) {
    if (error instanceof ScanRootError) throw error
    throw new ScanRootError(`Cannot read scan root "${root}": ${(error as NodeJS.ErrnoException).code ?? 'error'}`)
  }

  const hardPaths = new Map<string, string>()
  for (const absolute of options.hardExcludePaths ?? []) {
    const abs = resolve(absolute)
    if (abs !== rootAbs && isInside(rootAbs, abs)) hardPaths.set(abs, relative(rootAbs, abs).split(sep).join('/'))
  }

  const files: WalkFile[] = []
  const unnodedSkips: WalkResult['unnodedSkips'] = []
  const ignored = new Map<string, number>()
  const ignoredPaths: string[] = []
  const usedIds = new Set<string>()
  let discovered = 0

  const countIgnored = (label: string, relPath: string): void => {
    ignored.set(label, (ignored.get(label) ?? 0) + 1)
    ignoredPaths.push(relPath)
  }

  interface Pending {
    fsRel: string
    idRel: string
    depth: number
    stack: IgnoreStack
    /** Set when the directory was only entered because an `--include` glob may reach inside it. */
    viaInclude: boolean
  }
  const queue: Pending[] = [
    { fsRel: '', idRel: '', depth: 0, viaInclude: false, stack: IgnoreStack.create(options.extraIgnorePatterns ?? [], options.useDefaultIgnores ?? true) }
  ]

  while (queue.length > 0) {
    const current = queue.pop() as Pending
    const isRoot = current.fsRel === ''
    const dirAbs = isRoot ? rootAbs : join(rootAbs, ...current.fsRel.split('/'))

    // The directory must still be a real directory inside the root (not swapped for a symlink after readdir).
    if (!isRoot) {
      const real = await realpath(dirAbs).catch(() => undefined)
      if (real === undefined || !isInside(rootAbs, real) || real !== dirAbs) {
        unnodedSkips.push({ reason: real !== undefined && !isInside(rootAbs, real) ? 'symlink-outside-root' : 'symlink', language: null })
        continue
      }
    }

    let scoped = current.stack
    if (respectGitignore) {
      const text = await readConfigText(join(dirAbs, '.gitignore'), limits.maxConfigFileBytes)
      if (text !== undefined) scoped = scoped.with(current.idRel, '.gitignore', text)
    }
    if (respectToolIgnore) {
      const text = await readConfigText(join(dirAbs, IGNORE_FILE), limits.maxConfigFileBytes)
      if (text !== undefined) scoped = scoped.with(current.idRel, IGNORE_FILE, text)
    }

    let names: string[]
    try {
      names = (await readdir(dirAbs)).sort(compareStrings)
    } catch (error) {
      if (isRoot) throw new ScanRootError(`Cannot read scan root "${root}": ${(error as NodeJS.ErrnoException).code ?? 'error'}`)
      unnodedSkips.push({ reason: 'not-regular-file', language: null })
      continue
    }
    // A directory that was successfully entered is a container, not an entry.
    if (!isRoot) discovered -= 1

    const childDirs: Pending[] = []
    for (const name of names) {
      discovered += 1
      if (discovered > limits.maxFiles) throw new MaxFilesExceeded(limits.maxFiles)

      const fsRel = isRoot ? name : `${current.fsRel}/${name}`
      const abs = join(dirAbs, name)
      const idRel = `${current.idRel === '' ? '' : `${current.idRel}/`}${name.normalize('NFC')}`

      // 1. Hard excludes by name or absolute path. Never overridable by config, ignore files or --include.
      if (HARD_EXCLUDED_NAMES.includes(name)) {
        countIgnored(`hard:${name}`, idRel)
        continue
      }
      const hardLabel = hardPaths.get(abs)
      if (hardLabel !== undefined) {
        countIgnored(`hard:${hardLabel.slice(0, 190)}`, idRel)
        continue
      }

      let stats
      try {
        stats = await lstat(abs)
      } catch {
        unnodedSkips.push({ reason: 'not-regular-file', language: null })
        continue
      }
      const isDir = stats.isDirectory()

      // 2. Names that cannot be ids (before any open): control chars, backslash, invalid UTF-8 (U+FFFD), too long.
      const representable = !name.includes('\ufffd') && isRepresentablePath(idRel)
      if (!representable) {
        unnodedSkips.push({ reason: 'unrepresentable-path', language: null })
        continue
      }
      if (idRel.length > limits.maxPathLength) {
        unnodedSkips.push({ reason: 'path-too-long', language: null })
        continue
      }

      // 3. Ignore rules (defaults, .gitignore, tool ignore file). `--include` overrides them.
      const decision = scoped.test(idRel, isDir)
      let viaInclude = false
      if (decision.ignored) {
        if (include) {
          if (isDir ? includeMayReach(options.include ?? [], idRel) : include.ignores(idRel)) viaInclude = true
        }
        if (!viaInclude) {
          countIgnored(ruleLabel(decision), idRel)
          continue
        }
      }

      // 4. Symlinks: never opened, never followed. The target text decides the reason.
      if (stats.isSymbolicLink()) {
        let reason: SkipReason = 'symlink'
        try {
          const target = await readlink(abs)
          const resolved = isAbsolute(target) ? resolve(target) : resolve(dirAbs, target)
          if (!isInside(rootAbs, resolved)) reason = 'symlink-outside-root'
        } catch {
          // keep `symlink`
        }
        files.push(...claim(idRel, abs, stats, UNKNOWN_LANGUAGE, null, 'skipped', reason))
        continue
      }

      if (isDir) {
        if (current.depth + 1 > limits.maxDepth) {
          unnodedSkips.push({ reason: 'max-depth', language: null })
          continue
        }
        childDirs.push({ fsRel, idRel, depth: current.depth + 1, stack: scoped, viaInclude: viaInclude || current.viaInclude })
        continue
      }

      // 5. Files.
      if (!stats.isFile()) {
        files.push(...claim(idRel, abs, stats, UNKNOWN_LANGUAGE, null, 'skipped', 'not-regular-file'))
        continue
      }
      if (isSensitiveFileName(name)) {
        files.push(...claim(idRel, abs, stats, UNKNOWN_LANGUAGE, null, 'skipped', 'sensitive-file'))
        continue
      }
      const probe = needsShebangProbe(idRel) && stats.size <= limits.maxFileSizeBytes ? await probeFirstLine(abs) : undefined
      const detected = detectLanguage(idRel, probe)
      const language = GRAPH_LANGUAGES.has(detected.id) ? detected.id : null
      if (language === null || !ANALYSED_LANGUAGES.includes(language)) {
        files.push(...claim(idRel, abs, stats, detected, language, 'skipped', 'unsupported-language'))
        continue
      }
      if (stats.size > limits.maxFileSizeBytes) {
        files.push(...claim(idRel, abs, stats, detected, language, 'skipped', 'too-large'))
        continue
      }
      files.push(...claim(idRel, abs, stats, detected, language, 'analyse'))
    }
    // Depth-first in sorted order: push in reverse so the first directory is processed first.
    for (let i = childDirs.length - 1; i >= 0; i -= 1) queue.push(childDirs[i] as Pending)
  }

  files.sort((left, right) => compareStrings(left.path, right.path))
  ignoredPaths.sort(compareStrings)
  return { rootAbs, files, unnodedSkips, ignored, ignoredPaths, discovered }

  /** Reserves the graph id; a second entry that normalises to the same path is skipped as `id-collision`. */
  function claim(
    idRel: string,
    absPath: string,
    stats: { size: number; dev: number; ino: number },
    detected: LanguageInfo,
    language: string | null,
    disposition: 'analyse' | 'skipped',
    skipReason?: SkipReason
  ): WalkFile[] {
    if (usedIds.has(idRel)) {
      unnodedSkips.push({ reason: 'id-collision', language })
      return []
    }
    usedIds.add(idRel)
    return [{ path: idRel, absPath, size: stats.size, dev: stats.dev, ino: stats.ino, detected, language, disposition, ...(skipReason ? { skipReason } : {}) }]
  }
}

export interface WalkedRead {
  ok: true
  content: Buffer
  /** True when the bytes contain a NUL. Callers skip these as `binary` and do not decode or parse them. */
  binary: boolean
}

/**
 * Reads a walked file without following a symlink, enforcing the identity captured by the walk
 * and the size cap. A missing file is `vanished`; a file that grew past the cap is `too-large`.
 */
export async function readWalkedFile(
  file: { absPath: string; dev?: number; ino?: number },
  maxBytes: number = LIMITS.maxFileSizeBytes.default
): Promise<WalkedRead | { ok: false; reason: SkipReason | FailReason }> {
  const expected: FileIdentity | undefined = file.dev !== undefined && file.ino !== undefined ? { dev: file.dev, ino: file.ino } : undefined
  const result = await readRegularFileSafely(file.absPath, expected, maxBytes)
  if (!result.ok) return { ok: false, reason: result.reason }
  return { ok: true, content: result.content, binary: result.content.includes(0) }
}


