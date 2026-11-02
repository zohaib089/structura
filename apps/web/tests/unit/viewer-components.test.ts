import { flushPromises, mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import BrandMark from '../../src/components/brand/BrandMark.vue'
import { BRAND } from '../../../../packages/brand/src/brand'
import BudgetMeter from '../../src/viewer/components/BudgetMeter.vue'
import CoveragePanel from '../../src/viewer/components/CoveragePanel.vue'
import DriftPanel from '../../src/viewer/components/DriftPanel.vue'
import ErrorBanner from '../../src/viewer/components/ErrorBanner.vue'
import FilterRail from '../../src/viewer/components/FilterRail.vue'
import FocusBar from '../../src/viewer/components/FocusBar.vue'
import GraphLegend from '../../src/viewer/components/GraphLegend.vue'
import GraphSourcePicker from '../../src/viewer/components/GraphSourcePicker.vue'
import NodeDetail from '../../src/viewer/components/NodeDetail.vue'
import OverviewNode from '../../src/viewer/components/OverviewNode.vue'
import SearchPalette from '../../src/viewer/components/SearchPalette.vue'
import { readGraph } from '../../src/viewer/read-graph'

vi.mock('../../src/viewer/parse-client', () => ({
  parseGraphFile: (file: Blob) => ({
    cancel() { /* worker substitute */ },
    promise: file.text().then(async (text) => {
      const module = await import('../../src/viewer/read-graph')
      return module.readGraph(text)
    })
  })
}))

describe('viewer components', () => {
  it('renders the brand mark without putting the wordmark in the svg', () => {
    const wrapper = mount(BrandMark, { props: { size: 24 } })
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.text()).not.toContain(BRAND.name)
    const titled = mount(BrandMark, { props: { size: 32, title: 'mark' } })
    expect(titled.find('svg').attributes('role')).toBe('img')
  })

  it('renders a hostile label as text and expands on double-click', async () => {
    const wrapper = mount(OverviewNode, {
      global: { stubs: { Handle: true } },
      props: {
        id: 'file:src/app.ts',
        label: '<script>window.__xss=1</script>',
        kind: 'file',
        cluster: false,
        clusterSize: 0,
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
    await wrapper.trigger('dblclick')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
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

  it('renders the empty-state picker, legend, meter, detail, filters, focus, coverage, drift, and search', async () => {
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
    await picker.get('button').trigger('click')

    const legend = mount(GraphLegend, {
      props: {
        title: 'Legend',
        rows: [
          { visual: 'extracted', label: 'Extracted — Found in source', count: '2 in this graph' },
          { visual: 'inferred', label: 'Inferred — Heuristic, not proven', count: '1 in this graph' },
          { visual: 'unresolved', label: 'Unresolved — Target not found', count: '1 in this graph' }
        ]
      }
    })
    expect(legend.findAll('line').map((line) => line.attributes('stroke-dasharray') ?? 'none')).toEqual(['none', '7 5', '0.1 6'])

    const meter = mount(BudgetMeter, {
      props: { text: 'Showing 4 of 1000 nodes · 3 of 1000 edges', ratio: 0.2, warn: false, full: false, nearLabel: 'near', fullLabel: 'full', hiddenLabel: '' }
    })
    expect(meter.text()).toContain('1000')

    const detail = mount(NodeDetail, {
      props: {
        empty: 'Select a node or edge to see details',
        kindLabel: 'Kind',
        pathLabel: 'Path',
        spanLabel: 'Span',
        provenanceLabel: 'Provenance',
        confidenceLabel: 'Confidence',
        reasonLabel: 'Reason',
        internalLabel: 'Internal',
        weightLabel: 'Weight',
        importKindLabel: 'Import kind',
        typeOnlyLabel: 'Type only',
        focusLabel: 'Focus',
        detail: { title: 'apps', kind: 'directory', path: 'apps', span: '', provenance: '1 extracted · 1 inferred · 0 unresolved', confidence: '', reason: '', internal: 'Internal edges: 0', weight: '', importKind: 'dynamic', typeOnly: 'false' }
      }
    })
    expect(detail.get('[data-testid="node-detail"]').text()).toContain('apps')
    expect(detail.text()).toContain('dynamic')

    const filters = mount(FilterRail, {
      props: {
        label: 'Filters',
        provenanceLabel: 'Edge provenance',
        kindLabel: 'Node kind',
        languageLabel: 'Language',
        driftLabel: 'Drift and unresolved only',
        resetLabel: 'Reset filters',
        emptyLabel: 'Open a file to filter',
        disabled: false,
        extracted: true,
        inferred: false,
        unresolved: true,
        driftOnly: false,
        kinds: [{ id: 'file', label: 'file', checked: true }],
        languages: [],
        extractedText: 'Extracted',
        inferredText: 'Inferred',
        unresolvedText: 'Unresolved'
      }
    })
    expect(filters.text()).toContain('Edge provenance')

    const focus = mount(FocusBar, {
      props: {
        label: 'Focus mode',
        name: 'apps',
        dependencies: 'Dependencies',
        dependents: 'Dependents',
        both: 'Both',
        depthLabel: 'Depth 1',
        confirmedOnly: 'Confirmed only',
        confirmed: 'Confirmed: 1',
        possible: 'Possible: +0',
        unresolved: '',
        none: '',
        exit: 'Exit focus',
        direction: 'out',
        depth: 1,
        confirmedOnlyOn: false
      }
    })
    expect(focus.text()).toContain('Exit focus')

    const loaded = readGraph(readFileSync(resolve('fixtures/sample-graph.json'), 'utf8'))
    if (!loaded.ok) throw new Error('sample')
    const coverage = mount(CoveragePanel, {
      props: {
        coverage: loaded.graph.coverage,
        none: 'none',
        bar: '3 parsed',
        banner: '',
        full: 'All 3 discovered files were parsed.',
        honesty: 'Coverage describes the scan, not the quality of your code.',
        language: 'Language',
        parsed: 'Parsed',
        partial: 'Partial',
        failed: 'Failed',
        skipped: 'Skipped',
        exportLabel: 'Export 1 rows'
      }
    })
    expect(coverage.text()).toContain('All 3')

    const drift = mount(DriftPanel, {
      props: {
        title: 'No architecture file found',
        body: 'Drift checks need a config file.',
        status: 'Drift: not configured',
        snippetLabel: 'Illustrative',
        snippet: 'layers: []',
        copyLabel: 'Copy snippet'
      }
    })
    expect(drift.text()).toContain('not configured')
    expect(drift.text()).not.toContain('passed')

    const palette = mount(SearchPalette, {
      props: {
        label: 'Search',
        placeholder: 'Search',
        none: 'No matches',
        hint: 'Try a file name',
        more: '1 more matches. Keep typing.',
        footer: 'Esc close',
        hits: [],
        total: 0,
        query: '__proto__('
      }
    })
    expect(palette.get('[data-testid="search-input"]').element).toBeInstanceOf(HTMLInputElement)
    await flushPromises()
  })
})
