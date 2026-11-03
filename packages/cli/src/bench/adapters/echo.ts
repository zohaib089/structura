import type { ModelAdapter, ModelCompletion } from './types.js'

/** Dry-run adapter: no network, deterministic stub completion. */
export class EchoModelAdapter implements ModelAdapter {
  readonly name = 'echo'

  async complete(prompt: string): Promise<ModelCompletion> {
    const tail = prompt.length > 120 ? `${prompt.slice(-117)}...` : prompt
    return { text: `[echo] received ${prompt.length} chars; tail: ${tail}` }
  }
}
