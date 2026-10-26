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
  it('opens the bundled sample and expands a cluster from the keyboard model', async () => {
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
    const cluster = wrapper.get('[data-node-id="dir:apps"]')
    await cluster.trigger('click')
    expect(wrapper.get('[data-testid="node-detail"]').text()).toContain('apps')
    await cluster.trigger('keydown', { key: 'Enter' })
    expect(wrapper.get('[data-node-id="dir:apps"]').attributes('data-expanded')).toBe('true')
    await wrapper.get('.overview-node[data-node-id="dir:packages"]').trigger('dblclick')
    expect(wrapper.get('.overview-node[data-node-id="dir:packages"]').attributes('data-expanded')).toBe('true')
    wrapper.unmount()
  })
})
