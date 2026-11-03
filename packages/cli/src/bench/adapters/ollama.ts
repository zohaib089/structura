import type { BenchFetch, ModelAdapter, ModelCompletion } from './types.js'

export interface OllamaAdapterOptions {
  baseUrl?: string
  model?: string
  fetchImpl?: BenchFetch
}

/** Minimal local Ollama client (POST /api/generate). */
export class OllamaModelAdapter implements ModelAdapter {
  readonly name = 'ollama'
  private readonly baseUrl: string
  private readonly model: string
  private readonly fetchImpl: BenchFetch

  constructor(options: OllamaAdapterOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:11434').replace(/\/+$/, '')
    this.model = options.model ?? 'llama3.2'
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
  }

  async complete(prompt: string): Promise<ModelCompletion> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, stream: false })
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Ollama request failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ''}`)
    }
    const payload = (await response.json()) as { response?: string }
    if (typeof payload.response !== 'string') {
      throw new Error('Ollama response missing "response" text')
    }
    return { text: payload.response }
  }
}
