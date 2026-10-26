import { LIMITS } from '../../limits.js'
import { type AdapterFileInput, type AdapterParseOutcome, type LanguageAdapter } from '../adapter.js'
import { grammarFor, parseSource } from '../parse-source.js'
import { ParsePool, type PoolLimits } from '../pool.js'
import { TreeSitterRuntime, type RuntimeOverrides as WasmOverrides } from '../tree-sitter-runtime.js'

export const TS_JS_ADAPTER_ID = 'typescript-javascript'
/** Bump when the same source text can produce a different extraction. */
export const TS_JS_ADAPTER_VERSION = '1'

export interface TypeScriptJavaScriptAdapterOptions {
  /** Test hook: load WASM in-process with overridden paths. Production scans leave this unset and use workers. */
  runtime?: WasmOverrides
  /** Pool to use. A scan owns one pool and shuts it down; unit tests share a process-wide pool. */
  pool?: ParsePool
  /** Recycle bounds used when this adapter creates the shared pool. */
  poolLimits?: PoolLimits
}

let sharedPool: ParsePool | undefined

function shared(limits?: PoolLimits): ParsePool {
  sharedPool ??= new ParsePool(1, limits ?? { workerMaxFiles: LIMITS.workerMaxFiles.default, workerMaxMemoryBytes: LIMITS.workerMaxMemoryBytes.default })
  return sharedPool
}

/** Stops the process-wide pool. Scan-owned pools are shut down by the scan. */
export async function shutdownParsePool(): Promise<void> {
  const pool = sharedPool
  sharedPool = undefined
  await pool?.shutdown()
}

/**
 * TypeScript/JavaScript adapter. Parsing runs in `worker_threads` so a wedged grammar can be
 * `terminate()`d. Overrides (broken-WASM tests) stay in-process: a function cannot be sent to a worker.
 */
export function createTypeScriptJavaScriptAdapter(options: TypeScriptJavaScriptAdapterOptions = {}): LanguageAdapter {
  const inProcess = options.runtime !== undefined
  const runtime = inProcess ? new TreeSitterRuntime(TS_JS_ADAPTER_ID, options.runtime) : undefined
  const pool = inProcess ? undefined : (options.pool ?? shared(options.poolLimits))

  return {
    id: TS_JS_ADAPTER_ID,
    version: TS_JS_ADAPTER_VERSION,
    languageIds: ['typescript', 'javascript'],
    async load(): Promise<void> {
      const probe: AdapterFileInput = {
        path: 'probe.ts',
        content: 'export {}\n',
        language: 'typescript',
        limits: { maxIdentifierLength: 64, maxSymbolsPerFile: 10, maxEdgesPerFile: 10 },
        timeoutMs: LIMITS.parseTimeoutMs.default
      }
      const outcome = await this.parse(probe)
      if (!outcome.ok && outcome.reason === 'parser-error') {
        throw new Error(outcome.message ?? 'typescript grammar failed to load')
      }
    },
    parse(input: AdapterFileInput): Promise<AdapterParseOutcome> {
      const timeoutMs = input.timeoutMs ?? LIMITS.parseTimeoutMs.default
      const grammar = grammarFor(input.path, input.language)
      if (runtime) return parseSource(runtime, grammar, input.content, input.limits, timeoutMs)
      return pool!.parse({ grammar, content: input.content, limits: input.limits, timeoutMs })
    }
  }
}
