import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OverviewNode from '../../src/viewer/components/OverviewNode.vue'

const read = (p: string) => readFileSync(resolve(p), 'utf8')
const base = { id: 'n', label: 'main.ts', kind: 'file', cluster: false, clusterSize: 0, expanded: false, more: false, remainder: 0, selected: false, dimmed: false, tabIndex: 0, path: 'src/main.ts', moreLabel: 'more', expandLabel: 'Expand', collapseLabel: 'Collapse', language: 'typescript' }

describe('S3 Nucleus graph surface', () => {
  it('paints a stable navy surface on the canvas itself, not under Vue Flow', () => {
    const canvas = read('src/viewer/components/GraphCanvas.vue')
    expect(canvas).toContain('class="canvas graph-surface"')
    expect(canvas).toMatch(/\.canvas :deep\(\.vue-flow\),\s*\.canvas :deep\(\.vue-flow__background\)[^}]*background: transparent/)
    expect(read('src/viewer/ViewerApp.vue')).toContain('<main class="stage graph-surface">')
    const surface = read('src/viewer/graph-surface.css')
    expect(surface).toMatch(/\.graph-surface \{[^}]*--gray-10: #e6e8eb;[^}]*--color-text-primary: var\(--gray-10\)/)
  })

  it('uses bowed radial spoke/cross edges and a line-style legend', () => {
    const edge = read('src/viewer/components/OverviewEdge.vue')
    expect(edge).toContain('radialEdgePath')
    expect(edge).toContain('edge-role-cross')
    expect(edge).not.toContain('getStraightPath')
    const app = read('src/viewer/ViewerApp.vue')
    for (const k of ['extracted', 'inferred', 'unresolved']) expect(app).toContain(`edge-key__line--${k}`)
  })

  it('renders files as compact disc marks with a non-colour glyph and the nucleus as a filled amber disc', () => {
    const file = mount(OverviewNode, { global: { stubs: { Handle: true } }, props: base })
    expect(file.get('.kind-mark').classes()).toContain('kind-mark--disc')
    expect(file.find('.sev-glyph').exists()).toBe(true)
    expect(file.get('.overview-node').attributes('aria-label')).toBe('main.ts')
    const nucleus = mount(OverviewNode, { global: { stubs: { Handle: true } }, props: { ...base, cluster: true, clusterSize: 1, nucleus: true } })
    expect(nucleus.get('.kind-mark').classes()).toContain('kind-mark--disc')
    expect(nucleus.find('.nucleus-mark').exists()).toBe(true)
    expect(nucleus.get('.overview-node').attributes('aria-expanded')).toBe('false')
    const unresolved = mount(OverviewNode, { global: { stubs: { Handle: true } }, props: { ...base, kind: 'unresolved', label: './missing' } })
    expect(unresolved.find('.sev-glyph').exists()).toBe(true)
    expect(read('src/viewer/components/OverviewNode.vue')).toMatch(/\.is-nucleus \.kind-mark--disc \{[^}]*background: var\(--color-brand-amber-ui\)/)
  })
})
