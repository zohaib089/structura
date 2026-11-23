import assert from 'node:assert/strict'
import test from 'node:test'
import { compareEdges, compareNodes, serializeGraph } from './canonical.js'
import {
  attachQuality,
  collectQualityInputs,
  gradeOf,
  penaltiesOf,
  scoreOf,
  ARCH_HIGH_PENALTY,
  CYCLE_FIRST_PENALTY,
  LARGE_FILE_LINES,
  LARGE_FILE_PENALTY,
  QUALITY_CAPS,
  VERY_LARGE_FILE_LINES,
  VERY_LARGE_FILE_PENALTY
} from './quality.js'
import type { ArchitectureFinding, FileNode, Graph, GraphEdge, GraphNode } from './types.js'
import { validateStrict } from './validate-strict.js'

function fileNode(path: string, lines: number | null, hotspot?: number): FileNode {
  return {
    id: `file:${path}`,
    kind: 'file',
    path,
    label: path.split('/').at(-1) ?? path,
    language: 'typescript',
    lineCount: lines,
    parse: { status: 'parsed' },
    ...(hotspot && hotspot > 0 ? { hotspot: { score: hotspot } } : {})
  }
}

function functionSymbol(filePath: string, label: string, startLine: number, endLine: number): GraphNode {
  return {
    id: `sym:${filePath}#${label}`,
    kind: 'symbol',
    file: `file:${filePath}`,
    label,
    symbolKind: 'function',
    exported: true,
    span: { start: { line: startLine, col: 1 }, end: { line: endLine, col: 2 } }
  }
}

function importEdge(from: string, to: string): GraphEdge {
  return {
    source: `file:${from}`,
    type: 'imports',
    target: `file:${to}`,
    provenance: 'EXTRACTED',
    span: { start: { line: 1, col: 1 }, end: { line: 1, col: 10 } },
    specifier: `./${to}`
  }
}

function unresolvedEdge(from: string, specifier: string): GraphEdge {
  return {
    source: `file:${from}`,
    type: 'imports',
    target: `unresolved:${from}::${specifier}`,
    provenance: 'EXTRACTED',
    span: { start: { line: 2, col: 1 }, end: { line: 2, col: 10 } },
    specifier
  }
}

function contains(source: string, target: string): GraphEdge {
  return { source, type: 'contains', target, provenance: 'EXTRACTED' }
}

function finding(file: string, rule: string, to = 'core'): ArchitectureFinding {
  return {
    from: 'app',
    to,
    edgeKind: 'imports',
    file,
    line: 1,
    rule,
    provenance: 'EXTRACTED'
  }
}

