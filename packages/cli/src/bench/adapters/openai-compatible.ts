import type { BenchFetch, ModelAdapter, ModelCompletion } from './types.js'

export interface OpenAiCompatibleAdapterOptions {
  baseUrl?: string
  model?: string
  apiKeyEnvVar?: string
  fetchImpl?: BenchFetch
}

function readApiKey(envVar: string): string {
  const value = process.env[envVar]?.trim()
  if (!value) {
    throw new Error(`missing API key: set ${envVar} (value is never logged)`)
  }
  return value
}

/** OpenAI-compatible chat/completions client (BYO key from environment). */
export class OpenAiCompatibleModelAdapter implements ModelAdapter {
  readonly name = 'openai-compatible'
  private readonly baseUrl: string
  private readonly model: string
  private readonly apiKeyEnvVar: string
  private readonly fetchImpl: BenchFetch

  constructor(options: OpenAiCompatibleAdapterOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '')
    this.model = options.model ?? 'gpt-4o-mini'
    this.apiKeyEnvVar = options.apiKeyEnvVar ?? 'ATLASMITH_BENCH_API_KEY'
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
  }

  async complete(prompt: string): Promise<ModelCompletion> {
    const apiKey = readApiKey(this.apiKeyEnvVar)
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`OpenAI-compatible request failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ''}`)
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const text = payload.choices?.[0]?.message?.content
    if (typeof text !== 'string') {
      throw new Error('OpenAI-compatible response missing message content')
    }
    return { text }
  }
}

/** Resolve API key env var: ATLASMITH_BENCH_API_KEY, then OPENAI_API_KEY. */
export function defaultOpenAiKeyEnvVar(): string {
  if (process.env.ATLASMITH_BENCH_API_KEY?.trim()) return 'ATLASMITH_BENCH_API_KEY'
  return 'OPENAI_API_KEY'
}
