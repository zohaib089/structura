import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CANARY_GRAPH_PATH, CANARY_V140_GRAPH_PATH } from './hash.js'
import { answerGraphQuestion, isGraphLike, type GraphQaResponse } from './qa.js'
import { readGraph } from './read.js'
import type {
  ArchitectureFinding,
  FileNode,
  Graph,
  GraphEdge,
  GraphNode,
  SymbolNode
} from './types.js'

const { graph: canaryV10 } = readGraph(readFileSync(CANARY_GRAPH_PATH, 'utf8'))
const { graph: canaryV14 } = readGraph(readFileSync(CANARY_V140_GRAPH_PATH, 'utf8'))

function fileNode(path: string, options: Partial<FileNode> = {}): FileNode {
  return {
    id: `file:${path}`,
    kind: 'file',
    path,
    label: path.split('/').at(-1) ?? path,
    language: 'typescript',
    lineCount: 10,
    parse: { status: 'parsed' },
    ...options
  }
}

function directory(path: string): GraphNode {
  return {
    id: path === '.' ? 'dir:.' : `dir:${path}`,
    kind: 'directory',
    path,
    label: path === '.' ? '.' : (path.split('/').at(-1) ?? path)
  }
}

function functionSymbol(filePath: string, label: string, line = 1): SymbolNode {
  return {
    id: `sym:${filePath}#${label}`,
    kind: 'symbol',
    file: `file:${filePath}`,
    label,
    symbolKind: 'function',
    exported: true,
    span: { start: { line, col: 1 }, end: { line: line + 4, col: 2 } }
  }
}

function importEdge(from: string, to: string, line = 1): GraphEdge {
  return {
    source: `file:${from}`,
    type: 'imports',
    target: `file:${to}`,
    provenance: 'EXTRACTED',
    span: { start: { line, col: 1 }, end: { line, col: 10 } },
    specifier: `./${to}`
  }
}

function contains(source: string, target: string): GraphEdge {
  return { source, type: 'contains', target, provenance: 'EXTRACTED' }
}

function graphOf(nodes: GraphNode[], edges: GraphEdge[], extras: Partial<Graph> = {}): Graph {
  const files = nodes.filter(node => node.kind === 'file').length
  return {
    schemaVersion: '1.4.0',
    summary: { nodes: nodes.length, edges: edges.length, files },
    coverage: {
      files: { discovered: files, parsed: files, partial: 0, failed: 0, skipped: 0, ignored: 0 },
      byLanguage: [{ language: 'typescript', parsed: files, partial: 0, failed: 0, skipped: 0 }],
      skipped: [],
      failed: [],
      ignored: [],
      unresolved: [],
      accounting: { discovered: files, accounted: files }
    },
    nodes,
    edges,
    ...extras
  }
}

function chainGraph(): Graph {
  return graphOf(
    [
      directory('.'),
      directory('src'),
      fileNode('src/util.ts'),
      fileNode('src/app.ts', { docSummary: 'Application entry.' }),
      fileNode('src/entry.ts', { entryCandidate: { reason: 'package-bin', provenance: 'INFERRED' } }),
      functionSymbol('src/app.ts', 'boot', 3)
    ],
    [
      contains('dir:.', 'dir:src'),
      contains('dir:src', 'file:src/util.ts'),
      contains('dir:src', 'file:src/app.ts'),
      contains('dir:src', 'file:src/entry.ts'),
      contains('file:src/app.ts', 'sym:src/app.ts#boot'),
      importEdge('src/app.ts', 'src/util.ts', 2),
      importEdge('src/entry.ts', 'src/app.ts', 4)
    ]
  )
}

function cycleGraph(): Graph {
  const finding: ArchitectureFinding = {
    from: 'app',
    to: 'core',
    edgeKind: 'imports',
    file: 'src/a.ts',
    line: 3,
    rule: 'deny-list',
    provenance: 'EXTRACTED'
  }
  return graphOf(
    [
      directory('.'),
      directory('src'),
      fileNode('src/a.ts'),
      fileNode('src/b.ts')
    ],
    [
      contains('dir:.', 'dir:src'),
      contains('dir:src', 'file:src/a.ts'),
      contains('dir:src', 'file:src/b.ts'),
      importEdge('src/a.ts', 'src/b.ts'),
      importEdge('src/b.ts', 'src/a.ts')
    ],
    {
      architecture: {
        config: 'architecture.yml',
        modules: [],
        unassigned: [],
        findings: [finding],
        summary: { violations: 1, unassignedFiles: 0 }
      }
    }
  )
}

