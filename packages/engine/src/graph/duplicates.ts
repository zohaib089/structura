/**
 * Deterministic, offline duplicate-code detection for graph.json v1.4.0.
 *
 * Compares normalised meaningful lines across parsed files. No AI, no git
 * history, no extra native or WASM dependencies. Thresholds, normalisation,
 * and the output shape are documented in docs/duplicate-detection.md.
 *
 * A block must have at least MIN_MEANINGFUL_LINES non-trivial lines and
 * MIN_BLOCK_CHARS of normalised text. Overlapping windows are merged into
 * maximal spans; sub-spans of a larger group are suppressed. Group ids are
 * a short sha256 of the normalised block.
 */
import { createHash } from 'node:crypto'
import { compareStrings } from './ids.js'
import type {
  DuplicateGroup,
  DuplicateOccurrence,
  DuplicateSource,
  Graph,
  GraphDuplicates
} from './types.js'

export const DUPLICATES_DEFAULT_LIMIT = 20
export const MIN_MEANINGFUL_LINES = 6
export const MIN_BLOCK_CHARS = 48
export const DUPLICATE_ID_LENGTH = 12

interface MeaningfulLine {
  line: number
  norm: string
}

interface FileSequence {
  path: string
  lines: MeaningfulLine[]
  rawLineCount: number
}

interface TrieNode {
  children: Map<string, TrieNode>
  occ: Array<{ path: string; startIndex: number; startLine: number }>
}

function isPython(language: string | null): boolean {
  return language === 'python'
}

function isCStyle(language: string | null): boolean {
  return language === 'typescript' || language === 'javascript' || language === 'vue'
}

function isIdent(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char)
}

function startsString(content: string, index: number): { quote: string; end: number } | null {
  const triple = content.slice(index, index + 3)
  if (triple === "'''" || triple === '"""') return { quote: triple, end: index + 3 }
  const char = content[index]
  if (char === "'" || char === '"' || char === '`') return { quote: char, end: index + 1 }
  return null
}

/**
 * Replace comments with spaces (newlines kept) so original line numbers stay aligned.
 */
export function maskComments(content: string, language: string | null): string {
  const python = isPython(language)
  const cStyle = isCStyle(language)
  const out: string[] = []
  let index = 0
  let mode: 'code' | 'line' | 'block' | 'string' = 'code'
  let quote = ''
  // Shebang is a line comment on the first line.
  if (content.startsWith('#!')) {
    const end = content.indexOf('\n')
    const stop = end === -1 ? content.length : end
    out.push(' '.repeat(stop))
    index = stop
  }
  while (index < content.length) {
    const char = content[index]!
    const next = content[index + 1]

    if (mode === 'line') {
      if (char === '\n') {
        out.push('\n')
        mode = 'code'
      } else if (char === '\r') {
        out.push('\r')
      } else {
        out.push(' ')
      }
      index += 1
      continue
    }

    if (mode === 'block') {
      if (char === '*' && next === '/') {
        out.push('  ')
        index += 2
        mode = 'code'
        continue
      }
      out.push(char === '\n' || char === '\r' ? char : ' ')
      index += 1
      continue
    }

    if (mode === 'string') {
      if (char === '\\' && quote.length === 1) {
        out.push(char, next ?? '')
        index += next === undefined ? 1 : 2
        continue
      }
      if (content.startsWith(quote, index)) {
        out.push(quote)
        index += quote.length
        mode = 'code'
        continue
      }
      out.push(char)
      index += 1
      continue
    }

    if (cStyle && char === '/' && next === '/') {
      out.push('  ')
      index += 2
      mode = 'line'
      continue
    }
    if (cStyle && char === '/' && next === '*') {
      out.push('  ')
      index += 2
      mode = 'block'
      continue
    }
    if (python && char === '#' && (index === 0 || !isIdent(content[index - 1]!))) {
      out.push(' ')
      index += 1
      mode = 'line'
      continue
    }

    if (python || cStyle) {
      // Python raw/f/byte prefixes immediately before a quote. JS has no such prefixes.
      let start = index
      if (python) {
        let prefix = index
        while (prefix < content.length && /[rRuUbBfF]/.test(content[prefix]!)) prefix += 1
        if (prefix > index && (index === 0 || !isIdent(content[index - 1]!))) start = prefix
      }
      const str = startsString(content, start)
      if (str && (start === index || start > index)) {
        out.push(content.slice(index, str.end))
        index = str.end
        quote = str.quote
        mode = 'string'
        continue
      }
    }

    out.push(char)
    index += 1
  }
  return out.join('')
}

