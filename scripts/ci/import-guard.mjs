#!/usr/bin/env node
/**
 * Fails if packages/engine or packages/cli import process-spawning or network
 * modules, use a non-literal require()/import(), or depend on telemetry.
 *
 * Module specifiers only. The word "cluster" in graph code is allowed.
 * worker_threads is allowed. Missing packages are a skip, not a failure.
 *
 * Usage:
 *   node scripts/ci/import-guard.mjs
 *   node scripts/ci/import-guard.mjs <package-root-or-file> [...]
 */
import fs from 'node:fs'
import path from 'node:path'
import { isCorpusRel, repoRoot } from './corpus-paths.mjs'

const BANNED = new Set([
  'child_process',
  'cluster',
  'vm',
  'http',
  'https',
  'http2',
  'net',
  'tls',
  'dgram',
  'dns',
  'zlib',
  'undici'
])

const TELEMETRY = /telemetry|analytics|sentry|posthog|mixpanel|update-notifier/i
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
const SOURCE = /\.(?:[cm]?[jt]sx?|vue)$/
const STOP = new Set([
  'const', 'let', 'var', 'function', 'class', 'export', 'import',
  'if', 'for', 'while', 'return', 'switch', 'throw', 'try', 'catch'
])
const REGEX_BEFORE = new Set([
  '', '(', ',', '=', '[', '!', '&', '|', '?', ':', '{', '}', ';', '~',
  '+', '-', '*', '%', '^', '>', '<',
  'return', 'throw', 'case', 'typeof', 'void', 'delete', 'await', 'yield',
  'else', 'in', 'of', 'do'
])

const violations = []
const seen = new Set()

function lineOf(source, index) {
  let line = 1
  const limit = Math.min(index, source.length)
  for (let i = 0; i < limit; i++) if (source[i] === '\n') line++
  return line
}

function push(file, source, index, message) {
  const line = lineOf(source, index)
  const key = `${file}:${line}:${message}`
  if (seen.has(key)) return
  seen.add(key)
  violations.push({ file, line, message })
}

function display(file) {
  const rel = path.relative(process.cwd(), file)
  return (rel && !rel.startsWith('..') ? rel : file).split(path.sep).join('/')
}

function isIdentStart(char) {
  return char !== undefined && /[A-Za-z_$]/.test(char)
}

function readIdent(source, index) {
  let end = index + 1
  while (end < source.length && /[A-Za-z0-9_$]/.test(source[end])) end++
  return source.slice(index, end)
}

function previousToken(source, index) {
  let cursor = index - 1
  while (cursor >= 0 && /\s/.test(source[cursor])) cursor--
  if (cursor < 0) return ''
  const char = source[cursor]
  if (/[A-Za-z0-9_$]/.test(char)) {
    let start = cursor
    while (start >= 0 && /[A-Za-z0-9_$]/.test(source[start])) start--
    return source.slice(start + 1, cursor + 1)
  }
  return char
}

function skipWsComments(source, index, end) {
  let cursor = index
  while (cursor < end) {
    const char = source[cursor]
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f') {
      cursor++
      continue
    }
    if (char === '/' && source[cursor + 1] === '/') {
      cursor += 2
      while (cursor < end && source[cursor] !== '\n') cursor++
      continue
    }
    if (char === '/' && source[cursor + 1] === '*') {
      cursor += 2
      while (cursor < end && !(source[cursor] === '*' && source[cursor + 1] === '/')) cursor++
      cursor = Math.min(end, cursor + 2)
      continue
    }
    break
  }
  return cursor
}

function matchingBrace(source, openIndex, end) {
  let depth = 0
  let cursor = openIndex
  while (cursor < end) {
    const char = source[cursor]
    if (char === '/' && source[cursor + 1] === '/') {
      while (cursor < end && source[cursor] !== '\n') cursor++
      continue
    }
    if (char === '/' && source[cursor + 1] === '*') {
      cursor += 2
      while (cursor < end && !(source[cursor] === '*' && source[cursor + 1] === '/')) cursor++
      cursor = Math.min(end, cursor + 2)
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      cursor = readStringRaw(source, cursor, end)
      continue
    }
    if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) return cursor
    }
    cursor++
  }
  return end
}

function readStringRaw(source, index, end) {
  const quote = source[index]
  let cursor = index + 1
  while (cursor < end) {
    const char = source[cursor]
    if (char === '\\') {
      cursor += 2
      continue
    }
    if (quote === '`' && char === '$' && source[cursor + 1] === '{') {
      cursor = matchingBrace(source, cursor + 1, end) + 1
      continue
    }
    if (char === quote) return cursor + 1
    if ((char === '\n' || char === '\r') && quote !== '`') return cursor
    cursor++
  }
  return end
}

