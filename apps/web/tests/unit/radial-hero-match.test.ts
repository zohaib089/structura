import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import RadialNodeGlyph from '../../src/components/graph/RadialNodeGlyph.vue'
import { pathToNucleus, ringRadius, HERO_RING_RADII } from '../../src/components/graph/radial-geometry'
import OverviewNode from '../../src/viewer/components/OverviewNode.vue'

describe('dashboard graph uses the landing hero drawing', () => {
  it('keeps the first three ring radii identical to the hero', () => {
    expect(ringRadius(1)).toBe(HERO_RING_RADII[1])
    expect(ringRadius(2)).toBe(HERO_RING_RADII[2])
    expect(ringRadius(3)).toBe(HERO_RING_RADII[3])
    expect(ringRadius(4)).toBeGreaterThan(HERO_RING_RADII[3] ?? 0)
  })

  it('renders the nucleus and satellites with the hero glyph', () => {
    const nucleus = mount(OverviewNode, {
      global: { stubs: { Handle: true } },
      props: {
        id: 'file:main.ts',
        label: 'main.ts',
        kind: 'file',
        cluster: false,
        clusterSize: 0,
        expanded: false,
        more: false,
        remainder: 0,
        selected: false,
        nucleus: true,
        dimmed: false,
        tabIndex: 0,
        path: 'main.ts',
        moreLabel: '',
        expandLabel: 'Expand',
        collapseLabel: 'Collapse',
        depth: 0
      }
    })
    expect(nucleus.find('.radial__nucleus').exists()).toBe(true)
    expect(nucleus.find('.radial__entry-name').text()).toBe('main.ts')
    expect(nucleus.find('.radial__entry-tag').text()).toBe('ENTRY POINT')

    const file = mount(OverviewNode, {
      global: { stubs: { Handle: true } },
      props: {
        id: 'file:app.ts',
        label: 'app.ts',
        kind: 'file',
        cluster: false,
        clusterSize: 0,
        expanded: false,
        more: false,
        remainder: 0,
        selected: true,
        dimmed: false,
        tabIndex: 0,
        path: 'app.ts',
        moreLabel: '',
        expandLabel: 'Expand',
        collapseLabel: 'Collapse',
        depth: 1,
        severity: 'high',
        deg: -90,
        hot: true
      }
    })
    expect(file.find('.radial__body').exists()).toBe(true)
    expect(file.find('.radial__label').text()).toBe('app.ts')
    expect(file.classes()).toContain('is-hot')
    expect(file.findComponent(RadialNodeGlyph).exists()).toBe(true)
  })

  it('highlights the walk back to depth 0', () => {
    const nodes = [
      { id: 'entry', depth: 0 },
      { id: 'mid', depth: 1 },
      { id: 'leaf', depth: 2 }
    ]
    const edges = [
      { id: 'e1', source: 'entry', target: 'mid' },
      { id: 'e2', source: 'mid', target: 'leaf' },
      { id: 'cross', source: 'entry', target: 'leaf' }
    ]
    const hot = pathToNucleus('leaf', nodes, edges)
    expect([...hot.nodeIds].sort()).toEqual(['entry', 'leaf', 'mid'])
    expect(hot.edgeIds.has('e2')).toBe(true)
    expect(hot.edgeIds.has('e1')).toBe(true)
    expect(hot.edgeIds.has('cross')).toBe(false)
  })

  it('shares one stylesheet for hero strokes and dashboard edges', () => {
    const css = readFileSync(resolve('src/components/graph/radial-graph.css'), 'utf8')
    expect(css).toContain('stroke: #5a6270')
    expect(css).toContain('stroke-dasharray: 7 5')
    expect(css).toContain('stroke-dasharray: 1.5 5')
    expect(css).toContain('stroke-dasharray: 2 7')
    const hero = readFileSync(resolve('src/components/landing/RadialSampleGraph.vue'), 'utf8')
    const dashboard = readFileSync(resolve('src/viewer/components/OverviewNode.vue'), 'utf8')
    expect(hero).toContain('RadialNodeGlyph')
    expect(dashboard).toContain('RadialNodeGlyph')
  })
})
