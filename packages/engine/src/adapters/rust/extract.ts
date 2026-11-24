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

/** Parse `use`, `pub use`, `mod name;`, and `extern crate` declarations from a Rust source file. */
export function extractRust(content: string, limits: ExtractLimits): AdapterParseResult {
  const result = emptyResult()
  const lines = new LineIndex(content)
  const scanner = new Scanner(content)
  while (!scanner.eof) {
    scanner.skipSpaceAndComments()
    if (scanner.eof) break
    if (scanner.peekIs('#')) {
      scanner.skipAttribute()
      continue
    }
    if (scanner.peekIsString()) {
      scanner.skipString()
      continue
    }
    if (scanner.matchKeyword('pub')) {
      scanner.skipSpaceAndComments()
      if (scanner.consume('(')) {
        scanner.skipBalanced('(', ')')
        scanner.skipSpaceAndComments()
      }
      if (scanner.matchKeyword('use')) {
        parseUseTree(scanner, lines, limits, result, '')
        finishDecl(scanner)
        continue
      }
      if (scanner.matchKeyword('mod')) {
        parseMod(scanner, lines, limits, result)
        continue
      }
      if (scanner.matchKeyword('extern')) {
        parseExternCrate(scanner, lines, limits, result)
        continue
      }
      continue
    }
    if (scanner.matchKeyword('use')) {
      parseUseTree(scanner, lines, limits, result, '')
      finishDecl(scanner)
      continue
    }
    if (scanner.matchKeyword('extern')) {
      parseExternCrate(scanner, lines, limits, result)
      continue
    }
    if (scanner.matchKeyword('mod')) {
      parseMod(scanner, lines, limits, result)
      continue
    }
    if (scanner.peekIdent()) scanner.readIdent()
    else scanner.advance()
  }
  if (scanner.syntaxErrors > 0) result.syntaxErrorCount += scanner.syntaxErrors
  return result
}

function finishDecl(scanner: Scanner): void {
  scanner.skipSpaceAndComments()
  if (!scanner.consume(';')) scanner.syntaxErrors += 1
}

function parseExternCrate(scanner: Scanner, lines: LineIndex, limits: ExtractLimits, result: AdapterParseResult): void {
  scanner.skipSpaceAndComments()
  if (!scanner.matchKeyword('crate')) return
  const start = scanner.index
  scanner.skipSpaceAndComments()
  const name = scanner.readIdent()
  const afterName = scanner.index
  if (!name) {
    scanner.syntaxErrors += 1
    return
  }
  scanner.skipSpaceAndComments()
  let alias: string | undefined
  if (scanner.matchKeyword('as')) {
    scanner.skipSpaceAndComments()
    alias = scanner.readIdent()
    scanner.skipSpaceAndComments()
  }
  if (!scanner.consume(';')) scanner.syntaxErrors += 1
  addReference(result, limits, name, lines.span(start, afterName), alias)
}

function parseMod(scanner: Scanner, lines: LineIndex, limits: ExtractLimits, result: AdapterParseResult): void {
  scanner.skipSpaceAndComments()
  const start = scanner.index
  const name = scanner.readIdent()
  const end = scanner.index
  scanner.skipSpaceAndComments()
  if (scanner.consume(';')) {
    if (!name) {
      scanner.syntaxErrors += 1
      return
    }
    addReference(result, limits, `mod ${name}`, lines.span(start, end), undefined)
    return
  }
  // Inline `mod name { ... }` is not a file declaration.
  if (!name) scanner.syntaxErrors += 1
}

function parseUseTree(
  scanner: Scanner,
  lines: LineIndex,
  limits: ExtractLimits,
  result: AdapterParseResult,
  prefix: string
): void {
  scanner.skipSpaceAndComments()
  const start = scanner.index
  if (scanner.consume('{')) {
    parseUseGroup(scanner, lines, limits, result, prefix)
    return
  }
  if (scanner.consume('*')) {
    addReference(result, limits, joinPath(prefix, '*'), lines.span(start, scanner.index), undefined)
    return
  }
  if (scanner.consume('::')) {
    // Global path `::std::io` — treat as `std::io`.
  }
  const first = scanner.readPathSegment()
  if (!first) {
    scanner.syntaxErrors += 1
    return
  }
  let path = first
  for (;;) {
    scanner.skipSpaceAndComments()
    if (!scanner.consume('::')) break
    scanner.skipSpaceAndComments()
    if (scanner.consume('{')) {
      parseUseGroup(scanner, lines, limits, result, joinPath(prefix, path))
      return
    }
    if (scanner.consume('*')) {
      addReference(result, limits, joinPath(joinPath(prefix, path), '*'), lines.span(start, scanner.index), undefined)
      return
    }
    const segment = scanner.readPathSegment()
    if (!segment) {
      scanner.syntaxErrors += 1
      return
    }
    path = joinPath(path, segment)
  }
  scanner.skipSpaceAndComments()
  let alias: string | undefined
  if (scanner.matchKeyword('as')) {
    scanner.skipSpaceAndComments()
    alias = scanner.readIdent()
  }
  addReference(result, limits, joinPath(prefix, path), lines.span(start, scanner.index), alias)
}

