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

/** Read the leading `package` name, or `undefined` when the compilation unit has none (default package). */
export function readJavaPackage(content: string): string | undefined {
  const scanner = new Scanner(content)
  scanner.skipSpaceAndComments()
  if (!scanner.matchKeyword('package')) return undefined
  scanner.skipSpaceAndComments()
  return scanner.readQualifiedName()
}

/** Parse leading `package` and `import` declarations from a Java compilation unit. */
export function extractJava(content: string, limits: ExtractLimits): AdapterParseResult {
  const result = emptyResult()
  const lines = new LineIndex(content)
  const scanner = new Scanner(content)
  scanner.skipSpaceAndComments()
  if (scanner.matchKeyword('package')) {
    scanner.skipSpaceAndComments()
    if (!scanner.readQualifiedName()) result.syntaxErrorCount += 1
    scanner.skipSpaceAndComments()
    if (!scanner.consume(';')) result.syntaxErrorCount += 1
    scanner.skipSpaceAndComments()
  }
  while (scanner.matchKeyword('import')) {
    parseImport(scanner, lines, limits, result)
    scanner.skipSpaceAndComments()
  }
  if (scanner.syntaxErrors > 0) result.syntaxErrorCount += scanner.syntaxErrors
  return result
}

function parseImport(scanner: Scanner, lines: LineIndex, limits: ExtractLimits, result: AdapterParseResult): void {
  scanner.skipSpaceAndComments()
  const start = scanner.index
  let staticImport = false
  if (scanner.matchKeyword('static')) {
    staticImport = true
    scanner.skipSpaceAndComments()
  }
  const name = scanner.readImportName()
  const end = scanner.index
  scanner.skipSpaceAndComments()
  if (!scanner.consume(';')) scanner.syntaxErrors += 1
  if (!name) {
    scanner.syntaxErrors += 1
    return
  }
  addReference(result, limits, name, lines.span(start, end), staticImport)
}

function addReference(
  result: AdapterParseResult,
  limits: ExtractLimits,
  literal: string,
  span: ExtractedReference['span'],
  staticImport: boolean
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
    ...(staticImport ? { names: ['static'] } : {})
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
    if (!this.peekIdent()) return undefined
    const start = this.index
    this.advance()
    while (isIdentContinue(this.peek())) this.advance()
    return this.text.slice(start, this.index)
  }

  /** Dotted identifier, no wildcard (a package name). */
  readQualifiedName(): string | undefined {
    const first = this.readIdent()
    if (!first) return undefined
    const parts = [first]
    while (this.consume('.')) {
      const next = this.readIdent()
      if (!next) {
        this.syntaxErrors += 1
        return undefined
      }
      parts.push(next)
    }
    return parts.join('.')
  }

  /** Dotted import, optionally ending in `.*`. */
  readImportName(): string | undefined {
    const first = this.readIdent()
    if (!first) return undefined
    const parts = [first]
    while (this.consume('.')) {
      if (this.consume('*')) {
        parts.push('*')
        return parts.join('.')
      }
      const next = this.readIdent()
      if (!next) {
        this.syntaxErrors += 1
        return undefined
      }
      parts.push(next)
    }
    return parts.join('.')
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
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_' || ch === '$'
}

function isIdentContinue(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9')
}
