import { describe, expect, it } from 'vitest'
import type { GraphDocument } from '../../src/viewer/graph-types'
import { readLayoutPreference, writeLayoutPreference } from '../../src/viewer/layout-preference'
import {
  buildLinearOverview,
  isLinearControlId,
  LINEAR_COLUMN_CAP,
  LINEAR_COLUMN_GAP,
  LINEAR_PILL_WIDTH,
  linearColumns,
  linearEdgePath,
  toggleLinear
} from '../../src/viewer/linear'
import { defaultFilters, emptyViewState, indexGraph, setNucleus } from '../../src/viewer/overview'

type Edge = [string, string, ('EXTRACTED' | 'INFERRED')?]
function graph(files: string[], imports: Edge[]) {
  const document = {
    schemaVersion: '1.0.0',
    summary: { nodes: files.length, edges: imports.length },
    coverage: {},
    nodes: files.map((path) => ({ id: `file:${path}`, kind: 'file', path, label: path.split('/').pop(), language: 'typescript' })),
    edges: imports.map(([s, t, provenance]) => ({ source: `file:${s}`, target: `file:${t}`, type: 'imports', provenance: provenance ?? 'EXTRACTED', importKind: 'static', typeOnly: false }))
  } as unknown as GraphDocument
  return indexGraph(document)
}

const centre = 'file:src/centre.ts'

describe('linear layout', () => {
  const index = graph(
    ['src/centre.ts', 'src/a.ts', 'src/b.ts', 'src/deep.ts', 'app/user.ts', 'app/main.ts'],
    [['centre.ts', 'a.ts'], ['a.ts', 'deep.ts'], ['centre.ts', 'b.ts', 'INFERRED'], ['user.ts', 'centre.ts'], ['main.ts', 'user.ts'], ['main.ts', 'centre.ts']].map(
      ([s, t, p]) => [(s!.includes('user') || s!.includes('main') ? 'app/' : 'src/') + s, (t!.includes('user') ? 'app/' : 'src/') + t, p] as Edge
    )
  )

  it('puts used-by files to the left and uses to the right, current file in the middle', () => {
    const cols = linearColumns(index, centre, defaultFilters())
    expect(cols.get(centre)).toBe(0)
    expect(cols.get('file:src/a.ts')).toBe(1)
    expect(cols.get('file:src/deep.ts')).toBe(2)
    expect(cols.get('file:app/user.ts')).toBe(-1)
    expect(cols.get('file:app/main.ts')).toBe(-1)
    const model = buildLinearOverview(index, setNucleus(emptyViewState(), centre), defaultFilters())
    expect(model.positions.get(centre)!.x).toBe(-LINEAR_PILL_WIDTH / 2)
    expect(model.positions.get('file:src/a.ts')!.x).toBeGreaterThan(model.positions.get(centre)!.x)
    expect(model.positions.get('file:app/user.ts')!.x).toBeLessThan(model.positions.get(centre)!.x)
  })

  it('draws every real edge with its provenance; next-column hops are beziers, the rest route around', () => {
    const model = buildLinearOverview(index, setNucleus(emptyViewState(), centre), defaultFilters())
    const byPair = new Map(model.edges.map((e) => [`${e.source}>${e.target}`, e]))
    expect(byPair.size).toBe(6)
    expect(byPair.get(`${centre}>file:src/b.ts`)!.visual).toBe('inferred')
    expect(byPair.get(`${centre}>file:src/a.ts`)!.linear!.route).toBe('adjacent')
    // main.ts → user.ts is inside the same "used by" column: routed around, not through the pills.
    expect(byPair.get('file:app/main.ts>file:app/user.ts')!.linear!.route).toBe('around')
    const around = linearEdgePath(100, 0, 100 + LINEAR_COLUMN_GAP, 40, byPair.get('file:app/main.ts>file:app/user.ts')!.linear!)
    expect(around.path).toContain('Q')
  })

  it('groups a crowded column by folder and caps it with "+N more"', () => {
    const many = Array.from({ length: 40 }, (_, i) => `pkg${i % 20}/file${i}.ts`)
    const crowded = graph(['src/centre.ts', ...many], many.map((path) => ['src/centre.ts', path] as Edge))
    const state = setNucleus(emptyViewState(), centre)
    const model = buildLinearOverview(crowded, state, defaultFilters())
    const uses = model.nodes.filter((n) => n.column === 1)
    expect(uses.length).toBe(LINEAR_COLUMN_CAP)
    expect(uses.filter((n) => n.cluster).length).toBe(LINEAR_COLUMN_CAP - 1)
    const more = uses.find((n) => n.more)!
    expect(more.remainder).toBe(40 - 2 * (LINEAR_COLUMN_CAP - 1))
    expect(isLinearControlId(more.id)).toBe(true)
    // Edges into hidden files land on the group / more pill, so nothing is dropped.
    expect(model.edges.reduce((sum, e) => sum + e.weight, 0)).toBe(40)

    const group = uses.find((n) => n.cluster)!
    const opened = buildLinearOverview(crowded, toggleLinear(state, group.id), defaultFilters())
    expect(opened.nodes.find((n) => n.id === group.id)!.expanded).toBe(true)
    const revealed = buildLinearOverview(crowded, toggleLinear(state, more.id), defaultFilters())
    expect(revealed.nodes.filter((n) => n.column === 1 && n.more)).toHaveLength(0)
    expect(toggleLinear(toggleLinear(state, group.id), group.id).expanded).not.toContain(group.id)
  })

  it('keeps the same nucleus and layout through toggles', () => {
    const state = { ...setNucleus(emptyViewState(), centre), layout: 'linear' as const }
    const next = toggleLinear(state, 'lgroup:1:pkg1')
    expect(next.nucleusId).toBe(centre)
    expect(next.layout).toBe('linear')
  })

  it('remembers the Linear / Radial choice for the session, radial first', () => {
    expect(readLayoutPreference()).toBe('radial')
    writeLayoutPreference('linear')
    expect(readLayoutPreference()).toBe('linear')
    writeLayoutPreference('radial')
  })
})
