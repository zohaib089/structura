import assert from 'node:assert/strict'
import test from 'node:test'
import { attachHotspots, describeHotspot, type FileHotspotSignals } from './hotspots.js'
import { compareEdges, compareNodes, serializeGraph } from './canonical.js'
import { validateStrict } from './validate-strict.js'
import type { ArchitectureFinding, FileNode, Graph, GraphEdge, GraphNode } from './types.js'

function fileNode(path: string, lines: number | null): FileNode {
  return {
    id: `file:${path}`,
    kind: 'file',
    path,
    label: path.split('/').at(-1) ?? path,
    language: 'typescript',
    lineCount: lines,
    parse: { status: 'parsed' }
  }
}

function functionSymbol(filePath: string, label: string): GraphNode {
  return {
    id: `sym:${filePath}#${label}`,
    kind: 'symbol',
    file: `file:${filePath}`,
    label,
    symbolKind: 'function',
    exported: true,
    span: { start: { line: 1, col: 1 }, end: { line: 2, col: 2 } }
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

function contains(source: string, target: string): GraphEdge {
  return { source, type: 'contains', target, provenance: 'EXTRACTED' }
}

function graphOf(files: FileNode[], edges: GraphEdge[], extras: GraphNode[] = [], findings: ArchitectureFinding[] = []): Graph {
  const directories: GraphNode[] = [
    { id: 'dir:.', kind: 'directory', path: '.', label: '.' },
    { id: 'dir:src', kind: 'directory', path: 'src', label: 'src' }
  ]
  const nodes: GraphNode[] = [...directories, ...files, ...extras].sort(compareNodes)
  const containment: GraphEdge[] = [
    contains('dir:.', 'dir:src'),
    ...files.map(file => contains('dir:src', file.id)),
    ...extras.filter(node => node.kind === 'symbol').map(node => contains(node.file, node.id))
  ]
  const allEdges = [...containment, ...edges].sort(compareEdges)
  return {
    schemaVersion: '1.2.0',
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

test('describeHotspot lists non-zero signals in plain English', () => {
  const signals: FileHotspotSignals = {
    fanIn: 42,
    fanOut: 0,
    impact: 42,
    findings: 3,
    size: 0,
    sizeKind: 'none'
  }
  assert.equal(describeHotspot(signals), 'Used by 42 files, impacts 42 files, and has 3 findings')
  assert.equal(
    describeHotspot({ fanIn: 1, fanOut: 0, impact: 0, findings: 0, size: 0, sizeKind: 'none' }),
    'Used by 1 file'
  )
})

test('scores a heavily imported file higher than a leaf, and ranks ties by path', () => {
  const core = fileNode('src/core.ts', 20)
  const leafA = fileNode('src/a.ts', 4)
  const leafB = fileNode('src/b.ts', 4)
  const used = attachHotspots(graphOf(
    [core, leafA, leafB],
    [importEdge('src/a.ts', 'src/core.ts'), importEdge('src/b.ts', 'src/core.ts')],
    [functionSymbol('src/core.ts', 'run')]
  ))

  const coreNode = used.nodes.find(node => node.id === 'file:src/core.ts')
  const leafNode = used.nodes.find(node => node.id === 'file:src/a.ts')
  if (!coreNode || coreNode.kind !== 'file' || !leafNode || leafNode.kind !== 'file') {
    throw new Error('missing file nodes')
  }
  assert.ok((coreNode.hotspot?.score ?? 0) > (leafNode.hotspot?.score ?? 0))
  assert.equal(used.hotspots?.[0]?.path, 'src/core.ts')
  assert.match(used.hotspots?.[0]?.why ?? '', /Used by 2 files/)
  assert.equal(validateStrict(used).ok, true)

  const same = attachHotspots(graphOf([leafA, leafB], []))
  assert.deepEqual(same.hotspots?.map(item => item.path), ['src/a.ts', 'src/b.ts'])
})

test('includes architecture findings and function counts in the score and why', () => {
  const findings: ArchitectureFinding[] = [
    {
      from: 'app',
      to: 'app',
      edgeKind: 'imports',
      file: 'src/core.ts',
      line: 1,
      rule: 'no-cycles',
      provenance: 'EXTRACTED'
    },
    {
      from: 'app',
      to: 'app',
      edgeKind: 'imports',
      file: 'src/core.ts',
      line: 2,
      rule: 'no-cycles',
      provenance: 'EXTRACTED'
    }
  ]
  const used = attachHotspots(graphOf(
    [fileNode('src/core.ts', 10), fileNode('src/leaf.ts', 10)],
    [importEdge('src/leaf.ts', 'src/core.ts')],
    [functionSymbol('src/core.ts', 'alpha'), functionSymbol('src/core.ts', 'beta')],
    findings
  ))
  const why = used.hotspots?.find(item => item.path === 'src/core.ts')?.why ?? ''
  assert.match(why, /has 2 findings/)
  assert.match(why, /has 2 functions/)
  assert.ok((used.nodes.find(node => node.id === 'file:src/core.ts') as FileNode).hotspot?.score ?? 0 > 0)
})

test('omits zero scores, caps the list at 10, and is byte-stable', () => {
  // lineCount null and no functions or import edges → score 0, no hotspot field or list
  const empty = attachHotspots(graphOf([fileNode('src/only.ts', null)], []))
  const emptyFile = empty.nodes.find(node => node.id === 'file:src/only.ts')
  if (!emptyFile || emptyFile.kind !== 'file') throw new Error('missing file')
  assert.equal(emptyFile.hotspot, undefined)
  assert.equal(empty.hotspots, undefined)

  const files = Array.from({ length: 12 }, (_, index) => {
    const n = String(index + 1).padStart(2, '0')
    return fileNode(`src/f${n}.ts`, 2)
  })
  const edges = files.slice(1).map(file => importEdge(file.path, 'src/f01.ts'))
  const many = attachHotspots(graphOf(files, edges))
  assert.equal(many.hotspots?.length, 10)
  assert.equal(many.hotspots?.[0]?.path, 'src/f01.ts')

  const first = serializeGraph(many)
  const second = serializeGraph(JSON.parse(first) as Graph)
  assert.equal(first, second)
  assert.equal(validateStrict(JSON.parse(first)).ok, true)
})
