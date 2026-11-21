import { describe, expect, it } from 'vitest'
import { indexGraph } from '../../src/viewer/overview'
import { defaultFilters, emptyViewState, setFolderOverview, setNucleus } from '../../src/viewer/overview'
import { restorePreservedView } from '../../src/viewer/preserve-view'
import type { GraphDocument } from '../../src/viewer/graph-types'

function projectGraph(): GraphDocument {
  return {
    schemaVersion: '1.0.0',
    summary: { nodes: 4, edges: 3 },
    coverage: {},
    nodes: [
      { id: 'dir:.', kind: 'directory', path: '.', label: '.' },
      { id: 'dir:apps', kind: 'directory', path: 'apps', label: 'apps' },
      { id: 'file:apps/web/main.ts', kind: 'file', path: 'apps/web/main.ts', label: 'main.ts', language: 'typescript' },
      { id: 'file:README.md', kind: 'file', path: 'README.md', label: 'README.md', language: 'markdown' }
    ],
    edges: [
      { source: 'dir:.', target: 'dir:apps', type: 'contains', provenance: 'EXTRACTED' },
      { source: 'dir:apps', target: 'file:apps/web/main.ts', type: 'contains', provenance: 'EXTRACTED' },
      { source: 'dir:.', target: 'file:README.md', type: 'contains', provenance: 'EXTRACTED' }
    ]
  } as unknown as GraphDocument
}

describe('restorePreservedView', () => {
  it('keeps Linear layout, a drilled folder, the selection and the zoom', () => {
    const indexed = indexGraph(projectGraph())
    const base = setFolderOverview(emptyViewState(), 'dir:.')
    const preserved = {
      viewState: { ...setNucleus(base, 'dir:apps'), layout: 'linear' as const, expanded: ['dir:apps', 'gone'] },
      filters: defaultFilters(),
      selection: { kind: 'node' as const, id: 'dir:apps' },
      focus: null,
      viewport: { x: 40, y: -12, zoom: 0.72 }
    }
    const restored = restorePreservedView(preserved, indexed, base)
    expect(restored.viewState.layout).toBe('linear')
    expect(restored.viewState.nucleusId).toBe('dir:apps')
    expect(restored.viewState.expanded).toEqual(['dir:apps'])
    expect(restored.selection).toEqual({ kind: 'node', id: 'dir:apps' })
    expect(restored.viewport).toEqual({ x: 40, y: -12, zoom: 0.72 })
  })

  it('drops a selection whose node is no longer in the graph and falls back to the default centre', () => {
    const indexed = indexGraph(projectGraph())
    const base = setFolderOverview(emptyViewState(), 'dir:.')
    const restored = restorePreservedView(
      {
        viewState: { ...emptyViewState(), layout: 'radial', nucleusId: 'dir:removed' },
        filters: defaultFilters(),
        selection: { kind: 'node', id: 'file:deleted.ts' },
        focus: { nodeId: 'file:deleted.ts', direction: 'out', depth: 1, confirmedOnly: false },
        viewport: null
      },
      indexed,
      base
    )
    expect(restored.viewState.nucleusId).toBe('dir:.')
    expect(restored.selection).toBeNull()
    expect(restored.focus).toBeNull()
  })
})
