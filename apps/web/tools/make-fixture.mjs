import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * Deterministic graph.json v1 fixture generator.
 * The designer's original script emitted the section-16 guess (numeric schemaVersion,
 * edge ids, parent fields). This copy keeps the CLI shape `node tools/make-fixture.mjs <count> [out]`
 * and emits the Tech Lead v1 document so the viewer can load it.
 */
export function buildFixture(targetNodes) {
  const count = Math.max(3, targetNodes)
  const unresolvedTarget = Math.max(1, Math.floor(count * 0.02))
  const treeTarget = count - unresolvedTarget - 1
  const nodes = [{ id: 'dir:.', kind: 'directory', path: '.', label: '.' }]
  const edges = []
  const dirs = ['.']
  let cursor = 0
  while (nodes.length < treeTarget) {
    const parentPath = dirs[cursor % dirs.length]
    cursor += 1
    const parentId = parentPath === '.' ? 'dir:.' : `dir:${parentPath}`
    const depth = parentPath === '.' ? 0 : parentPath.split('/').length
    if (nodes.length % 5 === 0 && depth < 4) {
      const path = parentPath === '.' ? `d${nodes.length}` : `${parentPath}/d${nodes.length}`
      const id = `dir:${path}`
      nodes.push({ id, kind: 'directory', path, label: path.slice(path.lastIndexOf('/') + 1) })
      edges.push({ source: parentId, type: 'contains', target: id, provenance: 'EXTRACTED' })
      dirs.push(path)
    } else {
      const path = parentPath === '.' ? `f${nodes.length}.ts` : `${parentPath}/f${nodes.length}.ts`
      const id = `file:${path}`
      nodes.push({
        id,
        kind: 'file',
        path,
        label: path.slice(path.lastIndexOf('/') + 1),
        language: 'typescript',
        lineCount: 20,
        parse: { status: 'parsed' }
      })
      edges.push({ source: parentId, type: 'contains', target: id, provenance: 'EXTRACTED' })
    }
  }

  const files = nodes.filter((node) => node.kind === 'file')
  const unresolved = []
  for (let index = 0; index < unresolvedTarget && files.length > 0; index += 1) {
    const importer = files[index % files.length]
    const specifier = `./missing-${index}`
    const id = `unresolved:${importer.path}::${specifier}`
    unresolved.push({ id, kind: 'unresolved', label: specifier, reason: 'not-found' })
    edges.push({
      source: importer.id,
      type: 'imports',
      target: id,
      provenance: 'EXTRACTED',
      specifier,
      span: { start: { line: 1, col: 1 }, end: { line: 1, col: 2 } }
    })
  }
  nodes.push(...unresolved)
  nodes.push({ id: 'ext:npm:left-pad', kind: 'external', ecosystem: 'npm', label: 'left-pad' })
  if (files[0]) {
    edges.push({
      source: files[0].id,
      type: 'imports',
      target: 'ext:npm:left-pad',
      provenance: 'EXTRACTED',
      specifier: 'left-pad',
      span: { start: { line: 2, col: 1 }, end: { line: 2, col: 4 } }
    })
  }
  for (let index = 0; index < files.length; index += 1) {
    const target = files[(index + 1) % files.length]
    if (!target || target.id === files[index].id) continue
    const inferred = index % 10 === 0
    const edge = {
      source: files[index].id,
      type: 'imports',
      target: target.id,
      provenance: inferred ? 'INFERRED' : 'EXTRACTED',
      specifier: `./${target.label}`,
      span: { start: { line: 3, col: 1 }, end: { line: 3, col: 4 } }
    }
    if (inferred) {
      edge.confidence = 0.5
      edge.reason = 'src-subpath'
    }
    const importKind = ['static', 'dynamic', 'require'][index % 3]
    if (importKind !== 'static') edge.importKind = importKind
    if (index % 7 === 0) edge.typeOnly = true
    edges.push(edge)
  }

  nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  edges.sort((a, b) => {
    const left = edgeSortKey(a)
    const right = edgeSortKey(b)
    return left < right ? -1 : left > right ? 1 : 0
  })
  const fileCount = nodes.filter((node) => node.kind === 'file').length
  const skipped = Math.max(0, Math.round(fileCount * 0.05))
  const discovered = fileCount + skipped
  return {
    schemaVersion: '1.0.0',
    summary: { nodes: nodes.length, edges: edges.length, files: fileCount },
    coverage: {
      files: { discovered, parsed: fileCount, partial: 0, failed: 0, skipped, ignored: 0 },
      byLanguage: [{ language: 'typescript', parsed: fileCount, partial: 0, failed: 0, skipped: 0 }],
      skipped: skipped ? [{ reason: 'unsupported-language', count: skipped }] : [],
      ignored: [],
      unresolved: unresolved.length ? [{ reason: 'not-found', count: unresolved.length }] : [],
      accounting: { discovered, accounted: discovered }
    },
    nodes,
    edges
  }
}

function edgeSortKey(edge) {
  const line = edge.span?.start.line ?? 0
  const col = edge.span?.start.col ?? 0
  return `${edge.source}\u0000${edge.type}\u0000${edge.target}\u0000${line}\u0000${col}`
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  const count = Number(process.argv[2] ?? 5000)
  const out = process.argv[3]
  const json = JSON.stringify(buildFixture(count))
  if (out) writeFileSync(out, json)
  else process.stdout.write(json)
}
