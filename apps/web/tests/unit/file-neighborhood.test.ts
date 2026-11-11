import { describe, expect, it } from 'vitest'
import {
  FILE_NEIGHBORHOOD_GROUP_THRESHOLD,
  collectNeighborhoodSides,
  fileNeighborhoodTree,
  isNeighborhoodGroupId,
  packNeighborhoodSide
} from '../../src/viewer/file-neighborhood'
import {
  buildOverview,
  defaultFilters,
  emptyViewState,
  expandView,
  setFileNeighborhood,
  setNucleus
} from '../../src/viewer/overview'
import { indexGraph } from '../../src/viewer/overview'
import { readGraph } from '../../src/viewer/read-graph'

function fileNode(path: string) {
  return {
    id: `file:${path}`,
    kind: 'file' as const,
    path,
    label: path.split('/').pop() ?? path,
    language: 'typescript',
    lineCount: 2,
    parse: { status: 'parsed' as const }
  }
}

function loadBusy() {
  const nucleus = fileNode('src/app.ts')
  const uses = [
    ...Array.from({ length: 9 }, (_, i) => fileNode(`src/viewer/v${i}.ts`)),
    ...Array.from({ length: 6 }, (_, i) => fileNode(`src/components/c${i}.ts`))
  ]
  const usedBy = [fileNode('src/main.ts'), fileNode('src/app.test.ts'), fileNode('src/views/page.ts')]
  const nodes: unknown[] = [nucleus, ...uses, ...usedBy]
  const edges: unknown[] = [
    ...uses.map((file, i) => ({
      source: nucleus.id,
      type: 'imports',
      target: file.id,
      provenance: 'EXTRACTED',
      specifier: `./${file.path}`,
      span: { start: { line: 1, col: 1 }, end: { line: 1, col: 8 } }
    })),
    ...usedBy.map((file) => ({
      source: file.id,
      type: 'imports',
      target: nucleus.id,
      provenance: 'EXTRACTED',
      specifier: './app',
      span: { start: { line: 1, col: 1 }, end: { line: 1, col: 8 } }
    }))
  ]
  const text = JSON.stringify({
    schemaVersion: '1.0.0',
    summary: { nodes: nodes.length, edges: edges.length, files: nodes.length },
    coverage: {
      files: { discovered: nodes.length, parsed: nodes.length, partial: 0, failed: 0, skipped: 0, ignored: 0 },
      byLanguage: [{ language: 'typescript', parsed: nodes.length, partial: 0, failed: 0, skipped: 0 }],
      skipped: [],
      ignored: [],
      unresolved: [],
      accounting: { discovered: nodes.length, accounted: nodes.length }
    },
    nodes,
    edges
  })
  const result = readGraph(text)
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return { index: indexGraph(result.graph), nucleusId: nucleus.id, uses, usedBy }
}

describe('file neighbourhood split and grouping', () => {
  it('collects uses and used-by sides from the nucleus', () => {
    const { index, nucleusId, uses, usedBy } = loadBusy()
    const sides = collectNeighborhoodSides(index, nucleusId)
    expect(sides.uses).toHaveLength(uses.length)
    expect(sides.usedBy).toHaveLength(usedBy.length)
    expect(sides.uses.every((id) => id.startsWith('file:src/viewer/') || id.startsWith('file:src/components/'))).toBe(true)
  })

  it(`groups a side with more than ${FILE_NEIGHBORHOOD_GROUP_THRESHOLD} neighbours by folder`, () => {
    const { index, uses } = loadBusy()
    const packed = packNeighborhoodSide(index, uses.map((file) => file.id), 'uses')
    expect(packed.ring1).toHaveLength(2)
    expect(packed.ring1.every(isNeighborhoodGroupId)).toBe(true)
    const labels = [...packed.groups.values()].map((group) => group.label).sort()
    expect(labels).toEqual(['6 files', '9 files'])
    const folders = [...packed.groups.values()].map((group) => group.folderLabel).sort()
    expect(folders).toEqual(['components', 'viewer'])
  })

  it('leaves a side of 12 or fewer neighbours ungrouped', () => {
    const { index, usedBy } = loadBusy()
    const packed = packNeighborhoodSide(index, usedBy.map((file) => file.id), 'usedBy')
    expect(packed.groups.size).toBe(0)
    expect(packed.ring1).toHaveLength(3)
  })

  it('places uses on the right half and used-by on the left, with half-ring captions', () => {
    const { index, nucleusId } = loadBusy()
    const view = buildOverview(index, setFileNeighborhood(emptyViewState(), nucleusId), defaultFilters())
    expect(view.halfCaptions).toEqual([
      expect.objectContaining({ side: 'uses', title: 'Uses', count: 15 }),
      expect.objectContaining({ side: 'usedBy', title: 'Used by', count: 3 })
    ])
    const usesNodes = view.nodes.filter((node) => node.depth === 1 && (node.path.startsWith('src/viewer') || node.path.startsWith('src/components') || node.roleCaption === 'viewer' || node.roleCaption === 'components'))
    const usedByNodes = view.nodes.filter((node) => node.depth === 1 && (node.path === 'src/main.ts' || node.path === 'src/app.test.ts' || node.path === 'src/views/page.ts'))
    expect(usesNodes).toHaveLength(2)
    expect(usedByNodes).toHaveLength(3)
    for (const node of usesNodes) {
      const at = view.positions.get(node.id)!
      expect(at.x).toBeGreaterThan(0)
    }
    for (const node of usedByNodes) {
      const at = view.positions.get(node.id)!
      expect(at.x).toBeLessThan(0)
    }
    expect(view.nodes.filter((node) => node.depth === 1)).toHaveLength(5)
  })

  it('expands a folder group to reveal its files on the same half', () => {
    const { index, nucleusId } = loadBusy()
    const closed = fileNeighborhoodTree(index, nucleusId, new Set())
    const viewerGroup = [...closed.packedUses.groups.values()].find((group) => group.folderLabel === 'viewer')
    expect(viewerGroup?.memberIds).toHaveLength(9)
    const view = buildOverview(
      index,
      expandView(setFileNeighborhood(emptyViewState(), nucleusId), viewerGroup!.id),
      defaultFilters()
    )
    const members = view.nodes.filter((node) => node.depth === 2 && node.path.startsWith('src/viewer/'))
    expect(members).toHaveLength(9)
    for (const node of members) {
      const at = view.positions.get(node.id)!
      expect(at.x).toBeGreaterThan(0)
    }
    const group = view.nodes.find((node) => node.id === viewerGroup!.id)
    expect(group).toMatchObject({ label: '9 files', expandCaption: 'Hide files', expanded: true })
  })

  it('does not split or group the web app both-walk (fileSplit unset)', () => {
    const { index, nucleusId } = loadBusy()
    const state = setNucleus(emptyViewState(), nucleusId)
    state.ringWalk = 'both'
    state.maxRadialRing = 1
    const view = buildOverview(index, state, defaultFilters())
    expect(view.halfCaptions).toBeUndefined()
    expect(view.nodes.some((node) => isNeighborhoodGroupId(node.id))).toBe(false)
    expect(view.nodes).toHaveLength(1 + 15 + 3)
  })
})
