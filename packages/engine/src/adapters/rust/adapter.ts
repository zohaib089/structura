import type { AdapterFileInput, AdapterParseOutcome, LanguageAdapter } from '../adapter.js'
import { extractRust } from './extract.js'

export const RUST_ADAPTER_ID = 'rust'
export const RUST_ADAPTER_VERSION = '1.0.0'

export function createRustAdapter(): LanguageAdapter {
  return {
    id: RUST_ADAPTER_ID,
    version: RUST_ADAPTER_VERSION,
    languageIds: ['rust'],
    async load(): Promise<void> {
      // Import extraction is a text scan; there is no grammar to load.
    },
    parse(input: AdapterFileInput): Promise<AdapterParseOutcome> {
      try {
        return Promise.resolve({ ok: true, result: extractRust(input.content, input.limits) })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'rust parse failed'
        return Promise.resolve({ ok: false, reason: 'parser-error', message })
      }
    }
  }
}
