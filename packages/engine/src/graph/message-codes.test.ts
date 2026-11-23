import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { attachDuplicates } from './duplicates.js'
import { attachHotspots } from './hotspots.js'
import { attachQuality } from './quality.js'
import { answerGraphQuestion } from './qa.js'
import {
  MESSAGE_CODES,
  graphEmitsMessageCodes,
  isMessageCode,
  messageFields,
  type MessageCodeId
} from './message-codes.js'
import type { FileNode, Graph, GraphEdge, GraphNode } from './types.js'

const DOC_PATH = fileURLToPath(new URL('../../../../docs/message-codes.md', import.meta.url))

function fileNode(path: string, lines = 4): FileNode {
  return {
    id: `file:${path}`,
    kind: 'file',
    path,
    label: path.slice(path.lastIndexOf('/') + 1),
    language: 'typescript',
    lineCount: lines,
    parse: { status: 'parsed' }
  }
}

function baseGraph(files: FileNode[], edges: GraphEdge[], extras: GraphNode[] = [], version = '1.7.0'): Graph {
  const nodes: GraphNode[] = [
    { id: 'dir:.', kind: 'directory', path: '.', label: '.' },
    ...files,
    ...extras
  ]
  const allEdges: GraphEdge[] = [
    ...files.map(file => ({
      source: 'dir:.',
      type: 'contains' as const,
      target: file.id,
      provenance: 'EXTRACTED' as const
    })),
    ...edges
  ]
  return {
    schemaVersion: version,
    summary: { nodes: nodes.length, edges: allEdges.length, files: files.length },
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
    edges: allEdges
  }
}

function importEdge(from: string, to: string): GraphEdge {
  return {
    source: `file:${from}`,
    type: 'imports',
    target: `file:${to}`,
    provenance: 'EXTRACTED',
    span: { start: { line: 1, col: 1 }, end: { line: 1, col: 20 } },
    specifier: `./${to}`
  }
}

describe('message code catalog', () => {
  test('docs/message-codes.md documents every emitted code', () => {
    const doc = readFileSync(DOC_PATH, 'utf8')
    const missing = MESSAGE_CODES.filter(code => !doc.includes(`\`${code}\``))
    assert.deepEqual(missing, [], `undocumented codes: ${missing.join(', ')}`)
  })

  test('messageFields omits empty params and sorts keys', () => {
    assert.deepEqual(messageFields('quality.cycles'), { code: 'quality.cycles' })
    assert.deepEqual(messageFields('quality.cycles', { count: 2, extra: 'x' }), {
      code: 'quality.cycles',
      params: { count: 2, extra: 'x' }
    })
    assert.deepEqual(Object.keys(messageFields('quality.size', { largeFunctions: 1, largeFiles: 2 }).params ?? {}), [
      'largeFiles',
      'largeFunctions'
    ])
    assert.equal(isMessageCode('quality.cycles'), true)
    assert.equal(isMessageCode('not.a.real-code'), false)
    assert.equal(graphEmitsMessageCodes('1.7.0'), true)
    assert.equal(graphEmitsMessageCodes('1.6.0'), false)
    assert.equal(graphEmitsMessageCodes('1.8.0'), true)
  })
})

describe('emitted graph codes', () => {
  test('quality, hotspots, and duplicates on 1.7.0 carry catalog codes and keep English', () => {
    const files = [fileNode('a.ts', 4), fileNode('b.ts', 4)]
    const cycled = baseGraph(files, [importEdge('a.ts', 'b.ts'), importEdge('b.ts', 'a.ts')])
    const quality = attachQuality(cycled)
    const cycles = quality.quality?.project.breakdown.find(item => item.category === 'cycles')
    assert.equal(cycles?.label, '1 import cycle')
    assert.equal(cycles?.code, 'quality.cycles')
    assert.deepEqual(cycles?.params, { count: 1 })
    const clean = quality.quality?.project.breakdown.find(item => item.category === 'architecture')
    assert.equal(clean?.code, 'quality.architecture')
    const tip = quality.quality?.project.tips.find(item => item.code === 'quality.tip.cycle')
    assert.ok(tip)
    assert.match(tip!.text, /Break the cycle/)
    assert.equal(typeof tip!.gain, 'number')
    assert.ok(tip!.params && 'files' in tip!.params)

    const hot = attachHotspots(cycled)
    const why = hot.hotspots?.[0]
    assert.ok(why)
    assert.equal(why.code, 'hotspot.why')
    assert.ok(why.why.length > 0)
    assert.ok(why.params)

    const source = 'const value = 1\nconst other = 2\nconst third = 3\nconst fourth = 4\nconst fifth = 5\nconst sixth = 6\n'
    const withDup = attachDuplicates(
      { ...cycled, schemaVersion: '1.7.0' },
      [
        { path: 'a.ts', content: source, language: 'typescript' },
        { path: 'b.ts', content: source, language: 'typescript' }
      ]
    )
    const group = withDup.duplicates?.groups[0]
    assert.ok(group)
    assert.ok(group.description.includes('identical'))
    assert.ok(group.code && MESSAGE_CODES.includes(group.code as MessageCodeId))
    assert.ok(group.params)
  })

  test('older graph.json minors omit code and params', () => {
    const graph = baseGraph([fileNode('a.ts'), fileNode('b.ts')], [importEdge('a.ts', 'b.ts'), importEdge('b.ts', 'a.ts')], [], '1.6.0')
    const quality = attachQuality(graph)
    for (const item of quality.quality?.project.breakdown ?? []) {
      assert.equal(item.code, undefined)
      assert.equal(item.params, undefined)
    }
    for (const tip of quality.quality?.project.tips ?? []) {
      assert.equal(tip.code, undefined)
    }
    const hot = attachHotspots(graph)
    for (const item of hot.hotspots ?? []) {
      assert.equal(item.code, undefined)
    }
  })
})

describe('emitted Q&A codes', () => {
  const files = [fileNode('src/app.ts', 8), fileNode('src/lib.ts', 4)]
  const graph = attachQuality(
    attachHotspots(
      baseGraph(files, [importEdge('src/app.ts', 'src/lib.ts')])
    )
  )

  test('each asked intent returns a documented code', () => {
    const questions = [
      'What breaks if I change src/lib.ts?',
      'What does src/app.ts do?',
      'What are the riskiest files?',
      'How healthy is the project?',
      'Where is code duplicated?',
      'Any circular imports?',
      'What languages does this use?',
      'asdfgh',
      ''
    ]
    for (const question of questions) {
      const result = answerGraphQuestion(graph, question)
      assert.ok(result.answer.length > 0, question)
      assert.ok(result.code && isMessageCode(result.code), `${question} -> ${result.code}`)
      assert.equal(MESSAGE_CODES.includes(result.code as MessageCodeId), true, result.code)
    }
  })
})
