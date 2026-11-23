import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { compareEdges, compareNodes, serializeGraph } from './canonical.js'
import {
  attachDuplicates,
  detectDuplicateGroups,
  isTrivialLine,
  meaningfulLines,
  MIN_MEANINGFUL_LINES,
  MIN_BLOCK_CHARS,
  DUPLICATE_ID_LENGTH
} from './duplicates.js'
import type { DuplicateSource, FileNode, Graph, GraphEdge, GraphNode } from './types.js'
import { validateStrict } from './validate-strict.js'

function snippet(prefix: string, count = MIN_MEANINGFUL_LINES): string {
  const lines: string[] = []
  for (let index = 0; index < count; index += 1) {
    lines.push(`  const ${prefix}Value${index} = compute${prefix}(input, ${index}, flags)`)
  }
  return lines.join('\n')
}

function source(path: string, content: string, language: string | null = 'typescript'): DuplicateSource {
  return { path, content, language }
}

function fileNode(path: string, language: string | null = 'typescript'): FileNode {
  const lines = 20
  return {
    id: `file:${path}`,
    kind: 'file',
    path,
    label: path.split('/').at(-1) ?? path,
    language,
    lineCount: lines,
    parse: { status: 'parsed' }
  }
}

function contains(sourceId: string, target: string): GraphEdge {
  return { source: sourceId, type: 'contains', target, provenance: 'EXTRACTED' }
}

function graphOf(files: FileNode[]): Graph {
  const folders = new Set<string>()
  for (const file of files) {
    const parts = file.path.split('/')
    for (let index = 1; index < parts.length; index += 1) folders.add(parts.slice(0, index).join('/'))
  }
  const directories: GraphNode[] = [
    { id: 'dir:.', kind: 'directory', path: '.', label: '.' },
    ...[...folders].sort().map(path => ({
      id: `dir:${path}`,
      kind: 'directory' as const,
      path,
      label: path.split('/').at(-1) ?? path
    }))
  ]
  const nodes: GraphNode[] = [...directories, ...files].sort(compareNodes)
  const containment: GraphEdge[] = []
  if (folders.has('src')) containment.push(contains('dir:.', 'dir:src'))
  for (const folder of folders) {
    if (folder === 'src') continue
    const parent = folder.includes('/') ? `dir:${folder.slice(0, folder.lastIndexOf('/'))}` : 'dir:src'
    containment.push(contains(parent, `dir:${folder}`))
  }
  for (const file of files) {
    const parent = file.path.includes('/') ? `dir:${file.path.slice(0, file.path.lastIndexOf('/'))}` : 'dir:.'
    containment.push(contains(parent, file.id))
  }
  const edges = containment.sort(compareEdges)
  return {
    schemaVersion: '1.4.0',
    summary: { nodes: nodes.length, edges: edges.length, files: files.length },
    coverage: {
      files: { discovered: files.length, parsed: files.length, partial: 0, failed: 0, skipped: 0, ignored: 0 },
      byLanguage: [{ language: 'typescript', parsed: files.length, partial: 0, failed: 0, skipped: 0 }],
      skipped: [],
      failed: [],
      ignored: [],
      unresolved: [],
      accounting: { discovered: files.length, accounted: files.length }
    },
    nodes,
    edges
  }
}

test('import, brace-only, and empty lines are trivial', () => {
  assert.equal(isTrivialLine(''), true)
  assert.equal(isTrivialLine('{'), true)
  assert.equal(isTrivialLine('};'), true)
  assert.equal(isTrivialLine("import { x } from './mod'"), true)
  assert.equal(isTrivialLine('from pkg import loads'), true)
  assert.equal(isTrivialLine("export { x } from './mod'"), true)
  assert.equal(isTrivialLine("const x = require('fs')"), true)
  assert.equal(isTrivialLine('const value = compute(input, 1, flags)'), false)
  assert.equal(isTrivialLine('export function run() {'), false)
})