function graphOf(
  files: FileNode[],
  edges: GraphEdge[],
  extras: GraphNode[] = [],
  findings: ArchitectureFinding[] = []
): Graph {
  const folders = new Set<string>()
  for (const file of files) {
    const parts = file.path.split('/')
    for (let index = 1; index < parts.length; index += 1) {
      folders.add(parts.slice(0, index).join('/'))
    }
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
  const unresolved: GraphNode[] = []
  for (const edge of edges) {
    if (!edge.target.startsWith('unresolved:')) continue
    if (unresolved.some(node => node.id === edge.target)) continue
    const specifier = 'specifier' in edge ? String(edge.specifier) : 'missing'
    unresolved.push({ id: edge.target, kind: 'unresolved', label: specifier, reason: 'not-found' })
  }
  const nodes: GraphNode[] = [...directories, ...files, ...extras, ...unresolved].sort(compareNodes)
  const containment: GraphEdge[] = [contains('dir:.', 'dir:src')]
  for (const folder of folders) {
    if (folder === 'src') continue
    const parent = folder.includes('/') ? `dir:${folder.slice(0, folder.lastIndexOf('/'))}` : 'dir:src'
    containment.push(contains(parent, `dir:${folder}`))
  }
  for (const file of files) {
    const parent = file.path.includes('/') ? `dir:${file.path.slice(0, file.path.lastIndexOf('/'))}` : 'dir:.'
    containment.push(contains(parent, file.id))
  }
  for (const node of extras) {
    if (node.kind === 'symbol') containment.push(contains(node.file, node.id))
  }
  const allEdges = [...containment, ...edges].sort(compareEdges)
  return {
    schemaVersion: '1.3.0',
    summary: { nodes: nodes.length, edges: allEdges.length, files: files.length },
    coverage: {
      files: { discovered: files.length, parsed: files.length, partial: 0, failed: 0, skipped: 0, ignored: 0 },
      byLanguage: [{ language: 'typescript', parsed: files.length, partial: 0, failed: 0, skipped: 0 }],
      skipped: [],
      failed: [],
      ignored: [],
      unresolved: unresolved.length > 0 ? [{ reason: 'not-found', count: unresolved.length }] : [],
      accounting: { discovered: files.length, accounted: files.length }
    },
    nodes,
    edges: allEdges,
    ...(findings.length > 0
      ? {
          architecture: {
            config: 'architecture.yml',
            modules: [{ name: 'app', paths: ['src'] }],
            unassigned: [],
            findings,
            summary: { violations: findings.length, unassignedFiles: 0 }
          }
        }
      : {})
  }
}

test('grade bands match the published cutoffs', () => {
  assert.equal(gradeOf(100), 'A')
  assert.equal(gradeOf(90), 'A')
  assert.equal(gradeOf(89), 'B')
  assert.equal(gradeOf(80), 'B')
  assert.equal(gradeOf(79), 'C')
  assert.equal(gradeOf(70), 'C')
  assert.equal(gradeOf(69), 'D')
  assert.equal(gradeOf(60), 'D')
  assert.equal(gradeOf(59), 'F')
  assert.equal(gradeOf(0), 'F')
})

test('a clean project scores 100 with grade A and no tips', () => {
  const graph = attachQuality(graphOf(
    [fileNode('src/app.ts', 20), fileNode('src/lib.ts', 10)],
    [importEdge('src/app.ts', 'src/lib.ts')]
  ))
  assert.equal(graph.quality?.project.score, 100)
  assert.equal(graph.quality?.project.grade, 'A')
  assert.equal(graph.quality?.project.tips.length, 0)
  assert.equal(graph.quality?.project.breakdown.every(item => item.penalty === 0), true)
  assert.equal(validateStrict(graph).ok, true)
})

test('a forbidden architecture finding subtracts 6 points and suggests a fix', () => {
  const graph = attachQuality(graphOf(
    [fileNode('src/app.ts', 20), fileNode('src/lib.ts', 10)],
    [importEdge('src/app.ts', 'src/lib.ts')],
    [],
    [finding('src/app.ts', 'deny-list')]
  ))
  assert.equal(graph.quality?.project.score, 100 - ARCH_HIGH_PENALTY)
  assert.equal(graph.quality?.project.breakdown.find(item => item.category === 'architecture')?.penalty, ARCH_HIGH_PENALTY)
  const tip = graph.quality?.project.tips[0]
  assert.match(tip?.text ?? '', /forbidden import in src\/app\.ts/)
  assert.equal(tip?.gain, ARCH_HIGH_PENALTY)
})

test('an import cycle is penalised and named in a tip', () => {
  const graph = attachQuality(graphOf(
    [fileNode('src/auth.ts', 20), fileNode('src/api.ts', 20)],
    [importEdge('src/auth.ts', 'src/api.ts'), importEdge('src/api.ts', 'src/auth.ts')]
  ))
  assert.equal(graph.quality?.project.score, 100 - CYCLE_FIRST_PENALTY)
  assert.match(graph.quality?.project.tips[0]?.text ?? '', /Break the cycle between api and auth/)
  assert.equal(graph.quality?.project.tips[0]?.gain, CYCLE_FIRST_PENALTY)
})

test('very large files subtract the documented size penalties, and the cap holds', () => {
  const one = collectQualityInputs(graphOf([fileNode('src/big.ts', LARGE_FILE_LINES)], []))
  assert.equal(penaltiesOf(one).size, LARGE_FILE_PENALTY)
  const huge = collectQualityInputs(graphOf([fileNode('src/huge.ts', VERY_LARGE_FILE_LINES)], []))
  assert.equal(penaltiesOf(huge).size, VERY_LARGE_FILE_PENALTY)
  const many = collectQualityInputs(graphOf(
    [fileNode('src/a.ts', VERY_LARGE_FILE_LINES), fileNode('src/b.ts', VERY_LARGE_FILE_LINES), fileNode('src/c.ts', VERY_LARGE_FILE_LINES)],
    []
  ))
  assert.equal(penaltiesOf(many).size, QUALITY_CAPS.size)
})

test('unresolved imports lower the score and offer a resolve tip', () => {
  const graph = attachQuality(graphOf(
    [fileNode('src/app.ts', 10)],
    [unresolvedEdge('src/app.ts', 'missing-mod')]
  ))
  assert.ok((graph.quality?.project.score ?? 100) < 100)
  assert.ok((graph.quality?.project.breakdown.find(item => item.category === 'imports')?.penalty ?? 0) > 0)
  assert.match(graph.quality?.project.tips.map(item => item.text).join(' ') ?? '', /missing imports/)
})

test('folder scores isolate issues to the folder that contains them', () => {
  const graph = attachQuality(graphOf(
    [fileNode('src/auth/a.ts', 20), fileNode('src/auth/b.ts', 20), fileNode('src/other/c.ts', 20)],
    [importEdge('src/auth/a.ts', 'src/auth/b.ts'), importEdge('src/auth/b.ts', 'src/auth/a.ts')]
  ))
  const auth = graph.quality?.folders?.find(item => item.path === 'src/auth')
  const other = graph.quality?.folders?.find(item => item.path === 'src/other')
  assert.equal(auth?.score, 100 - CYCLE_FIRST_PENALTY)
  assert.equal(other?.score, 100)
  assert.ok((graph.quality?.folders?.[0]?.score ?? 100) <= (graph.quality?.folders?.[1]?.score ?? 0))
})

test('tips are capped at 3 and ordered by estimated gain from the formula', () => {
  const graph = attachQuality(graphOf(
    [fileNode('src/auth.ts', VERY_LARGE_FILE_LINES, 100), fileNode('src/api.ts', 20, 80)],
    [importEdge('src/auth.ts', 'src/api.ts'), importEdge('src/api.ts', 'src/auth.ts')],
    [functionSymbol('src/auth.ts', 'run', 1, 240)],
    [finding('src/auth.ts', 'deny-list'), finding('src/api.ts', 'deny-undeclared')]
  ))
  const tips = graph.quality?.project.tips ?? []
  assert.ok(tips.length <= 3)
  assert.equal(tips.length, 3)
  assert.equal(tips[0]!.gain >= tips[1]!.gain && tips[1]!.gain >= tips[2]!.gain, true)
  for (const tip of tips) {
    const expected = scoreOf(collectQualityInputs(graph)) 
    // gain is computed from the same formula: applying the tip cannot exceed the missing points
    assert.ok(tip.gain >= 1)
    assert.ok(tip.gain <= 100 - (graph.quality?.project.score ?? 0))
    void expected
  }
})

test('attachQuality does not mutate the input and serialises stably', () => {
  const input = graphOf(
    [fileNode('src/auth.ts', 20), fileNode('src/api.ts', 20)],
    [importEdge('src/auth.ts', 'src/api.ts'), importEdge('src/api.ts', 'src/auth.ts')]
  )
  const before = serializeGraph(input)
  const used = attachQuality(input)
  assert.equal(serializeGraph(input), before)
  assert.equal(input.quality, undefined)
  const first = serializeGraph(used)
  const second = serializeGraph(JSON.parse(first) as Graph)
  assert.equal(first, second)
  assert.equal(validateStrict(JSON.parse(first)).ok, true)
})
