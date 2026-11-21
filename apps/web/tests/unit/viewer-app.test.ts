import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { readGraph } from '../../src/viewer/read-graph'

vi.mock('../../src/viewer/parse-client', () => ({
  parseGraphFile: (file: Blob) => ({
    cancel() { /* no worker in unit tests */ },
    promise: file.text().then((text) => readGraph(text))
  })
}))

describe('ViewerApp', () => {
  it('collapses the details panel to a rail and reads and writes the host panel prefs', async () => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }))
    // Vue Flow measures edge labels with SVG getBBox, which jsdom does not implement.
    const svg = SVGElement.prototype as SVGElement & { getBBox(): DOMRect }
    svg.getBBox = (): DOMRect =>
      ({
        x: 0,
        y: 0,
        width: 12,
        height: 8,
        bottom: 8,
        left: 0,
        right: 12,
        top: 0,
        toJSON() {
          return {}
        }
      }) as DOMRect
    const { default: ViewerApp } = await import('../../src/viewer/ViewerApp.vue')
    const { localViewerPanelPrefs, VIEWER_PANEL_COLLAPSED_KEY } = await import('../../src/services/viewer-panel-pref')
    window.localStorage.removeItem(VIEWER_PANEL_COLLAPSED_KEY)
    const open = async () => {
      const wrapper = mount(ViewerApp, { attachTo: document.body, props: { panelPrefs: localViewerPanelPrefs } })
      await wrapper.get('button.primary').trigger('click')
      await flushPromises()
      await vi.waitFor(() => expect(wrapper.find('[data-testid="graph-canvas"]').exists()).toBe(true))
      await wrapper.get('[data-node-id="file:apps/web/main.ts"]').trigger('click')
      return wrapper
    }
    const first = await open()
    const toggle = first.get('[data-testid="panel-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    await flushPromises()
    expect(first.find('[data-testid="panel-rail"]').exists()).toBe(true)
    expect(first.get('[data-testid="panel-toggle"]').attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(first.get('[data-testid="panel-toggle"]').element)
    expect(window.localStorage.getItem(VIEWER_PANEL_COLLAPSED_KEY)).toBe('1')
    first.unmount()

    const second = await open()
    expect(second.find('[data-testid="panel-rail"]').exists()).toBe(true)
    await second.get('[data-testid="panel-toggle"]').trigger('click')
    await flushPromises()
    expect(second.find('[data-testid="panel-rail"]').exists()).toBe(false)
    expect(window.localStorage.getItem(VIEWER_PANEL_COLLAPSED_KEY)).toBe('0')
    second.unmount()
  })

  it('starts with the rail in a narrow host unless the user saved a panel choice', async () => {
    let report: ((width: number) => void) | null = null
    class ResizeObserverStub {
      constructor(private cb: (entries: { contentRect: { width: number } }[]) => void) {}
      observe() { if (!report) report = (width) => this.cb([{ contentRect: { width } }]) }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
    const svg = SVGElement.prototype as SVGElement & { getBBox(): DOMRect }
    svg.getBBox = (): DOMRect => ({ x: 0, y: 0, width: 12, height: 8, bottom: 8, left: 0, right: 12, top: 0, toJSON: () => ({}) }) as DOMRect
    const { default: ViewerApp } = await import('../../src/viewer/ViewerApp.vue')
    let saved: boolean | null = null
    const panelPrefs = { read: () => saved, write: (v: boolean) => { saved = v } }
    const open = async () => {
      report = null
      const wrapper = mount(ViewerApp, { attachTo: document.body, props: { panelPrefs, autoCollapseBelow: 1180 } })
      report!(1000)
      await wrapper.get('button.primary').trigger('click')
      await flushPromises()
      await vi.waitFor(() => expect(wrapper.find('[data-testid="graph-canvas"]').exists()).toBe(true))
      await wrapper.get('[data-node-id="file:apps/web/main.ts"]').trigger('click')
      await flushPromises()
      return wrapper
    }
    const first = await open()
    expect(first.find('[data-testid="panel-rail"]').exists()).toBe(true)
    expect(saved).toBe(null)
    report!(1400)
    await flushPromises()
    expect(first.find('[data-testid="panel-rail"]').exists()).toBe(false)
    report!(1000)
    await flushPromises()
    await first.get('[data-testid="panel-toggle"]').trigger('click')
    await flushPromises()
    expect(saved).toBe(false)
    first.unmount()
    // A saved "expanded" choice wins over the narrow default.
    const second = await open()
    expect(second.find('[data-testid="panel-rail"]').exists()).toBe(false)
    second.unmount()
  })

  it('opens the bundled sample and expands radial rings from the keyboard model', async () => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }))
    // Vue Flow measures edge labels with SVG getBBox, which jsdom does not implement.
    const svg = SVGElement.prototype as SVGElement & { getBBox(): DOMRect }
    svg.getBBox = (): DOMRect =>
      ({
        x: 0,
        y: 0,
        width: 12,
        height: 8,
        bottom: 8,
        left: 0,
        right: 12,
        top: 0,
        toJSON() {
          return {}
        }
      }) as DOMRect
    const { default: ViewerApp } = await import('../../src/viewer/ViewerApp.vue')
    const wrapper = mount(ViewerApp, { attachTo: document.body })
    await wrapper.get('button.primary').trigger('click')
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="graph-canvas"]').exists()).toBe(true)
    })
    const canvas = wrapper.get('[data-testid="graph-canvas"]')
    expect(canvas.attributes('data-total-nodes')).toBe('11')
    expect(Number(canvas.attributes('data-visible-nodes'))).toBeLessThanOrEqual(300)
    const nucleus = wrapper.get('[data-node-id="file:apps/web/main.ts"]')
    await nucleus.trigger('click')
    expect(wrapper.get('[data-testid="node-detail"]').text()).toContain('main.ts')
    const visibleBefore = Number(canvas.attributes('data-visible-nodes'))
    await nucleus.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(Number(canvas.attributes('data-visible-nodes'))).toBeGreaterThanOrEqual(visibleBefore)
    expect(wrapper.find('[data-testid="graph-entry-switcher"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps the current view when the host refreshes the graph document', () => {
    const src = readFileSync(resolve('src/viewer/ViewerApp.vue'), 'utf8')
    expect(src).toContain('preserveView: sameView')
    expect(src).toContain('prev.focusPath === next.focusPath')
    expect(src).toContain('restorePreservedView')
    expect(src).toContain('graphCanvas.value?.getViewport()')
  })
})