function richGraph(): Graph {
  return {
    ...chainGraph(),
    hotspots: [
      { path: 'src/app.ts', score: 88, why: 'Used by 1 file and imports 1 file' },
      { path: 'src/util.ts', score: 40, why: 'Impacts 2 files' }
    ],
    quality: {
      project: {
        score: 82,
        grade: 'B',
        breakdown: [
          { category: 'architecture', label: 'No architecture rule breaks', penalty: 0 },
          { category: 'cycles', label: 'No import cycles', penalty: 0 },
          { category: 'hotspots', label: '1 highly connected hotspot', penalty: 3 },
          { category: 'imports', label: 'Imports look healthy', penalty: 0 },
          { category: 'size', label: 'No oversized files', penalty: 0 }
        ],
        tips: [{ text: 'Split the busiest file', gain: 3 }]
      },
      folders: [
        {
          path: 'src',
          score: 80,
          grade: 'B',
          breakdown: [],
          tips: [{ text: 'Reduce coupling in src', gain: 4 }]
        }
      ]
    },
    duplicates: {
      summary: { groups: 1, duplicatedLines: 12, percentage: 8 },
      groups: [
        {
          id: 'abc123def456',
          lineCount: 12,
          description: '12 identical lines in src/app.ts and src/entry.ts',
          occurrences: [
            { path: 'src/app.ts', startLine: 10, endLine: 21 },
            { path: 'src/entry.ts', startLine: 4, endLine: 15 }
          ]
        }
      ]
    }
  }
}

function assertDeterministic(graph: Graph, question: string): GraphQaResponse {
  const first = answerGraphQuestion(graph, question)
  const second = answerGraphQuestion(graph, question)
  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(first), JSON.stringify(second))
  return first
}

test('isGraphLike accepts graphs and rejects incomplete values', () => {
  assert.equal(isGraphLike(canaryV10), true)
  assert.equal(isGraphLike({ nodes: [], edges: [] }), true)
  assert.equal(isGraphLike({ nodes: [] }), false)
  assert.equal(isGraphLike(null), false)
})

test('impact lists files that depend on the target', () => {
  const result = assertDeterministic(chainGraph(), 'What breaks if I change src/util.ts?')
  assert.equal(result.intent, 'impact')
  assert.match(result.answer, /src\/app\.ts/)
  assert.match(result.answer, /src\/entry\.ts/)
  assert.ok(result.citations.some(item => item.path === 'src/util.ts'))
  assert.ok(result.citations.some(item => item.path === 'src/app.ts'))
  assert.ok(result.suggestions.length > 0)
})

test('impact also matches “What depends on X?” and suffix paths', () => {
  const result = assertDeterministic(chainGraph(), 'What depends on util.ts?')
  assert.equal(result.intent, 'impact')
  assert.match(result.answer, /src\/app\.ts/)
})

test('explain summarises a file from docSummary, symbols, and imports', () => {
  const result = assertDeterministic(canaryV14, 'What does src/app.ts do?')
  assert.equal(result.intent, 'explain')
  assert.match(result.answer, /Application entry/)
  assert.match(result.answer, /src\/lib\.ts/)
  assert.ok(result.citations.some(item => item.path === 'src/app.ts' && item.kind === 'file'))
})

test('explain resolves a basename and a symbol name', () => {
  const byBase = assertDeterministic(canaryV14, 'What does app.ts import?')
  assert.equal(byBase.intent, 'explain')
  assert.match(byBase.answer, /src\/lib\.ts/)
  const bySymbol = assertDeterministic(canaryV14, 'Tell me about helper')
  assert.equal(bySymbol.intent, 'explain')
  assert.match(bySymbol.answer, /helper/)
  assert.match(bySymbol.answer, /src\/lib\.ts/)
  assert.equal(bySymbol.citations[0]?.kind, 'symbol')
})

test('hotspots lists graph.hotspots in score order', () => {
  const result = assertDeterministic(canaryV14, 'What are the riskiest files?')
  assert.equal(result.intent, 'hotspots')
  assert.match(result.answer, /src\/lib\.ts \(score 65\)/)
  assert.match(result.answer, /src\/app\.ts \(score 50\)/)
  assert.equal(result.citations[0]?.path, 'src/lib.ts')
})

test('quality reports project score, tips, and worst folders', () => {
  const healthy = assertDeterministic(richGraph(), 'How healthy is the project?')
  assert.equal(healthy.intent, 'quality')
  assert.match(healthy.answer, /82 out of 100 \(grade B\)/)
  assert.match(healthy.answer, /Split the busiest file/)
  assert.match(healthy.answer, /Worst folders: src/)
  const tips = assertDeterministic(richGraph(), 'How do I raise the score?')
  assert.equal(tips.intent, 'quality')
  assert.match(tips.answer, /Split the busiest file/)
  const folders = assertDeterministic(richGraph(), 'What are the worst folders?')
  assert.equal(folders.intent, 'quality')
  assert.match(folders.answer, /src \(80, B\)/)
})

