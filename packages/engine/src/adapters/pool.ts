import { Worker } from 'node:worker_threads'
import { AdapterLoadError, type AdapterParseOutcome, type ExtractLimits } from './adapter.js'
import type { GrammarId } from './tree-sitter-runtime.js'

export interface PoolLimits {
  workerMaxFiles: number
  workerMaxMemoryBytes: number
}

interface ParseInput {
  grammar: GrammarId
  content: string
  limits: ExtractLimits
  timeoutMs: number
}

interface WorkerMessage {
  id: number
  outcome: AdapterParseOutcome
  memory?: number
  files?: number
  fatal?: boolean
  code?: string
  adapterId?: string
}

interface Pending {
  resolve: (value: AdapterParseOutcome) => void
  reject: (error: unknown) => void
  timer: NodeJS.Timeout
}

interface Slot {
  worker: Worker
  files: number
  inflight: Map<number, Pending>
  dead: boolean
}

const BACKSTOP_GRACE_MS = 2_000

function workerLaunch(): { url: URL; execArgv: string[] } {
  const source = import.meta.url.endsWith('.ts')
  return {
    url: new URL(source ? './parse-worker.ts' : './parse-worker.js', import.meta.url),
    execArgv: source ? ['--import', 'tsx'] : []
  }
}

/**
 * A fixed set of parser workers. Each worker parses one file at a time.
 * The progress callback inside the worker is the cancellation path; the timer here calls
 * `terminate()` if the worker does not answer (the WASM backstop).
 */
export class ParsePool {
  private readonly slots: Slot[] = []
  private readonly waiters: Array<(slot: Slot) => void> = []
  private seq = 1
  private closed = false

  constructor(
    private readonly size: number,
    private readonly recycle: PoolLimits
  ) {}

  async parse(input: ParseInput): Promise<AdapterParseOutcome> {
    if (this.closed) throw new Error('parse pool is shut down')
    const slot = await this.acquire()
    const id = this.seq++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!slot.inflight.has(id)) return
        slot.inflight.delete(id)
        resolve({ ok: false, reason: 'timeout' })
        void this.drop(slot)
      }, input.timeoutMs + BACKSTOP_GRACE_MS)
      slot.inflight.set(id, { resolve, reject, timer })
      slot.worker.postMessage({ id, ...input })
    })
  }

  async shutdown(): Promise<void> {
    this.closed = true
    const slots = this.slots.splice(0)
    await Promise.all(slots.map(async slot => {
      slot.dead = true
      for (const pending of slot.inflight.values()) clearTimeout(pending.timer)
      slot.inflight.clear()
      await slot.worker.terminate()
    }))
  }

  private async acquire(): Promise<Slot> {
    const idle = this.slots.find(slot => !slot.dead && slot.inflight.size === 0)
    if (idle) return idle
    if (this.slots.filter(slot => !slot.dead).length < Math.max(1, this.size)) return this.spawn()
    return new Promise(resolve => this.waiters.push(resolve))
  }

  private spawn(): Slot {
    const launched = workerLaunch()
    const worker = new Worker(launched.url, { execArgv: launched.execArgv })
    worker.unref()
    const slot: Slot = { worker, files: 0, inflight: new Map(), dead: false }
    worker.on('message', (message: WorkerMessage) => this.onMessage(slot, message))
    worker.on('error', (error: Error) => this.onCrash(slot, error))
    worker.on('exit', () => {
      slot.dead = true
    })
    this.slots.push(slot)
    return slot
  }

  private onMessage(slot: Slot, message: WorkerMessage): void {
    const pending = slot.inflight.get(message.id)
    if (!pending) return
    clearTimeout(pending.timer)
    slot.inflight.delete(message.id)
    slot.files = message.files ?? slot.files + 1
    if (message.fatal) {
      const detail = !message.outcome.ok && message.outcome.reason === 'parser-error' ? message.outcome.message : 'parser failed to load'
      pending.reject(new AdapterLoadError(message.adapterId ?? 'parse-worker', message.code ?? 'RUNTIME_INIT_FAILED', detail))
      void this.drop(slot)
      return
    }
    pending.resolve(message.outcome)
    const memory = message.memory ?? 0
    if (slot.files >= this.recycle.workerMaxFiles || memory >= this.recycle.workerMaxMemoryBytes) {
      void this.drop(slot)
      return
    }
    this.handoff(slot)
  }

  private onCrash(slot: Slot, error: Error): void {
    slot.dead = true
    for (const pending of slot.inflight.values()) {
      clearTimeout(pending.timer)
      if (error instanceof AdapterLoadError) pending.reject(error)
      else pending.resolve({ ok: false, reason: 'parser-error', message: error.message })
    }
    slot.inflight.clear()
    this.handoff(slot)
  }

  private handoff(slot: Slot): void {
    const next = this.waiters.shift()
    if (!next) return
    if (!slot.dead && !this.closed) next(slot)
    else if (!this.closed) next(this.spawn())
  }

  private async drop(slot: Slot): Promise<void> {
    if (slot.dead) return
    slot.dead = true
    await slot.worker.terminate().catch(() => undefined)
    const index = this.slots.indexOf(slot)
    if (index !== -1) this.slots.splice(index, 1)
    const next = this.waiters.shift()
    if (next && !this.closed) next(this.spawn())
  }
}
