const MAX_SUMMARY_CHARS = 300

function skipLeadingNoise(text: string): number {
  let i = 0
  if (text.charCodeAt(0) === 0xfeff) i = 1
  if (text.startsWith('#!', i)) {
    const lineEnd = text.indexOf('\n', i)
    if (lineEnd === -1) return text.length
    i = lineEnd + 1
  }
  return i
}

function skipHorizontalWhitespace(text: string, index: number): number {
  let i = index
  while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\r')) i += 1
  return i
}

function skipBlankLines(text: string, index: number): number {
  let i = index
  while (i < text.length) {
    i = skipHorizontalWhitespace(text, i)
    if (i >= text.length) return i
    if (text[i] === '\n') {
      i += 1
      continue
    }
    if (text[i] === '#') {
      const lineEnd = text.indexOf('\n', i)
      i = lineEnd === -1 ? text.length : lineEnd + 1
      continue
    }
    break
  }
  return i
}

export function collapseFileSummary(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= MAX_SUMMARY_CHARS) return collapsed
  return collapsed.slice(0, MAX_SUMMARY_CHARS)
}

function readBlockComment(text: string, start: number): string | null {
  if (!text.startsWith('/*', start)) return null
  const end = text.indexOf('*/', start + 2)
  if (end === -1) return null
  const body = text
    .slice(start + 2, end)
    .replace(/^\s*\*\s?/gm, '')
    .trim()
  return body.length > 0 ? body : null
}

function readLineCommentRun(text: string, start: number, marker: '//' | '#'): string | null {
  const lines: string[] = []
  let i = start
  while (i < text.length) {
    i = skipHorizontalWhitespace(text, i)
    if (i < text.length && text[i] === '\n') {
      i += 1
      continue
    }
    if (i >= text.length || !text.startsWith(marker, i)) break
    const lineEnd = text.indexOf('\n', i)
    const end = lineEnd === -1 ? text.length : lineEnd
    lines.push(text.slice(i + marker.length, end))
    i = end + (lineEnd === -1 ? 0 : 1)
  }
  return lines.length > 0 ? lines.join('\n').trim() : null
}

function readPythonStringLiteral(text: string, start: number): { value: string; end: number } | null {
  const quote = text[start]
  if (quote !== '"' && quote !== "'") return null
  let triple = false
  if (text.startsWith(quote.repeat(3), start)) triple = true
  const opener = triple ? quote.repeat(3) : quote
  let i = start + opener.length
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\' && !triple) {
      i += 2
      continue
    }
    if (text.startsWith(opener, i)) {
      const value = text.slice(start + opener.length, i)
      return { value, end: i + opener.length }
    }
    i += 1
  }
  return null
}

function extractPythonModuleDocstring(text: string, start: number): string | null {
  let i = skipBlankLines(text, start)
  if (i >= text.length) return null
  const literal = readPythonStringLiteral(text, i)
  if (!literal) return null
  return literal.value.trim() || null
}

/**
 * First header comment or docstring at the top of a source file, whitespace-collapsed and capped.
 * Does not read from graph.json; safe to expose via the hosted API without changing graph.v1.
 */
export function extractFileSummary(content: string, language: string | null): string | null {
  const start = skipLeadingNoise(content)
  let raw: string | null = null

  if (language === 'python') {
    raw = extractPythonModuleDocstring(content, start)
    if (!raw) raw = readLineCommentRun(content, start, '#')
  } else {
    let i = skipBlankLines(content, start)
    raw = readBlockComment(content, i)
    if (!raw) {
      raw = readLineCommentRun(content, start, '//')
    }
    if (!raw) {
      raw = readLineCommentRun(content, start, '#')
    }
  }

  if (!raw) return null
  const collapsed = collapseFileSummary(raw)
  return collapsed.length > 0 ? collapsed : null
}
