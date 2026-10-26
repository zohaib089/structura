import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ErrorBanner from '../../src/viewer/components/ErrorBanner.vue'
import GraphSourcePicker from '../../src/viewer/components/GraphSourcePicker.vue'
import OverviewNode from '../../src/viewer/components/OverviewNode.vue'

describe('viewer components', () => {
  it('renders a hostile label as text and expands from Enter or double-click', async () => {
    const wrapper = mount(OverviewNode, {
      global: { stubs: { Handle: true } },
      props: {
        id: 'file:src/app.ts',
        label: '<script>window.__xss=1</script>',
        kind: 'file',
        cluster: true,
        clusterSize: 2,
        expanded: false,
        more: false,
        remainder: 0,
        selected: false,
        dimmed: false,
        tabIndex: 0,
        path: 'src/app.ts',
        moreLabel: '+1 more',
        expandLabel: 'Expand',
        collapseLabel: 'Collapse'
      }
    })
    expect(wrapper.text()).toContain('<script>window.__xss=1</script>')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.attributes('data-node-kind')).toBe('file')
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('toggle')).toBeUndefined()
    await wrapper.trigger('keydown', { key: 'Enter' })
    await wrapper.trigger('dblclick')
    expect(wrapper.emitted('toggle')).toHaveLength(2)
  })

  it('shows an alert for a schema failure', async () => {
    const wrapper = mount(ErrorBanner, {
      props: {
        title: 'Missing or invalid field /nodes',
        body: 'graph.json',
        paths: ['/nodes/0/id'],
        moreLabel: '',
        chooseLabel: 'Choose another file',
        copyLabel: 'Copy error details'
      }
    })
    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.text()).toContain('/nodes/0/id')
    await wrapper.get('button').trigger('click')
  })

  it('renders the empty-state picker without a second file input', async () => {
    const picker = mount(GraphSourcePicker, {
      props: {
        title: 'Open a graph.json',
        dropHint: 'Drag and drop, or',
        chooseLabel: 'Choose file',
        sampleLabel: 'Open the sample graph',
        privateLine: 'Read in your browser. Never uploaded.',
        noFile: 'No file yet? Create one:',
        command: 'npx example scan .',
        copyLabel: 'Copied',
        dragging: false,
        dropOverlay: 'Drop'
      }
    })
    expect(picker.text()).toContain('Never uploaded')
    expect(picker.find('[data-testid="file-input"]').exists()).toBe(false)
    await picker.get('button').trigger('click')
    expect(picker.emitted('sample')).toHaveLength(1)
  })
})
