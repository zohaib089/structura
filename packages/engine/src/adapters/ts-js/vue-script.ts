import type { Span } from '../../graph/types.js'
import type { AdapterParseResult } from '../adapter.js'

export interface VueScriptBlock {
  language: 'typescript' | 'javascript'
  content: string
  /** 1-based line of content[0] in the original source. */
  startLine: number
  /** 1-based UTF-16 column of content[0] in the original source. */
  startCol: number
}

/** True when a <script> type is JSON, importmap, or another non-JS payload. */
function isNonCodeScript(attrs: string): boolean {
  const type = /type\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]?.trim() ?? ''
  if (!type) return false
  if (/^(?:module|text\/javascript|application\/javascript|text\/ecmascript|application\/ecmascript|text\/typescript|application\/typescript)$/i.test(type)) {
    return false
  }
  return /json|importmap|ld\+json/i.test(type)
}

function scriptLanguage(attrs: string): 'typescript' | 'javascript' | null {
  if (isNonCodeScript(attrs)) return null
  const lang = /lang\s*=\s*["']?([A-Za-z0-9+-]+)/i.exec(attrs)?.[1] ?? ''
  if (/^(?:tsx?|typescript)$/i.test(lang)) return 'typescript'
  return 'javascript'
}

function offsetToLineCol(source: string, index: number): { line: number; col: number } {
  let line = 1
  let col = 1
  for (let i = 0; i < index; i += 1) {
    if (source[i] === '\n') {
      line += 1
      col = 1
    } else {
      col += 1
    }
  }
  return { line, col }
}

/**
 * Collect <script> / <script setup> bodies from a Vue SFC. JSON and importmap
 * blocks are skipped. This does not parse the template or style.
 */
export function extractVueScripts(source: string): VueScriptBlock[] {
  const blocks: VueScriptBlock[] = []
  const open = /<script\b([^>]*)>/gi
  let match: RegExpExecArray | null
  while ((match = open.exec(source)) !== null) {
    const language = scriptLanguage(match[1] ?? '')
    const contentStart = match.index + match[0].length
    const closeAt = source.toLowerCase().indexOf('</script>', contentStart)
    if (closeAt < 0) break
    open.lastIndex = closeAt + '</script>'.length
    if (!language) continue
    const content = source.slice(contentStart, closeAt)
    const at = offsetToLineCol(source, contentStart)
    blocks.push({ language, content, startLine: at.line, startCol: at.col })
  }
  return blocks
}

/** Map a span inside a script block onto the enclosing .vue file. */
export function shiftSpan(span: Span, startLine: number, startCol: number): Span {
  const shift = (pos: { line: number; col: number }) =>
    pos.line === 1
      ? { line: startLine, col: startCol + pos.col - 1 }
      : { line: startLine + pos.line - 1, col: pos.col }
  return { start: shift(span.start), end: shift(span.end) }
}

export function shiftParseResult(result: AdapterParseResult, startLine: number, startCol: number): AdapterParseResult {
  return {
    ...result,
    references: result.references.map((item) => ({ ...item, span: shiftSpan(item.span, startLine, startCol) })),
    symbols: result.symbols.map((item) => ({ ...item, span: shiftSpan(item.span, startLine, startCol) })),
    syntaxErrors: result.syntaxErrors.map((item) => ({ ...item, span: shiftSpan(item.span, startLine, startCol) }))
  }
}

export function emptyParseResult(): AdapterParseResult {
  return {
    references: [],
    symbols: [],
    syntaxErrorCount: 0,
    syntaxErrors: [],
    omitted: { longNames: 0, symbols: 0, edges: 0 },
    redactions: 0
  }
}

export function mergeParseResults(into: AdapterParseResult, next: AdapterParseResult): AdapterParseResult {
  return {
    references: [...into.references, ...next.references],
    symbols: [...into.symbols, ...next.symbols],
    syntaxErrorCount: into.syntaxErrorCount + next.syntaxErrorCount,
    syntaxErrors: [...into.syntaxErrors, ...next.syntaxErrors],
    omitted: {
      longNames: into.omitted.longNames + next.omitted.longNames,
      symbols: into.omitted.symbols + next.omitted.symbols,
      edges: into.omitted.edges + next.omitted.edges
    },
    redactions: into.redactions + next.redactions
  }
}

export function isVueSource(path: string, language: string): boolean {
  return language === 'vue' || path.toLowerCase().endsWith('.vue')
}
