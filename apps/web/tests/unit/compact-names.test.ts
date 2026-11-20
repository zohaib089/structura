import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FocusBar from '../../src/viewer/components/FocusBar.vue'
import GraphFloatingBar from '../../src/viewer/components/GraphFloatingBar.vue'

const focusProps = { label: 'Focus', name: 'file-neighborhood.ts', dependencies: 'Uses', dependents: 'Used by', both: 'Both', depthLabel: 'Depth 1', confirmedOnly: 'Confirmed only', confirmed: '', possible: '', unresolved: '', none: '', exit: 'Exit focus', direction: 'out' as const, depth: 1, confirmedOnlyOn: false, optionsLabel: 'Options' }

describe('compact names', () => {
  it('focus chip carries a middle-ellipsis phone name with the full name as tooltip and accessible text', () => {
    const w = mount(FocusBar, { props: focusProps })
    const short = w.get('.name-short')
    expect(short.text()).toBe('file-ne…hood.ts')
    expect(short.attributes('title')).toBe('file-neighborhood.ts')
    expect(w.get('.name-full').text()).toBe('file-neighborhood.ts')
    expect(w.get('[data-testid="focus-options"]').attributes('title')).toBe('Options')
  })

  it('compact toolbar shortens only the selected file and names its full path in the tooltip', () => {
    const base = { filtersLabel: 'Filters', filtersTooltip: 'Filters', searchLabel: 'Search', searchTooltip: 'Search', fitLabel: 'Fit to view', fitTooltip: 'Fit', radialLabel: 'Radial', linearLabel: 'Linear', entryLabel: 'Start from file', entryTooltip: 'Start from file', entryId: 'a', entryOptions: [{ id: 'a', label: 'file-neighborhood.ts', path: 'apps/web/src/viewer/file-neighborhood.ts' }, { id: 'b', label: 'graph-viewer.spec.ts', path: 'tests/graph-viewer.spec.ts' }] }
    const w = mount(GraphFloatingBar, { props: { ...base, density: 'tight' } as never })
    const options = w.findAll('option')
    expect(options[0]!.text()).toBe('file-…ood.ts')
    expect(options[1]!.text()).toBe('graph-viewer.spec.ts')
    expect(w.get('select').attributes('title')).toBe('Start from file: apps/web/src/viewer/file-neighborhood.ts')
    const full = mount(GraphFloatingBar, { props: { ...base, density: 'full' } as never })
    expect(full.findAll('option')[0]!.text()).toBe('file-neighborhood.ts')
  })
})