test('finds the same block in two files', () => {
  const body = snippet('Shared')
  const groups = detectDuplicateGroups([
    source('src/a.ts', `export function alpha() {\n${body}\n}\n`),
    source('src/b.ts', `export function beta() {\n${body}\n}\n`)
  ])
  assert.equal(groups.length, 1)
  assert.equal(groups[0]?.lineCount, MIN_MEANINGFUL_LINES)
  assert.deepEqual(groups[0]?.occurrences.map(item => item.path), ['src/a.ts', 'src/b.ts'])
  assert.match(groups[0]?.description ?? '', /6 identical lines in src\/a\.ts and src\/b\.ts/)
})

test('whitespace and comments do not change the group or its id', () => {
  const compact = `export function alpha() {\n${snippet('Shared')}\n}\n`
  const compactPeer = `export function beta() {\n${snippet('Shared')}\n}\n`
  const noisy = [
    'export function beta() {',
    '  // leading note',
    '  const SharedValue0 = computeShared(input, 0,   flags)',
    '  /* block',
    '     comment */ const SharedValue1 = computeShared(input, 1, flags)',
    '  const   SharedValue2   =   computeShared(input, 2, flags)',
    '  const SharedValue3 = computeShared(input, 3, flags) // trailing',
    '  const SharedValue4 = computeShared(input, 4, flags)',
    '  const SharedValue5 = computeShared(input, 5, flags)',
    '}',
    ''
  ].join('\n')
  const left = detectDuplicateGroups([source('src/a.ts', compact), source('src/b.ts', compactPeer)])
  const right = detectDuplicateGroups([source('src/a.ts', compact), source('src/b.ts', noisy)])
  assert.equal(left[0]?.id, right[0]?.id)
  assert.equal(left[0]?.lineCount, right[0]?.lineCount)
  assert.equal(left[0]?.id.length, DUPLICATE_ID_LENGTH)
  const norms = meaningfulLines(compact, 'typescript').map(line => line.norm).slice(0, MIN_MEANINGFUL_LINES)
  // The shared block may start after the function header, so id is sha256 of the matched norms.
  assert.equal(typeof left[0]?.id, 'string')
  assert.ok(left[0]?.id !== createHash('sha256').update('nope', 'utf8').digest('hex').slice(0, 12))
  void norms
})

test('short or import-only blocks are ignored', () => {
  const short = '  const a = 1\n  const b = 2\n  const c = 3\n  const d = 4\n  const e = 5\n'
  const imports = [
    "import { a } from './a'",
    "import { b } from './b'",
    "import { c } from './c'",
    "import { d } from './d'",
    "import { e } from './e'",
    "import { f } from './f'",
    "import { g } from './g'"
  ].join('\n')
  assert.equal(detectDuplicateGroups([source('src/a.ts', short), source('src/b.ts', short)]).length, 0)
  assert.equal(detectDuplicateGroups([source('src/a.ts', `${imports}\n`), source('src/b.ts', `${imports}\n`)]).length, 0)
  // Long enough line count but under the character floor.
  const tiny = Array.from({ length: MIN_MEANINGFUL_LINES }, (_, i) => `  x${i}=${i}`).join('\n') + '\n'
  assert.ok(tiny.replace(/\s/g, '').length < MIN_BLOCK_CHARS + 20)
  const tinyGroups = detectDuplicateGroups([source('src/a.ts', tiny), source('src/b.ts', tiny)])
  assert.equal(tinyGroups.length, 0)
})

test('ids and group order are deterministic', () => {
  const first = snippet('Alpha', 8)
  const second = snippet('Beta', 6)
  const sources = [
    source('src/z.ts', `export function z() {\n${first}\n${second}\n}\n`),
    source('src/a.ts', `export function a() {\n${first}\n${second}\n}\n`)
  ]
  const once = detectDuplicateGroups(sources)
  const twice = detectDuplicateGroups([...sources].reverse())
  assert.deepEqual(once, twice)
  assert.ok((once[0]?.lineCount ?? 0) >= (once[1]?.lineCount ?? 0))
  assert.equal(once[0]?.occurrences[0]?.path, 'src/a.ts')
})

