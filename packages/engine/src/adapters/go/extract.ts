import { looksSecret, REDACTED } from '../../redact.js'
import type { AdapterParseResult, ExtractedReference, ExtractLimits } from '../adapter.js'
import { LineIndex, TOO_LONG } from '../ts-js/extract.js'

const emptyResult = (): AdapterParseResult => ({
  references: [],
  symbols: [],
  calls: [],
  unresolvedCalls: 0,
  syntaxErrorCount: 0,
  syntaxErrors: [],
  omitted: { longNames: 0, symbols: 0, edges: 0 },
  redactions: 0
})

/** Parse leading `package` and `import` declarations from a Go source file. */
export function extractGo(content: string, limits: ExtractLimits): AdapterParseResult {
  const result = emptyResult()
  const lines = new LineIndex(content)
  const scanner = new Scanner(content)
  scanner.skipSpaceAndComments()
  if (scanner.matchKeyword('package')) {
    scanner.skipSpaceAndComments()
    if (!scanner.readIdent()) result.syntaxErrorCount += 1
    scanner.skipSpaceAndComments()
  }
  while (scanner.matchKeyword('import')) {
    parseImportDecl(scanner, lines, limits, result)
    scanner.skipSpaceAndComments()
  }
  if (scanner.syntaxErrors > 0) result.syntaxErrorCount += scanner.syntaxErrors
  return result
}

function parseImportDecl(scanner: Scanner, lines: LineIndex, limits: ExtractLimits, result: AdapterParseResult): void {
  scanner.skipSpaceAndComments()
  if (scanner.consume('(')) {
    scanner.skipSpaceAndComments()
    while (!scanner.eof && !scanner.peekIs(')')) {
      parseImportSpec(scanner, lines, limits, result)
      scanner.skipSpaceAndComments()
      scanner.consume(';')
      scanner.skipSpaceAndComments()
    }
    if (!scanner.consume(')')) scanner.syntaxErrors += 1
    return
  }
  parseImportSpec(scanner, lines, limits, result)
}

function parseImportSpec(scanner: Scanner, lines: LineIndex, limits: ExtractLimits, result: AdapterParseResult): void {
  const start = scanner.index
  let alias: string | undefined
  if (scanner.peekIs('.') && !scanner.peekIsString(1)) {
    scanner.advance()
    alias = '.'
    scanner.skipSpaceAndComments()
  } else if (scanner.peekIdent()) {
    const ident = scanner.readIdent()
    scanner.skipSpaceAndComments()
    if (scanner.peekIsString()) alias = ident
    else {
      scanner.syntaxErrors += 1
      return
    }
  }
  if (!scanner.peekIsString()) {
    scanner.syntaxErrors += 1
    return
  }
  const literal = scanner.readString()
  const end = scanner.index
  if (literal === undefined) {
    scanner.syntaxErrors += 1
    return
  }
  addReference(result, limits, literal, lines.span(start, end), alias)
}

function addReference(
  result: AdapterParseResult,
  limits: ExtractLimits,
  literal: string,
  span: ExtractedReference['span'],
  alias: string | undefined
): void {
  if (result.references.length >= limits.maxEdgesPerFile) {
    result.omitted.edges += 1
    return
  }
  let specifier: string | null = literal
  let redacted = false
  if (specifier.length > limits.maxIdentifierLength) {
    specifier = TOO_LONG
    result.omitted.longNames += 1
  } else if (looksSecret(specifier)) {
    specifier = REDACTED
    redacted = true
    result.redactions += 1
  }
  const names = alias !== undefined ? [alias] : undefined
  result.references.push({
    edgeType: 'imports',
    importKind: 'static',
    typeOnly: false,
    specifier,
    redacted,
    span,
    ...(names ? { names } : {})
  })
}

class Scanner {
  readonly text: string
  index = 0
  syntaxErrors = 0

  constructor(text: string) {
    this.text = text
  }

  get eof(): boolean {
    return this.index >= this.text.length
  }

  advance(count = 1): void {
    this.index = Math.min(this.text.length, this.index + count)
  }

  peek(offset = 0): string {
    return this.text[this.index + offset] ?? ''
  }

  peekIs(ch: string): boolean {
    return this.text.startsWith(ch, this.index)
  }

  peekIsString(offset = 0): boolean {
    const ch = this.text[this.index + offset]
    return ch === '"' || ch === '`'
  }

  consume(ch: string): boolean {
    if (!this.peekIs(ch)) return false
    this.advance(ch.length)
    return true
  }

  matchKeyword(word: string): boolean {
    if (!this.text.startsWith(word, this.index)) return false
    const next = this.text[this.index + word.length] ?? ''
    if (isIdentContinue(next)) return false
    this.advance(word.length)
    return true
  }

  peekIdent(): boolean {
    return isIdentStart(this.peek())
  }

  readIdent(): string | undefined {
    if (!this.peekIdent()) return undefined
    const start = this.index
    this.advance()
    while (isIdentContinue(this.peek())) this.advance()
    return this.text.slice(start, this.index)
  }

  readString(): string | undefined {
    const quote = this.peek()
    if (quote !== '"' && quote !== '`') return undefined
    this.advance()
    if (quote === '`') {
      const start = this.index
      const end = this.text.indexOf('`', this.index)
      if (end === -1) {
        this.index = this.text.length
        return undefined
      }
      const value = this.text.slice(start, end)
      this.index = end + 1
      return value
    }
    let value = ''
    while (!this.eof) {
      const ch = this.peek()
      if (ch === '"') {
        this.advance()
        return value
      }
      if (ch === '\\') {
        this.advance()
        const escaped = this.peek()
        if (!escaped) return undefined
        value += unescapeGo(escaped)
        this.advance()
        continue
      }
      if (ch === '\n') return undefined
      value += ch
      this.advance()
    }
    return undefined
  }

  skipSpaceAndComments(): void {
    for (;;) {
      const ch = this.peek()
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\v' || ch === '\f') {
        this.advance()
        continue
      }
      if (ch === '/' && this.peek(1) === '/') {
        this.advance(2)
        while (!this.eof && this.peek() !== '\n') this.advance()
        continue
      }
      if (ch === '/' && this.peek(1) === '*') {
        this.advance(2)
        const end = this.text.indexOf('*/', this.index)
        if (end === -1) {
          this.index = this.text.length
          this.syntaxErrors += 1
          return
        }
        this.index = end + 2
        continue
      }
      return
    }
  }
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_'
}

function isIdentContinue(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9')
}

function unescapeGo(escaped: string): string {
  switch (escaped) {
    case 'n':
      return '\n'
    case 't':
      return '\t'
    case 'r':
      return '\r'
    case '\\':
    case '"':
    case "'":
      return escaped
    default:
      return escaped
  }
}
