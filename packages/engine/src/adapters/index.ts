export {
  AdapterLoadError,
  type AdapterFileInput,
  type AdapterParseOutcome,
  type AdapterParseResult,
  type ExtractLimits,
  type ExtractedReference,
  type ExtractedSymbol,
  type LanguageAdapter,
  type ModuleResolver,
  type ResolveOutcome,
  type SyntaxIssue
} from './adapter.js'
export { grammarFor, parseSource } from './parse-source.js'
export { ParsePool } from './pool.js'
export {
  GRAMMAR_IDS,
  TreeSitterRuntime,
  grammarFingerprint,
  loadManifest,
  type GrammarId,
  type RuntimeOverrides
} from './tree-sitter-runtime.js'
export {
  TS_JS_ADAPTER_ID,
  TS_JS_ADAPTER_VERSION,
  createTypeScriptJavaScriptAdapter,
  shutdownParsePool
} from './ts-js/adapter.js'
export { TsJsResolver, type ConfigIssue, type ResolverContext } from './ts-js/resolver.js'
export { parseJsonc } from './ts-js/jsonc.js'
