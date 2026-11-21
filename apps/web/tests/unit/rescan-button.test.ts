import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GraphFloatingBar from '../../src/viewer/components/GraphFloatingBar.vue'
import Tip from '../../src/viewer/components/Tip.vue'

const base = {
  filtersLabel: 'Filters', filtersTooltip: 'Filters', searchLabel: 'Search', searchTooltip: 'Search', fitLabel: 'Fit to view',
  fitTooltip: 'Fit', entryLabel: 'File', entryTooltip: 'File', entryOptions: [], entryId: ''
}

describe('Scan again button (editor hosts)', () => {
  it('is hidden unless the host passes a label (web dashboard unchanged)', () => {
    const w = mount(GraphFloatingBar, { props: base as never })
    expect(w.find('[data-testid="graph-rescan"]').exists()).toBe(false)
  })

  it('emits rescan and has an accessible name with a tooltip', async () => {
    const w = mount(GraphFloatingBar, { props: { ...base, rescanLabel: 'Scan again', rescanTooltip: 'Scan the project again' } as never })
    const button = w.get('[data-testid="graph-rescan"]')
    expect(button.attributes('aria-label')).toBe('Scan again')
    expect(w.findAllComponents(Tip).some((tip) => tip.props('text') === 'Scan the project again')).toBe(true)
    await button.trigger('click')
    expect(w.emitted('rescan')).toHaveLength(1)
  })

  it('waits while a scan is running', () => {
    const w = mount(GraphFloatingBar, { props: { ...base, rescanLabel: 'Scan again', rescanBusy: true, rescanBusyLabel: 'Updating the graph…' } as never })
    const button = w.get('[data-testid="graph-rescan"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('aria-label')).toBe('Updating the graph…')
  })
})
