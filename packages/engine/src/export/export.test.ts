import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { exportGraph, readGraph } from '../index.js'

const here = dirname(fileURLToPath(import.meta.url))
const snapshots = join(here, 'snapshots')
const canaryPath = join(here, '../../schema-fixtures/v1.0.0.graph.json')

function snapshot(name: string): string {
  return readFileSync(join(snapshots, name), 'utf8')
}

function loadCanary() {
  return readGraph(readFileSync(canaryPath, 'utf8')).graph
}

function obsidianSnapshot(graph: ReturnType<typeof loadCanary>): string {
  const notes = exportGraph(graph, 'obsidian').notes
  return notes.map(note => `## ${note.path}\n${note.content}`).join('\n')
}

test('export canary snapshots', () => {
  const graph = loadCanary()
  assert.equal(exportGraph(graph, 'mermaid').text, snapshot('canary.mermaid.txt'))
  assert.equal(exportGraph(graph, 'structurizr').text, snapshot('canary.structurizr.txt'))
  assert.equal(exportGraph(graph, 'likec4').text, snapshot('canary.likec4.txt'))
  assert.equal(exportGraph(graph, 'svg').text, snapshot('canary.svg.txt'))
  assert.equal(obsidianSnapshot(graph), snapshot('canary.obsidian.txt'))
})

test('exportGraph rejects unknown format at runtime', () => {
  const graph = loadCanary()
  assert.throws(() => exportGraph(graph, 'pdf' as 'mermaid'), /unsupported export format/)
})
