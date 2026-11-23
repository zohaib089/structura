import type { AdapterFileInput, AdapterParseOutcome, LanguageAdapter } from '../adapter.js'
import { extractJava } from './extract.js'

export const JAVA_ADAPTER_ID = 'java'
export const JAVA_ADAPTER_VERSION = '1.0.0'

export function createJavaAdapter(): LanguageAdapter {
  return {
    id: JAVA_ADAPTER_ID,
    version: JAVA_ADAPTER_VERSION,
    languageIds: ['java'],
    async load(): Promise<void> {
      // Import extraction is a text scan; there is no grammar to load.
    },
    parse(input: AdapterFileInput): Promise<AdapterParseOutcome> {
      try {
        return Promise.resolve({ ok: true, result: extractJava(input.content, input.limits) })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'java parse failed'
        return Promise.resolve({ ok: false, reason: 'parser-error', message })
      }
    }
  }
}
