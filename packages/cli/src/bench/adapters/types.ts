export interface ModelCompletion {
  text: string
}

export interface ModelAdapter {
  readonly name: string
  complete(prompt: string): Promise<ModelCompletion>
}

/** HTTP fetch injected for adapters that call remote APIs (tests pass a stub). */
export type BenchFetch = typeof globalThis.fetch