export function normaliseLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

const IMPORT_LINE =
  /^(import\b|from\b.+?\bimport\b|export\s+(type\s+)?\{|export\s+\*\s+from\b|export\s+type\s+\*\s+from\b|export\s+default\s+[A-Za-z_$][\w$]*\s*;?$)/
const BRACE_ONLY = /^[\{\}\(\)\[\];,.:]+$/

export function isTrivialLine(norm: string): boolean {
  if (norm.length === 0) return true
  if (BRACE_ONLY.test(norm)) return true
  if (IMPORT_LINE.test(norm)) return true
  if (/^(const|let|var)\s+\w+\s*=\s*require\s*\(/.test(norm)) return true
  return false
}

export function meaningfulLines(content: string, language: string | null): MeaningfulLine[] {
  const masked = maskComments(content, language)
  const parts = masked.split('\n')
  const lines: MeaningfulLine[] = []
  for (let index = 0; index < parts.length; index += 1) {
    const norm = normaliseLine(parts[index]!.replace(/\r$/, ''))
    if (isTrivialLine(norm)) continue
    lines.push({ line: index + 1, norm })
  }
  return lines
}

function rawLineCount(content: string): number {
  if (content.length === 0) return 0
  let count = 1
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === '\n') count += 1
  }
  return count
}

function blockId(norms: string[]): string {
  return createHash('sha256').update(norms.join('\n'), 'utf8').digest('hex').slice(0, DUPLICATE_ID_LENGTH)
}

function charCount(norms: string[]): number {
  let total = 0
  for (const line of norms) total += line.length
  return total
}

function describeGroup(lineCount: number, occurrences: DuplicateOccurrence[]): string {
  const lines = `${lineCount} identical line${lineCount === 1 ? '' : 's'}`
  const paths: string[] = []
  for (const item of occurrences) {
    if (!paths.includes(item.path)) paths.push(item.path)
  }
  if (paths.length === 1) {
    const n = occurrences.length
    const times = n === 2 ? 'twice' : `${n} times`
    return `${lines} appear ${times} in ${paths[0]}`
  }
  if (paths.length === 2 && occurrences.length === 2) {
    return `${lines} in ${paths[0]} and ${paths[1]}`
  }
  return `${lines} in ${paths.length} files`
}

function compareOccurrences(left: DuplicateOccurrence, right: DuplicateOccurrence): number {
  return compareStrings(left.path, right.path) || left.startLine - right.startLine || left.endLine - right.endLine
}

function spansOverlap(left: DuplicateOccurrence, right: DuplicateOccurrence): boolean {
  return left.path === right.path && left.startLine <= right.endLine && right.startLine <= left.endLine
}

function dropOverlapping(occurrences: DuplicateOccurrence[]): DuplicateOccurrence[] {
  const sorted = [...occurrences].sort(compareOccurrences)
  const kept: DuplicateOccurrence[] = []
  for (const item of sorted) {
    if (kept.some(existing => spansOverlap(existing, item))) continue
    kept.push(item)
  }
  return kept
}

function containedIn(inner: DuplicateOccurrence, outer: DuplicateOccurrence): boolean {
  return inner.path === outer.path && inner.startLine >= outer.startLine && inner.endLine <= outer.endLine
}

function isSubSpan(inner: DuplicateGroup, outer: DuplicateGroup): boolean {
  if (inner.id === outer.id) return false
  if (inner.lineCount >= outer.lineCount && inner.occurrences.length >= outer.occurrences.length) return false
  return inner.occurrences.every(item => outer.occurrences.some(host => containedIn(item, host)))
}

function insertSuffix(root: TrieNode, file: FileSequence, startIndex: number): void {
  let node = root
  for (let index = startIndex; index < file.lines.length; index += 1) {
    const key = file.lines[index]!.norm
    let child = node.children.get(key)
    if (!child) {
      child = { children: new Map(), occ: [] }
      node.children.set(key, child)
    }
    child.occ.push({ path: file.path, startIndex, startLine: file.lines[startIndex]!.line })
    node = child
  }
}

