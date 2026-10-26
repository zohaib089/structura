import type { AdapterParseOutcome, ExtractLimits } from './adapter.js'
import type { GrammarId } from './tree-sitter-runtime.js'
import type { TreeSitterRuntime } from './tree-sitter-runtime.js'
import { extractModuleFacts } from './ts-js/extract.js'

/**
 * Parses one buffer with tree-sitter's progress callback as the cancellation signal.
 * A `true` return from the callback makes `parse` return null, which is a timeout rather than a failed file.
 * The caller (a worker, or an in-process test hook) is responsible for `worker.terminate()` if this never returns.
 */
export async function parseSource(
  runtime: TreeSitterRuntime,
  grammar: GrammarId,
  content: string,
  limits: ExtractLimits,
  timeoutMs: number
): Promise<AdapterParseOutcome> {
  const parser = await runtime.getParser(grammar)
  const started = Date.now()
  const tree = parser.parse(content, undefined, {
    progressCallback: () => Date.now() - started >= timeoutMs
  })
  if (!tree) return { ok: false, reason: 'timeout' }
  try {
    return { ok: true, result: extractModuleFacts(tree.rootNode, content, limits) }
  } catch (error) {
    return { ok: false, reason: 'parser-error', message: error instanceof Error ? error.message : String(error) }
  } finally {
    tree.delete()
  }
}

/** Grammar for a repo-relative path. JSX uses the TSX grammar; `.js` specifiers stay on the JavaScript grammar. */
export function grammarFor(path: string, language: string): GrammarId {
  const lower = path.toLowerCase()
  if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) return 'tsx'
  if (lower.endsWith('.py') || lower.endsWith('.pyi') || language === 'python') return 'python'
  if (language === 'javascript' || /\.(?:js|mjs|cjs)$/.test(lower)) return 'javascript'
  return 'typescript'
}