test('duplicates lists groups with line-span citations', () => {
  const result = assertDeterministic(richGraph(), 'Where is code duplicated?')
  assert.equal(result.intent, 'duplicates')
  assert.match(result.answer, /1 duplicate group/)
  assert.match(result.answer, /12 identical lines/)
  assert.ok(result.citations.some(item => item.path === 'src/app.ts' && item.startLine === 10 && item.endLine === 21))
})

test('architecture reports import cycles and rule findings', () => {
  const result = assertDeterministic(cycleGraph(), 'Any circular imports?')
  assert.equal(result.intent, 'architecture')
  assert.match(result.answer, /src\/a\.ts → src\/b\.ts/)
  assert.match(result.answer, /deny-list/)
  const rules = assertDeterministic(cycleGraph(), 'Any architecture rule breaks?')
  assert.equal(rules.intent, 'architecture')
  assert.match(rules.answer, /src\/a\.ts:3/)
})

test('overview covers languages, folders, and entry points', () => {
  const languages = assertDeterministic(canaryV10, 'What languages does this use?')
  assert.equal(languages.intent, 'overview')
  assert.match(languages.answer, /TypeScript/)
  const start = assertDeterministic(canaryV10, 'Where does the app start?')
  assert.equal(start.intent, 'overview')
  assert.match(start.answer, /src\/app\.ts/)
})

test('fallback gives grounded example questions', () => {
  const result = assertDeterministic(richGraph(), 'blorple the wibble?')
  assert.equal(result.intent, 'fallback')
  assert.match(result.answer, /not sure how to read/)
  assert.ok(result.suggestions.includes('What are the riskiest files?'))
  assert.ok(result.suggestions.includes('How healthy is the project?'))
  assert.ok(result.suggestions.includes('Where is code duplicated?'))
  assert.ok(result.suggestions.includes('What languages does this use?'))
  const empty = assertDeterministic(richGraph(), '   ')
  assert.equal(empty.intent, 'fallback')
  assert.match(empty.answer, /Ask a question/)
})

test('older schemas without optional sections get a graceful fallback', () => {
  const hotspots = assertDeterministic(canaryV10, 'What are the riskiest files?')
  assert.equal(hotspots.intent, 'hotspots')
  assert.match(hotspots.answer, /does not include hotspot scores/)
  const quality = assertDeterministic(canaryV10, 'How healthy is the project?')
  assert.equal(quality.intent, 'quality')
  assert.match(quality.answer, /does not include quality scores/)
  const duplicates = assertDeterministic(canaryV10, 'Where is code duplicated?')
  assert.equal(duplicates.intent, 'duplicates')
  assert.match(duplicates.answer, /does not list any duplicated code/)
  const architecture = assertDeterministic(canaryV10, 'Any architecture rule breaks?')
  assert.equal(architecture.intent, 'architecture')
  assert.match(architecture.answer, /no architecture rules section/)
  assert.ok(!architecture.suggestions.includes('Where is code duplicated?'))
  assert.ok(!architecture.suggestions.includes('What are the riskiest files?'))
})

test('missing and ambiguous targets are explained politely', () => {
  const missing = assertDeterministic(canaryV14, 'What breaks if I change missing.ts?')
  assert.equal(missing.intent, 'impact')
  assert.match(missing.answer, /could not find/)
  assert.match(missing.answer, /missing\.ts/)

  const ambiguousGraph = graphOf(
    [
      directory('.'),
      directory('src'),
      fileNode('src/app.ts'),
      fileNode('src/other.ts'),
      functionSymbol('src/app.ts', 'main', 1),
      functionSymbol('src/other.ts', 'main', 2)
    ],
    [
      contains('dir:.', 'dir:src'),
      contains('dir:src', 'file:src/app.ts'),
      contains('dir:src', 'file:src/other.ts'),
      contains('file:src/app.ts', 'sym:src/app.ts#main'),
      contains('file:src/other.ts', 'sym:src/other.ts#main')
    ]
  )
  const ambiguous = assertDeterministic(ambiguousGraph, 'What does main do?')
  assert.equal(ambiguous.intent, 'explain')
  assert.match(ambiguous.answer, /more than one place/)
  assert.match(ambiguous.answer, /src\/app\.ts/)
  assert.match(ambiguous.answer, /src\/other\.ts/)
})

test('answers stay byte-identical across repeated calls and equivalent wording', () => {
  const graph = richGraph()
  const a = assertDeterministic(graph, 'What breaks if I change src/app.ts?')
  const b = answerGraphQuestion(graph, 'What breaks if I change src/app.ts???')
  assert.deepEqual(a, b)
})