function parseUseGroup(
  scanner: Scanner,
  lines: LineIndex,
  limits: ExtractLimits,
  result: AdapterParseResult,
  prefix: string
): void {
  scanner.skipSpaceAndComments()
  if (scanner.consume('}')) return
  for (;;) {
    parseUseTree(scanner, lines, limits, result, prefix)
    scanner.skipSpaceAndComments()
    const comma = scanner.consume(',')
    scanner.skipSpaceAndComments()
    if (scanner.consume('}')) return
    if (!comma) {
      scanner.syntaxErrors += 1
      return
    }
    if (scanner.eof) {
      scanner.syntaxErrors += 1
      return
    }
  }
}

function joinPath(prefix: string, segment: string): string {
  if (!prefix) return segment
  if (!segment) return prefix
  if (segment === 'self') return prefix
  if (segment === '*') return `${prefix}::*`
  return `${prefix}::${segment}`
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
  result.references.push({
    edgeType: 'imports',
    importKind: 'static',
    typeOnly: false,
    specifier,
    redacted,
    span,
    ...(alias ? { names: [alias] } : {})
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
    if (this.peek() === 'r' && this.peek(1) === '#') {
      this.advance(2)
    }
    if (!this.peekIdent()) return undefined
    const start = this.index
    this.advance()
    while (isIdentContinue(this.peek())) this.advance()
    return this.text.slice(start, this.index)
  }

  readPathSegment(): string | undefined {
    if (this.matchKeyword('crate')) return 'crate'
    if (this.matchKeyword('self')) return 'self'
    if (this.matchKeyword('super')) return 'super'
    return this.readIdent()
  }

  peekIsString(): boolean {
    const ch = this.peek()
    if (ch === '"' || ch === "'") return true
    if (ch === 'b' || ch === 'c') {
      const next = this.peek(1)
      if (next === '"' || next === "'") return true
      if (next === 'r') return this.isRawStringStart(2)
    }
    if (ch === 'r') return this.isRawStringStart(1)
    return false
  }

  private isRawStringStart(offset: number): boolean {
    let index = this.index + offset
    if (this.text[index] === '#') {
      while (this.text[index] === '#') index += 1
    }
    return this.text[index] === '"'
  }

  skipString(): void {
    if (this.peek() === 'b' || this.peek() === 'c') this.advance()
    if (this.peek() === 'r') {
      this.advance()
      let hashes = 0
      while (this.peek() === '#') {
        hashes += 1
        this.advance()
      }
      if (!this.consume('"')) return
      const closer = `"${'#'.repeat(hashes)}`
      const end = this.text.indexOf(closer, this.index)
      if (end === -1) {
        this.index = this.text.length
        this.syntaxErrors += 1
        return
      }
      this.index = end + closer.length
      return
    }
    const quote = this.peek()
    if (quote !== '"' && quote !== "'") return
    this.advance()
    while (!this.eof) {
      const ch = this.peek()
      if (ch === quote) {
        this.advance()
        return
      }
      if (ch === '\\') {
        this.advance(2)
        continue
      }
      if (ch === '\n' && quote === "'") return
      this.advance()
    }
    this.syntaxErrors += 1
  }

  skipAttribute(): void {
    if (!this.consume('#')) return
    this.consume('!')
    this.skipSpaceAndComments()
    if (!this.consume('[')) return
    this.skipBalanced('[', ']')
  }

  skipBalanced(open: string, close: string): void {
    let depth = 1
    while (!this.eof && depth > 0) {
      this.skipSpaceAndComments()
      if (this.eof) break
      if (this.peekIsString()) {
        this.skipString()
        continue
      }
      if (this.consume(open)) {
        depth += 1
        continue
      }
      if (this.consume(close)) {
        depth -= 1
        continue
      }
      this.advance()
    }
    if (depth !== 0) this.syntaxErrors += 1
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