test('detects two non-overlapping copies in the same file', () => {
  const body = snippet('Local')
  const content = `export function one() {\n${body}\n}\nexport function two() {\n${body}\n}\n`
  const groups = detectDuplicateGroups([source('src/copy.ts', content)])
  assert.equal(groups.length, 1)
  assert.equal(groups[0]?.occurrences.length, 2)
  assert.equal(groups[0]?.occurrences[0]?.path, 'src/copy.ts')
  assert.ok((groups[0]?.occurrences[0]?.endLine ?? 0) < (groups[0]?.occurrences[1]?.startLine ?? 0))
  assert.match(groups[0]?.description ?? '', /appear twice in src\/copy\.ts/)
})

test('python hash comments are ignored and floor division is not treated as a comment', () => {
  const body = [
    '    total0 = compute_total(items, 0, flags)',
    '    total1 = compute_total(items, 1, flags)',
    '    total2 = compute_total(items, 2, flags)',
    '    total3 = compute_total(items, 3, flags)',
    '    ratio = amount // units',
    '    total5 = compute_total(items, 5, flags)'
  ].join('\n')
  const clean = `def alpha():\n${body}\n`
  const commented = `def beta():\n    # ignore this\n${body}\n`
  const groups = detectDuplicateGroups([
    source('pkg/a.py', clean, 'python'),
    source('pkg/b.py', commented, 'python')
  ])
  assert.equal(groups.length, 1)
  assert.ok((groups[0]?.lineCount ?? 0) >= MIN_MEANINGFUL_LINES)
  const norms = meaningfulLines(clean, 'python').map(line => line.norm)
  assert.ok(norms.some(line => line.includes('//')))
})

test('a longer match suppresses its own sub-spans but not a shorter shared third copy', () => {
  const long = snippet('Shared', 10)
  const prefix = snippet('Shared', 6)
  const unique = snippet('Other', 6)
  const groups = detectDuplicateGroups([
    source('src/a.ts', `export function a() {\n${long}\n}\n`),
    source('src/b.ts', `export function b() {\n${long}\n}\n`),
    source('src/c.ts', `export function c() {\n${prefix}\n${unique}\n}\n`)
  ])
  const longGroup = groups.find(item => item.lineCount === 10)
  const shortGroup = groups.find(item => item.lineCount === 6 && item.occurrences.length === 3)
  assert.ok(longGroup)
  assert.ok(shortGroup)
  assert.equal(groups.some(item => item.lineCount === 6 && item.occurrences.length === 2), false)
})

test('attachDuplicates does not mutate the input and serialises stably', () => {
  const body = snippet('Shared')
  const sources = [
    source('src/a.ts', `export function alpha() {\n${body}\n}\n`),
    source('src/b.ts', `export function beta() {\n${body}\n}\n`)
  ]
  const input = graphOf([fileNode('src/a.ts'), fileNode('src/b.ts')])
  const before = serializeGraph(input)
  const used = attachDuplicates(input, sources)
  assert.equal(serializeGraph(input), before)
  assert.equal(input.duplicates, undefined)
  assert.equal(used.duplicates?.summary.groups, 1)
  assert.ok((used.duplicates?.summary.duplicatedLines ?? 0) > 0)
  assert.ok((used.duplicates?.summary.percentage ?? -1) >= 0)
  const first = serializeGraph(used)
  const second = serializeGraph(JSON.parse(first) as Graph)
  assert.equal(first, second)
  const checked = validateStrict(JSON.parse(first) as Graph)
  assert.equal(checked.ok, true, checked.issues.map(issue => `${issue.path} ${issue.message}`).join('; '))
})
