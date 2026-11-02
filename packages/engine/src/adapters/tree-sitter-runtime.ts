import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Language, Parser } from 'web-tree-sitter'
import { AdapterLoadError } from './adapter.js'

export const GRAMMAR_IDS = ['typescript', 'tsx', 'javascript', 'python'] as const
export type GrammarId = typeof GRAMMAR_IDS[number]

/**
 * Pinned grammar source: `@vscode/tree-sitter-wasm` (Microsoft, MIT) ships pre-built,
 * dependency-free WASM grammars compatible with `web-tree-sitter` 0.27. `tree-sitter-wasms@0.1.x`
 * was evaluated and rejected: its binaries use a dylink section web-tree-sitter 0.27 cannot load.
 *
 * Integrity (threat C-12): each `.wasm` is read ONCE into a buffer, the SHA-256 of THAT buffer is
 * compared with `grammars.manifest.json` (which ships inside this package), and the same buffer
 * is instantiated. There is no hash-then-reopen window. Mismatch or a missing file is fatal.
 * Files are only ever resolved from this package's own dependencies, never from the scanned repo.
 */
const GRAMMAR_SPECIFIERS: Readonly<Record<GrammarId, string>> = {
  typescript: '@vscode/tree-sitter-wasm/wasm/tree-sitter-typescript.wasm',
  tsx: '@vscode/tree-sitter-wasm/wasm/tree-sitter-tsx.wasm',
  javascript: '@vscode/tree-sitter-wasm/wasm/tree-sitter-javascript.wasm',
  python: '@vscode/tree-sitter-wasm/wasm/tree-sitter-python.wasm'
}
const CORE_WASM_SPECIFIER = 'web-tree-sitter/web-tree-sitter.wasm'

const nodeRequire = createRequire(import.meta.url)

export interface GrammarManifest {
  manifestVersion: number
  runtime: { sha256: string; version: string }
  grammars: Record<string, { sha256: string; version: string }>
}

export interface RuntimeOverrides {
  /** Test hook: map a grammar id to an absolute `.wasm` path. */
  resolveGrammar?: (grammar: GrammarId) => string
  /** Test hook: absolute path of the core `web-tree-sitter.wasm`. */
  resolveCoreWasm?: () => string
  /** Test hook: manifest to verify against (default: the packaged grammars.manifest.json). */
  manifest?: GrammarManifest
}

/** Path of the packaged manifest: `<package root>/grammars.manifest.json` (same location from src/ and dist/). */
export const MANIFEST_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../grammars.manifest.json')

let packagedManifest: GrammarManifest | undefined
export function loadManifest(adapterId = 'engine'): GrammarManifest {
  if (!packagedManifest) {
    try {
      const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as GrammarManifest
      if (parsed.manifestVersion !== 1 || typeof parsed.runtime?.sha256 !== 'string') throw new Error('unexpected manifest shape')
      packagedManifest = parsed
    } catch (error) {
      throw new AdapterLoadError(adapterId, 'MANIFEST_UNAVAILABLE', `Cannot read grammars.manifest.json (${(error as Error).message}). The installation is incomplete or tampered with.`, { cause: error })
    }
  }
  return packagedManifest
}

export const sha256Hex = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex')

/** Stable fingerprint of the grammar set, part of every cache key. */
export function grammarFingerprint(manifest: GrammarManifest = loadManifest()): string {
  return sha256Hex(Buffer.from(JSON.stringify([manifest.runtime.sha256, ...Object.entries(manifest.grammars).sort().map(([name, entry]) => [name, entry.sha256])])))
}

function readVerified(adapterId: string, path: string, expected: string | undefined, what: string): Uint8Array {
  let buffer: Buffer
  try {
    buffer = readFileSync(path)
  } catch (error) {
    throw new AdapterLoadError(adapterId, 'WASM_NOT_FOUND', `Cannot read the ${what} (${path}). Reinstall dependencies (npm install).`, { cause: error })
  }
  const actual = sha256Hex(buffer)
  if (expected === undefined || actual !== expected) {
    throw new AdapterLoadError(adapterId, 'GRAMMAR_INTEGRITY', `The ${what} does not match grammars.manifest.json (expected ${expected ?? 'an entry'}, got ${actual}). Refusing to load it; reinstall dependencies.`)
  }
  return new Uint8Array(buffer)
}

let initPromise: Promise<void> | undefined

function initRuntime(adapterId: string, overrides: RuntimeOverrides): Promise<void> {
  initPromise ??= (async () => {
    const manifest = overrides.manifest ?? loadManifest(adapterId)
    let corePath: string
    try {
      corePath = overrides.resolveCoreWasm ? overrides.resolveCoreWasm() : nodeRequire.resolve(CORE_WASM_SPECIFIER)
    } catch (error) {
      throw new AdapterLoadError(adapterId, 'WASM_NOT_FOUND', `Cannot locate the tree-sitter core WASM (${CORE_WASM_SPECIFIER}). Reinstall dependencies (npm install).`, { cause: error })
    }
    const wasmBinary = readVerified(adapterId, corePath, manifest.runtime.sha256, 'tree-sitter core WASM')
    try {
      await Parser.init({ wasmBinary })
    } catch (error) {
      throw new AdapterLoadError(adapterId, 'RUNTIME_INIT_FAILED', `Failed to initialise the tree-sitter WASM runtime: ${(error as Error).message}`, { cause: error })
    }
  })().catch(error => {
    initPromise = undefined // allow a retry; the failure is still reported to this caller
    throw error
  })
  return initPromise
}

/**
 * Lazily loads web-tree-sitter and grammar WASM files, one parser per grammar.
 * Failures are explicit `AdapterLoadError`s; the scan aborts instead of reporting "0 files parsed".
 */
export class TreeSitterRuntime {
  private readonly parsers = new Map<GrammarId, Promise<Parser>>()

  constructor(private readonly adapterId: string, private readonly overrides: RuntimeOverrides = {}) {}

  getParser(grammar: GrammarId): Promise<Parser> {
    let pending = this.parsers.get(grammar)
    if (!pending) {
      pending = this.createParser(grammar)
      this.parsers.set(grammar, pending)
      pending.catch(() => this.parsers.delete(grammar))
    }
    return pending
  }

  /** Drops every parser (used after a trap so the next file gets a fresh instance). */
  reset(): void {
    for (const pending of this.parsers.values()) void pending.then(parser => parser.delete()).catch(() => undefined)
    this.parsers.clear()
  }

  private async createParser(grammar: GrammarId): Promise<Parser> {
    await initRuntime(this.adapterId, this.overrides)
    const manifest = this.overrides.manifest ?? loadManifest(this.adapterId)
    let wasmPath: string
    try {
      wasmPath = this.overrides.resolveGrammar ? this.overrides.resolveGrammar(grammar) : nodeRequire.resolve(GRAMMAR_SPECIFIERS[grammar])
    } catch (error) {
      throw new AdapterLoadError(this.adapterId, 'WASM_NOT_FOUND', `Cannot locate the ${grammar} grammar (${GRAMMAR_SPECIFIERS[grammar]}). Reinstall dependencies (npm install).`, { cause: error })
    }
    const bytes = readVerified(this.adapterId, wasmPath, manifest.grammars[grammar]?.sha256, `${grammar} grammar`)
    try {
      const language = await Language.load(bytes)
      const parser = new Parser()
      parser.setLanguage(language)
      return parser
    } catch (error) {
      throw new AdapterLoadError(this.adapterId, 'GRAMMAR_LOAD_FAILED', `Failed to load the ${grammar} grammar: ${(error as Error).message}`, { cause: error })
    }
  }
}