function readString(source, index, end, file) {
  const quote = source[index]
  let cursor = index + 1
  let value = ''
  let interpolated = false
  while (cursor < end) {
    const char = source[cursor]
    if (char === '\\') {
      value += source[cursor + 1] ?? ''
      cursor += 2
      continue
    }
    if (quote === '`' && char === '$' && source[cursor + 1] === '{') {
      interpolated = true
      const close = matchingBrace(source, cursor + 1, end)
      walk(source, cursor + 2, close, file)
      cursor = close + 1
      continue
    }
    if (char === quote) return { value, end: cursor + 1, interpolated }
    if ((char === '\n' || char === '\r') && quote !== '`') return null
    value += char
    cursor++
  }
  return null
}

function specifierProblem(spec) {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('file:')) return null
  if (TELEMETRY.test(spec)) return `telemetry-like module specifier "${spec}"`
  let name = spec.startsWith('node:') ? spec.slice(5) : spec
  const root = name.split('/')[0]
  if (BANNED.has(root)) return `banned module specifier "${spec}"`
  return null
}

function noteSpecifier(file, source, index, result, kind) {
  if (!result) return
  if (result.interpolated) {
    push(file, source, index, `non-literal ${kind}()`)
    return
  }
  const problem = specifierProblem(result.value)
  if (problem) push(file, source, index, `${problem} (${kind})`)
}

function parseCall(source, parenIndex, end, file, kind) {
  const cursor = skipWsComments(source, parenIndex + 1, end)
  if (cursor >= end) {
    push(file, source, parenIndex, `non-literal ${kind}()`)
    return end
  }
  const char = source[cursor]
  if (char === "'" || char === '"' || char === '`') {
    const result = readString(source, cursor, end, file)
    if (!result) {
      push(file, source, cursor, `non-literal ${kind}()`)
      return cursor + 1
    }
    noteSpecifier(file, source, cursor, result, kind)
    let after = skipWsComments(source, result.end, end)
    if (source[after] === ')') after++
    return after
  }
  push(file, source, parenIndex, `non-literal ${kind}()`)
  return cursor + 1
}

function skipRegex(source, index, end) {
  let cursor = index + 1
  let inClass = false
  while (cursor < end) {
    const char = source[cursor]
    if (char === '\\') {
      cursor += 2
      continue
    }
    if (char === '[') inClass = true
    else if (char === ']') inClass = false
    else if (char === '/' && !inClass) return cursor + 1
    else if (char === '\n') return cursor
    cursor++
  }
  return cursor
}

function parseModuleClause(source, start, end, file, stopOnBareClose) {
  let cursor = start
  let depth = 0
  while (cursor < end) {
    cursor = skipWsComments(source, cursor, end)
    if (cursor >= end) return cursor
    const char = source[cursor]
    if (char === ';') return cursor + 1
    if (char === '{' || char === '(' || char === '[') {
      depth++
      cursor++
      continue
    }
    if (char === '}' || char === ')' || char === ']') {
      depth = Math.max(0, depth - 1)
      cursor++
      if (stopOnBareClose && depth === 0 && char === '}') {
        const next = skipWsComments(source, cursor, end)
        const ident = isIdentStart(source[next]) ? readIdent(source, next) : ''
        if (ident !== 'from') return cursor
      }
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      const result = readString(source, cursor, end, file)
      if (!result) return cursor + 1
      if (depth === 0) {
        noteSpecifier(file, source, cursor, result, 'import')
        return result.end
      }
      cursor = result.end
      continue
    }
    if (isIdentStart(char)) {
      const ident = readIdent(source, cursor)
      const after = cursor + ident.length
      const next = skipWsComments(source, after, end)
      if ((ident === 'require' || ident === 'import') && source[next] === '(') {
        return parseCall(source, next, end, file, ident === 'require' ? 'require' : 'import')
      }
      if (depth === 0 && STOP.has(ident)) return cursor
      cursor = after
      continue
    }
    cursor++
  }
  return cursor
}

function handleImport(source, keywordIndex, end, file) {
  let cursor = skipWsComments(source, keywordIndex + 'import'.length, end)
  if (source[cursor] === '.') return cursor
  if (source[cursor] === '(') return parseCall(source, cursor, end, file, 'import')
  return parseModuleClause(source, cursor, end, file, false)
}

function handleExport(source, keywordIndex, end, file) {
  let cursor = skipWsComments(source, keywordIndex + 'export'.length, end)
  if (source[cursor] === '*' || source[cursor] === '{') {
    return parseModuleClause(source, cursor, end, file, true)
  }
  if (isIdentStart(source[cursor]) && readIdent(source, cursor) === 'type') {
    const afterType = skipWsComments(source, cursor + 4, end)
    if (source[afterType] === '{' || source[afterType] === '*') {
      return parseModuleClause(source, afterType, end, file, true)
    }
  }
  return cursor
}

