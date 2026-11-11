import { describe, expect, it } from 'vitest'
import { GraphHistory, zoomAnchor, zoomAroundPoint, type GraphSnapshot } from '../../src/viewer/graph-history'
import { emptyViewState, expandView, setNucleus } from '../../src/viewer/overview'

function snap(nucleus: string, zoom = 1): GraphSnapshot {
  return {
    viewState: setNucleus(emptyViewState(), nucleus),
    selection: { kind: 'node', id: nucleus },
    focus: null,
    viewport: { x: 10, y: 20, zoom },
    inspectorOpen: true
  }
}

describe('zoomAroundPoint', () => {
  it('keeps the anchor point fixed on screen while zooming in and out', () => {
    const start = { x: 100, y: 50, zoom: 1 }
    const anchor = { x: 400, y: 300 }
    const flowBefore = { x: (anchor.x - start.x) / start.zoom, y: (anchor.y - start.y) / start.zoom }
    for (const factor of [1.2, 1 / 1.2, 2]) {
      const next = zoomAroundPoint(start, anchor, factor)
      expect(next.zoom).toBeCloseTo(start.zoom * factor)
      expect(flowBefore.x * next.zoom + next.x).toBeCloseTo(anchor.x)
      expect(flowBefore.y * next.zoom + next.y).toBeCloseTo(anchor.y)
    }
  })

  it('clamps to the zoom limits without moving the anchor', () => {
    const next = zoomAroundPoint({ x: 0, y: 0, zoom: 2 }, { x: 50, y: 50 }, 10, 0.1, 2.5)
    expect(next.zoom).toBe(2.5)
    expect(25 * next.zoom + next.x).toBeCloseTo(50)
  })
})

describe('zoomAnchor', () => {
  it('uses the selected node when it is on screen, else the centre', () => {
    expect(zoomAnchor({ width: 800, height: 600 }, { x: 120, y: 90 })).toEqual({ x: 120, y: 90 })
    expect(zoomAnchor({ width: 800, height: 600 }, { x: -5, y: 90 })).toEqual({ x: 400, y: 300 })
    expect(zoomAnchor({ width: 800, height: 600 }, null)).toEqual({ x: 400, y: 300 })
  })
})

describe('GraphHistory', () => {
  it('starts empty: no Back', () => {
    const history = new GraphHistory()
    expect(history.canGoBack).toBe(false)
    expect(history.back()).toBeNull()
  })

  it('returns views last-in first-out with focus, zoom and expanded nodes', () => {
    const history = new GraphHistory()
    const first = snap('file:a.ts', 0.5)
    first.viewState = expandView(first.viewState, 'dir:src')
    history.push(first)
    history.push(snap('file:b.ts', 1.4))
    expect(history.size).toBe(2)
    expect(history.back()?.selection?.id).toBe('file:b.ts')
    const restored = history.back()!
    expect(restored.viewState.nucleusId).toBe('file:a.ts')
    expect(restored.viewState.expanded).toContain('dir:src')
    expect(restored.viewport).toEqual({ x: 10, y: 20, zoom: 0.5 })
    expect(history.canGoBack).toBe(false)
  })

  it('stores copies, skips duplicates and stays bounded', () => {
    const history = new GraphHistory(3)
    const s = snap('file:a.ts')
    history.push(s)
    s.viewState.expanded.push('mutated')
    history.push(snap('file:a.ts'))
    expect(history.size).toBe(1)
    expect(history.back()?.viewState.expanded).not.toContain('mutated')
    for (const id of ['1', '2', '3', '4', '5']) history.push(snap(`file:${id}`))
    expect(history.size).toBe(3)
    expect(history.back()?.selection?.id).toBe('file:5')
  })
})
