import type { AdapterFileInput, AdapterParseOutcome, LanguageAdapter } from '../adapter.js'
import { extractGo } from './extract.js'

export const GO_ADAPTER_ID = 'go'
export const GO_ADAPTER_VERSION = '1.0.0'

export function createGoAdapter(): LanguageAdapter {
  return {
    id: GO_ADAPTER_ID,
    version: GO_ADAPTER_VERSION,
    languageIds: ['go'],
    async load(): Promise<void> {
      // Import extraction is a text scan; there is no grammar to load.
    },
    parse(input: AdapterFileInput): Promise<AdapterParseOutcome> {
      try {
        return Promise.resolve({ ok: true, result: extractGo(input.content, input.limits) })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'go parse failed'
        return Promise.resolve({ ok: false, reason: 'parser-error', message })
      }
    }
  }
}
