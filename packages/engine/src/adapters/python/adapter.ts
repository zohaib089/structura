import { LIMITS } from '../../limits.js'
import { type AdapterFileInput, type AdapterParseOutcome, type LanguageAdapter } from '../adapter.js'
import { grammarFor, parseSource } from '../parse-source.js'
import { ParsePool, type PoolLimits } from '../pool.js'
import { TreeSitterRuntime, type RuntimeOverrides as WasmOverrides } from '../tree-sitter-runtime.js'

export const PYTHON_ADAPTER_ID = 'python'
/** Bump when the same source text can produce a different extraction. */
export const PYTHON_ADAPTER_VERSION = '1'

export interface PythonAdapterOptions {
  runtime?: WasmOverrides
  pool?: ParsePool
  poolLimits?: PoolLimits
}

let sharedPool: ParsePool | undefined

function shared(limits?: PoolLimits): ParsePool {
  sharedPool ??= new ParsePool(1, limits ?? { workerMaxFiles: LIMITS.workerMaxFiles.default, workerMaxMemoryBytes: LIMITS.workerMaxMemoryBytes.default })
  return sharedPool
}

export async function shutdownPythonParsePool(): Promise<void> {
  const pool = sharedPool
  sharedPool = undefined
  await pool?.shutdown()
}

export function createPythonAdapter(options: PythonAdapterOptions = {}): LanguageAdapter {
  const inProcess = options.runtime !== undefined
  const runtime = inProcess ? new TreeSitterRuntime(PYTHON_ADAPTER_ID, options.runtime) : undefined
  const pool = inProcess ? undefined : (options.pool ?? shared(options.poolLimits))

  return {
    id: PYTHON_ADAPTER_ID,
    version: PYTHON_ADAPTER_VERSION,
    languageIds: ['python'],
    async load(): Promise<void> {
      const probe: AdapterFileInput = {
        path: 'probe.py',
        content: 'import os\n',
        language: 'python',
        limits: { maxIdentifierLength: 64, maxSymbolsPerFile: 10, maxEdgesPerFile: 10 },
        timeoutMs: LIMITS.parseTimeoutMs.default
      }
      const outcome = await this.parse(probe)
      if (!outcome.ok && outcome.reason === 'parser-error') {
        throw new Error(outcome.message ?? 'python grammar failed to load')
      }
    },
    parse(input: AdapterFileInput): Promise<AdapterParseOutcome> {
      const timeoutMs = input.timeoutMs ?? LIMITS.parseTimeoutMs.default
      const memoryLimitBytes = input.memoryLimitBytes ?? LIMITS.workerMaxMemoryBytes.default
      const grammar = grammarFor(input.path, input.language)
      if (runtime) return parseSource(runtime, grammar, input.content, input.limits, timeoutMs, memoryLimitBytes)
      return pool!.parse({ grammar, content: input.content, limits: input.limits, timeoutMs, memoryLimitBytes })
    }
  }
}
