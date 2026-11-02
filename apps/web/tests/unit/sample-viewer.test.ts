import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SampleViewer from '../../src/components/landing/SampleViewer.vue'

describe('SampleViewer', () => {
  it('renders the bundled sample in the real graph canvas', async () => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
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
    const wrapper = mount(SampleViewer, {
      props: { alt: 'Sample graph', samplePill: 'Sample data' },
      attachTo: document.body
    })
    await flushPromises()
    const canvas = wrapper.get('[data-testid="graph-canvas"]')
    expect(canvas.attributes('data-total-nodes')).toBe('11')
    expect(canvas.attributes('data-ready')).toBe('true')
    expect(Number(canvas.attributes('data-visible-nodes'))).toBeLessThanOrEqual(300)
    expect(wrapper.text()).toContain('Sample data')
    await vi.waitFor(() => {
      expect(wrapper.find('.overview-node[data-node-id="dir:apps"]').exists()).toBe(true)
    })
    const cluster = wrapper.get('.overview-node[data-node-id="dir:apps"]')
    expect(cluster.attributes('data-expanded')).toBe('false')
    await cluster.trigger('keydown', { key: 'Enter' })
    expect(wrapper.get('.overview-node[data-node-id="dir:apps"]').attributes('data-expanded')).toBe('true')
    wrapper.unmount()
  })
})
