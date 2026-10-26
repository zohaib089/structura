import { parentPort } from 'node:worker_threads'
import { AdapterLoadError, type AdapterParseOutcome, type ExtractLimits } from './adapter.js'
import { parseSource } from './parse-source.js'
import { TreeSitterRuntime, type GrammarId } from './tree-sitter-runtime.js'

interface ParseMessage {
  id: number
  grammar: GrammarId
  content: string
  limits: ExtractLimits
  timeoutMs: number
}

interface WorkerReply {
  id: number
  outcome: AdapterParseOutcome
  memory: number
  files: number
  fatal?: boolean
  code?: string
  adapterId?: string
}

/**
 * Parser isolate. WASM memory lives outside the V8 heap of the parent, so the parent recycles this
 * thread after a file or memory budget. Cancellation is the tree-sitter progress callback; the parent
 * calls `worker.terminate()` if this thread does not answer.
 */
const runtime = new TreeSitterRuntime('parse-worker')
let files = 0

parentPort?.on('message', (message: ParseMessage) => {
  void (async () => {
    const reply = (partial: Omit<WorkerReply, 'id' | 'memory' | 'files'>): void => {
      parentPort?.postMessage({ id: message.id, memory: process.memoryUsage().rss, files, ...partial } satisfies WorkerReply)
    }
    try {
      const outcome = await parseSource(runtime, message.grammar, message.content, message.limits, message.timeoutMs)
      files += 1
      reply({ outcome })
    } catch (error) {
      const fatal = error instanceof AdapterLoadError
      reply({
        outcome: { ok: false, reason: 'parser-error', message: error instanceof Error ? error.message : String(error) },
        ...(fatal ? { fatal: true, code: error.code, adapterId: error.adapterId } : {})
      })
    }
  })()
})
