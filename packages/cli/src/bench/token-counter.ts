export interface TokenCounter {
  count(text: string): number
}

/**
 * Lightweight offline approximation (~4 characters per token for Latin text).
 * Replace with a model-specific tokenizer when accuracy matters.
 */
export class ApproxTokenCounter implements TokenCounter {
  count(text: string): number {
    if (text.length === 0) return 0
    return Math.max(1, Math.ceil(text.length / 4))
  }
}
