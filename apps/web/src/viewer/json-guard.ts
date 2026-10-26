import { JSON_MAX_DEPTH, JSON_MAX_ERRORS } from './caps'

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export type GuardResult =
  | { ok: true }
  | { ok: false; code: 'invalid-json'; where: string }
  | { ok: false; code: 'invalid-graph'; paths: string[] }

/**
 * Streaming scan that runs before JSON.parse.
 * Rejects dangerous own-keys (including `\u` escapes that decode to them),
 * duplicate keys, and nesting deeper than 64. Syntax problems are reported
 * separately so a version check never runs on a hostile document.
 */
export function guardJson(text: string): GuardResult {
  const scanner = new Scanner(text)
  scanner.parseValue('')
  scanner.skipWs()
  if (!scanner.syntax && scanner.i < text.length) {
    scanner.failSyntax()
  }
  if (scanner.syntax) {
    return { ok: false, code: 'invalid-json', where: scanner.syntax }
  }
  if (scanner.paths.length > 0) {
    return { ok: false, code: 'invalid-graph', paths: scanner.paths }
  }
  return { ok: true }
}

class Scanner {
  i = 0
  depth = 0
  syntax: string | null = null
  paths: string[] = []
  private readonly text: string

  constructor(text: string) {
    this.text = text
  }

  failSyntax() {
    if (this.syntax) return
    const where = lineColumn(this.text, this.i)
    this.syntax = `line ${where.line}, column ${where.column}`
  }

  pushPath(path: string) {
    if (this.paths.length >= JSON_MAX_ERRORS) return
    if (!this.paths.includes(path)) this.paths.push(path)
  }

  skipWs() {
    const text = this.text
    let i = this.i
    while (i < text.length) {
      const code = text.charCodeAt(i)
      if (code !== 32 && code !== 9 && code !== 10 && code !== 13) break
      i += 1
    }
    this.i = i
  }

  parseValue(path: string) {
    if (this.syntax) return
    this.skipWs()
    const char = this.text[this.i]
    if (char === '{') this.parseObject(path)
    else if (char === '[') this.parseArray(path)
    else if (char === '"') this.skipString()
    else if (char === 't') this.skipLiteral('true')
    else if (char === 'f') this.skipLiteral('false')
    else if (char === 'n') this.skipLiteral('null')
    else if (char === '-' || (char !== undefined && char >= '0' && char <= '9')) this.skipNumber()
    else this.failSyntax()
  }