function collectFromTrie(
  node: TrieNode,
  depth: number,
  norms: string[],
  files: Map<string, FileSequence>,
  groups: DuplicateGroup[]
): void {
  if (depth >= MIN_MEANINGFUL_LINES && node.occ.length >= 2 && charCount(norms) >= MIN_BLOCK_CHARS) {
    let allContinueTogether = false
    for (const child of node.children.values()) {
      if (child.occ.length === node.occ.length) {
        allContinueTogether = true
        break
      }
    }
    if (!allContinueTogether) {
      const occurrences = dropOverlapping(
        node.occ.map(item => {
          const file = files.get(item.path)
          const end = file?.lines[item.startIndex + depth - 1]?.line ?? item.startLine
          return { path: item.path, startLine: item.startLine, endLine: end }
        })
      )
      if (occurrences.length >= 2) {
        occurrences.sort(compareOccurrences)
        groups.push({
          id: blockId(norms),
          lineCount: depth,
          occurrences,
          description: describeGroup(depth, occurrences)
        })
      }
    }
  }
  const keys = [...node.children.keys()].sort(compareStrings)
  for (const key of keys) {
    collectFromTrie(node.children.get(key)!, depth + 1, [...norms, key], files, groups)
  }
}

function suppressSubSpans(groups: DuplicateGroup[]): DuplicateGroup[] {
  return groups.filter(group => !groups.some(other => isSubSpan(group, other)))
}

function compareGroups(left: DuplicateGroup, right: DuplicateGroup): number {
  return right.lineCount - left.lineCount || right.occurrences.length - left.occurrences.length || compareStrings(left.id, right.id)
}

function uniqueCoveredLines(groups: DuplicateGroup[]): number {
  const seen = new Set<string>()
  for (const group of groups) {
    for (const occ of group.occurrences) {
      for (let line = occ.startLine; line <= occ.endLine; line += 1) {
        seen.add(`${occ.path}:${line}`)
      }
    }
  }
  return seen.size
}

export function detectDuplicateGroups(sources: readonly DuplicateSource[]): DuplicateGroup[] {
  const files = new Map<string, FileSequence>()
  for (const source of sources) {
    const lines = meaningfulLines(source.content, source.language)
    files.set(source.path, { path: source.path, lines, rawLineCount: rawLineCount(source.content) })
  }
  const root: TrieNode = { children: new Map(), occ: [] }
  const paths = [...files.keys()].sort(compareStrings)
  for (const path of paths) {
    const file = files.get(path)!
    const lastStart = file.lines.length - MIN_MEANINGFUL_LINES
    for (let index = 0; index <= lastStart; index += 1) insertSuffix(root, file, index)
  }
  const groups: DuplicateGroup[] = []
  collectFromTrie(root, 0, [], files, groups)
  return suppressSubSpans(groups).sort(compareGroups)
}

function totalRawLines(sources: readonly DuplicateSource[]): number {
  let total = 0
  for (const source of sources) total += rawLineCount(source.content)
  return total
}

export function buildDuplicates(
  sources: readonly DuplicateSource[],
  limit = DUPLICATES_DEFAULT_LIMIT
): GraphDuplicates | undefined {
  const groups = detectDuplicateGroups(sources)
  if (groups.length === 0) return undefined
  const duplicatedLines = uniqueCoveredLines(groups)
  const total = totalRawLines(sources)
  const cap = Number.isSafeInteger(limit) && limit > 0 ? limit : DUPLICATES_DEFAULT_LIMIT
  return {
    summary: {
      groups: groups.length,
      duplicatedLines,
      percentage: total > 0 ? Math.round((100 * duplicatedLines) / total) : 0
    },
    groups: groups.slice(0, cap)
  }
}

/**
 * Returns a copy of `graph` with an optional `duplicates` section. Does not
 * mutate the input. Files without source, or that were not parsed, are skipped.
 */
export function attachDuplicates(graph: Graph, sources: readonly DuplicateSource[], limit = DUPLICATES_DEFAULT_LIMIT): Graph {
  const fileLanguages = new Map<string, string | null>()
  const usable = new Set<string>()
  for (const node of graph.nodes) {
    if (node.kind !== 'file') continue
    fileLanguages.set(node.path, node.language)
    if (node.parse.status === 'parsed' || node.parse.status === 'partial') usable.add(node.path)
  }
  const scoped: DuplicateSource[] = []
  for (const source of sources) {
    if (!usable.has(source.path)) continue
    scoped.push({
      path: source.path,
      content: source.content,
      language: source.language ?? fileLanguages.get(source.path) ?? null
    })
  }
  scoped.sort((left, right) => compareStrings(left.path, right.path))
  const { duplicates: _ignored, ...rest } = graph
  void _ignored
  const duplicates = buildDuplicates(scoped, limit)
  if (!duplicates) return { ...rest }
  return { ...rest, duplicates }
}