function handleRequire(source, keywordIndex, end, file) {
  const after = keywordIndex + 'require'.length
  const cursor = skipWsComments(source, after, end)
  if (source[cursor] === '(') return parseCall(source, cursor, end, file, 'require')
  if (source[cursor] === '.') {
    const propStart = cursor + 1
    if (isIdentStart(source[propStart])) {
      const prop = readIdent(source, propStart)
      const afterProp = skipWsComments(source, propStart + prop.length, end)
      if (prop === 'resolve' && source[afterProp] === '(') {
        return parseCall(source, afterProp, end, file, 'require.resolve')
      }
    }
  }
  return after
}

function walk(source, start, end, file) {
  let cursor = start
  while (cursor < end) {
    const char = source[cursor]
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f') {
      cursor++
      continue
    }
    if (char === '/' && (source[cursor + 1] === '/' || source[cursor + 1] === '*')) {
      cursor = skipWsComments(source, cursor, end)
      continue
    }
    if (char === '/' && REGEX_BEFORE.has(previousToken(source, cursor))) {
      cursor = skipRegex(source, cursor, end)
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      const result = readString(source, cursor, end, file)
      cursor = result ? result.end : cursor + 1
      continue
    }
    if (isIdentStart(char)) {
      const ident = readIdent(source, cursor)
      if (previousToken(source, cursor) !== '.') {
        if (ident === 'import') {
          cursor = handleImport(source, cursor, end, file)
          continue
        }
        if (ident === 'export') {
          cursor = handleExport(source, cursor, end, file)
          continue
        }
        if (ident === 'require') {
          cursor = handleRequire(source, cursor, end, file)
          continue
        }
      }
      cursor += ident.length
      continue
    }
    cursor++
  }
}

function scanSource(source, file) {
  let start = 0
  if (source.startsWith('#!')) {
    const newline = source.indexOf('\n')
    start = newline < 0 ? source.length : newline + 1
  }
  walk(source, start, source.length, file)
}

function scanVue(source, file) {
  const pattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let match = pattern.exec(source)
  if (!match) return
  while (match) {
    const block = match[1]
    const blockStart = match.index + match[0].indexOf(block)
    const line = source.slice(0, blockStart).split('\n').length
    scanSource(`${'\n'.repeat(Math.max(0, line - 1))}${block}`, file)
    match = pattern.exec(source)
  }
}

function scanFile(file) {
  const rel = path.relative(repoRoot, file).split(path.sep).join('/')
  if (!rel.startsWith('..') && isCorpusRel(rel)) return
  const source = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.vue')) scanVue(source, file)
  else scanSource(source, file)
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') continue
    const full = path.join(dir, entry.name)
    const rel = path.relative(repoRoot, full).split(path.sep).join('/')
    if (!rel.startsWith('..') && isCorpusRel(rel)) continue
    if (entry.isDirectory()) walkDir(full)
    else if (SOURCE.test(entry.name)) scanFile(full)
  }
}

function scanPackageJson(file) {
  let pkg
  try {
    pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    push(file, '', 0, `invalid package.json: ${error instanceof Error ? error.message : String(error)}`)
    return
  }
  for (const field of DEP_FIELDS) {
    const deps = pkg[field]
    if (!deps || typeof deps !== 'object' || Array.isArray(deps)) continue
    for (const name of Object.keys(deps)) {
      if (TELEMETRY.test(name)) push(file, '', 0, `telemetry-like ${field} entry "${name}"`)
    }
  }
  for (const field of ['bundleDependencies', 'bundledDependencies']) {
    const names = pkg[field]
    if (!Array.isArray(names)) continue
    for (const name of names) {
      if (typeof name === 'string' && TELEMETRY.test(name)) {
        push(file, '', 0, `telemetry-like ${field} entry "${name}"`)
      }
    }
  }
}

function scanRoot(root) {
  const src = path.join(root, 'src')
  if (fs.existsSync(src) && fs.statSync(src).isDirectory()) walkDir(src)
  const manifest = path.join(root, 'package.json')
  if (fs.existsSync(manifest)) scanPackageJson(manifest)
}

function scanExplicit(target) {
  const stat = fs.statSync(target)
  if (stat.isDirectory()) {
    scanRoot(target)
    return
  }
  if (path.basename(target) === 'package.json') scanPackageJson(target)
  else scanFile(target)
}

const explicit = process.argv.slice(2).filter(arg => arg !== '--')
if (explicit.length === 0) {
  let present = 0
  for (const root of ['packages/engine', 'packages/cli']) {
    const abs = path.join(repoRoot, root)
    if (!fs.existsSync(abs)) {
      console.log(`SKIP: ${root} is not in this revision`)
      continue
    }
    present++
    scanRoot(abs)
  }
  if (present === 0) console.log('No engine or CLI sources to scan.')
} else {
  for (const target of explicit) {
    if (!fs.existsSync(target)) {
      console.error(`import guard: path does not exist: ${target}`)
      process.exit(1)
    }
    scanExplicit(target)
  }
}

if (violations.length > 0) {
  for (const item of violations) {
    console.error(`${display(item.file)}:${item.line}: ${item.message}`)
  }
  console.error(`import guard failed (${violations.length})`)
  process.exit(1)
}

console.log('import guard passed')