  parseObject(path: string) {
    this.depth += 1
    if (this.depth > JSON_MAX_DEPTH) this.pushPath(path || '/')
    this.i += 1
    const seen = new Set<string>()
    this.skipWs()
    if (this.text[this.i] === '}') {
      this.i += 1
      this.depth -= 1
      return
    }
    while (!this.syntax && this.i < this.text.length) {
      this.skipWs()
      if (this.text[this.i] !== '"') {
        this.failSyntax()
        return
      }
      const key = this.readString()
      if (key === null) return
      const token = key.replace(/~/g, '~0').replace(/\//g, '~1')
      const child = `${path}/${token}`
      if (DANGEROUS_KEYS.has(key)) this.pushPath(child)
      if (seen.has(key)) this.pushPath(child)
      seen.add(key)
      this.skipWs()
      if (this.text[this.i] !== ':') {
        this.failSyntax()
        return
      }
      this.i += 1
      this.parseValue(child)
      if (this.syntax) return
      this.skipWs()
      if (this.text[this.i] === ',') {
        this.i += 1
        continue
      }
      if (this.text[this.i] === '}') {
        this.i += 1
        this.depth -= 1
        return
      }
      this.failSyntax()
      return
    }
    this.failSyntax()
  }

  parseArray(path: string) {
    this.depth += 1
    if (this.depth > JSON_MAX_DEPTH) this.pushPath(path || '/')
    this.i += 1
    this.skipWs()
    if (this.text[this.i] === ']') {
      this.i += 1
      this.depth -= 1
      return
    }
    let index = 0
    while (!this.syntax && this.i < this.text.length) {
      this.parseValue(`${path}/${index}`)
      if (this.syntax) return
      index += 1
      this.skipWs()
      if (this.text[this.i] === ',') {
        this.i += 1
        continue
      }
      if (this.text[this.i] === ']') {
        this.i += 1
        this.depth -= 1
        return
      }
      this.failSyntax()
      return
    }
    this.failSyntax()
  }

  readString(): string | null {
    const text = this.text
    let i = this.i + 1
    let out = ''
    while (i < text.length) {
      const char = text[i]
      if (char === '"') {
        this.i = i + 1
        return out
      }
      if (char === '\\') {
        const escaped = text[i + 1]
        if (escaped === '"' || escaped === '\\' || escaped === '/') {
          out += escaped
          i += 2
          continue
        }
        if (escaped === 'b') { out += '\b'; i += 2; continue }
        if (escaped === 'f') { out += '\f'; i += 2; continue }
        if (escaped === 'n') { out += '\n'; i += 2; continue }
        if (escaped === 'r') { out += '\r'; i += 2; continue }
        if (escaped === 't') { out += '\t'; i += 2; continue }
        if (escaped === 'u') {
          const hex = text.slice(i + 2, i + 6)
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            this.i = i
            this.failSyntax()
            return null
          }
          out += String.fromCharCode(Number.parseInt(hex, 16))
          i += 6
          continue
        }
        this.i = i
        this.failSyntax()
        return null
      }
      if (char !== undefined && char.charCodeAt(0) < 0x20) {
        this.i = i
        this.failSyntax()
        return null
      }
      out += char
      i += 1
    }
    this.i = i
    this.failSyntax()
    return null
  }

  skipString() {
    this.readString()
  }

  skipLiteral(literal: string) {
    if (this.text.slice(this.i, this.i + literal.length) !== literal) {
      this.failSyntax()
      return
    }
    this.i += literal.length
  }

  skipNumber() {
    const start = this.i
    if (this.text[this.i] === '-') this.i += 1
    if (this.text[this.i] === '0') this.i += 1
    else if (this.text[this.i] !== undefined && this.text[this.i]! >= '1' && this.text[this.i]! <= '9') {
      while (this.text[this.i] !== undefined && this.text[this.i]! >= '0' && this.text[this.i]! <= '9') this.i += 1
    } else {
      this.failSyntax()
      return
    }
    if (this.text[this.i] === '.') {
      this.i += 1
      if (this.text[this.i] === undefined || this.text[this.i]! < '0' || this.text[this.i]! > '9') {
        this.failSyntax()
        return
      }
      while (this.text[this.i] !== undefined && this.text[this.i]! >= '0' && this.text[this.i]! <= '9') this.i += 1
    }
    if (this.text[this.i] === 'e' || this.text[this.i] === 'E') {
      this.i += 1
      if (this.text[this.i] === '+' || this.text[this.i] === '-') this.i += 1
      if (this.text[this.i] === undefined || this.text[this.i]! < '0' || this.text[this.i]! > '9') {
        this.failSyntax()
        return
      }
      while (this.text[this.i] !== undefined && this.text[this.i]! >= '0' && this.text[this.i]! <= '9') this.i += 1
    }
    if (this.i === start) this.failSyntax()
  }
}

export function lineColumn(text: string, index: number): { line: number; column: number } {
  let line = 1
  let column = 1
  const end = Math.min(index, text.length)
  for (let i = 0; i < end; i += 1) {
    if (text[i] === '\n') {
      line += 1
      column = 1
    } else {
      column += 1
    }
  }
  return { line, column }
}

export function syntaxWhere(text: string, error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const match = /position (\d+)/.exec(message)
  if (!match) return 'line 1, column 1'
  const where = lineColumn(text, Number(match[1]))
  return `line ${where.line}, column ${where.column}`
}
