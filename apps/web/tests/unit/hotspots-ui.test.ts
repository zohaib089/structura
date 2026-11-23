import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import ReportHotspots from '../../src/components/dashboard/report/ReportHotspots.vue'
import GraphFloatingBar from '../../src/viewer/components/GraphFloatingBar.vue'
import HotspotLegend from '../../src/viewer/components/HotspotLegend.vue'
import NodeDetail from '../../src/viewer/components/NodeDetail.vue'
import Tip from '../../src/viewer/components/Tip.vue'
import type { NodeDetailSections } from '../../src/viewer/node-detail-data'

const items = [
  { path: 'apps/web/src/viewer/ViewerApp.vue', score: 88, why: 'Used by 12 files and has 3 findings' },
  { path: 'packages/engine/src/graph/hotspots.ts', score: 54, why: 'Used by 4 files' },
  { path: 'src/util.ts', score: 21, why: 'Has 200 lines' }
]

const barBase = {
  filtersLabel: 'Filters',
  filtersTooltip: 'Filters',
  searchLabel: 'Search',
  searchTooltip: 'Search',
  fitLabel: 'Fit to view',
  fitTooltip: 'Fit',
  entryLabel: 'File',
  entryTooltip: 'File',
  entryOptions: [],
  entryId: ''
}

const emptySections: NodeDetailSections = {
  stats: { depth: 0, depsOut: 0, depsIn: 0, provenance: '' },
  summary: null,
  summarySource: 'none',
  symbols: [],
  insights: null,
  hotspot: null,
  symbolCounts: [],
  imports: [],
  importers: [],
  contents: [],
  findings: [],
  severityChip: null,
  severityChips: null
}

function detailProps(sections: NodeDetailSections) {
  return {
    empty: 'Select a node',
    panelHint: 'Details',
    kindLabel: 'Kind',
    pathLabel: 'Path',
    spanLabel: 'Span',
    provenanceLabel: 'How we know',
    confidenceLabel: 'Confidence',
    reasonLabel: 'Reason',
    internalLabel: 'Internal',
    weightLabel: 'Weight',
    importKindLabel: 'Import kind',
    typeOnlyLabel: 'Type only',
    focusLabel: 'Show only connections',
    recentreLabel: 'Centre graph here',
    focusTooltip: 'Focus',
    recentreTooltip: 'Recentre',
    depthLabel: 'Levels from centre',
    depthTooltip: 'Depth',
    depsOutLabel: 'Uses',
    depsInLabel: 'Used by',
    findingsLabel: 'Findings',
    findingsSectionLabel: 'Findings',
    purposeLabel: 'What this file does',
    symbolsLabel: 'Functions and classes',
    importsLabel: 'This file uses',
    importersLabel: 'Used by',
    contentsLabel: 'Contents',
    expandContentsLabel: 'Show inside on map',
    expandTooltip: 'Expand',
    noFindingsLabel: 'No issues on this file.',
    noFindingsNeedScan: 'Need scan report.',
    hasScanReport: false,
    noIssuesStat: 'None',
    summaryLoading: 'Loading…',
    summaryError: 'Error',
    summaryRetry: 'Retry',
    summaryEmpty: 'Empty',
    emptyImports: 'No imports',
    emptyImporters: 'No importers',
    emptySymbols: 'No symbols',
    emptyContents: 'Empty folder',
    openDetailsLabel: 'Open details',
    kindTagFolder: 'Folder',
    kindTagFile: 'File',
    symbolExportTag: 'Export',
    summaryState: 'none' as const,
    severityLabel: (severity: string) => severity,
    riskToChangeLabel: 'Risk to change',
    riskToChangeValue: '{score} ({band})',
    hotspotBandLabels: { low: 'Low', medium: 'Medium', high: 'High' },
    detail: { title: 'app.ts', kind: 'file', path: 'src/app.ts', span: '', provenance: '', confidence: '', reason: '', internal: '', weight: '', importKind: '', typeOnly: '' },
    sections,
    findings: []
  }
}

async function mountCard(hotspots = items) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: defineComponent({ render: () => h('div') }) }]
  })
  await router.push('/en/w/ws/projects/p/scans/s/summary')
  await router.isReady()
  return mount(ReportHotspots, {
    props: {
      items: hotspots,
      title: 'Riskiest files',
      hint: 'These files are the most likely to cause trouble if you change them.',
      openLabel: 'Show in graph',
      bandLabel: (band: 'low' | 'medium' | 'high') => ({ low: 'Low', medium: 'Medium', high: 'High' }[band]),
      scoreLabel: (score: number, band: string) => `${score} · ${band}`,
      graphHref: (path?: string) => ({ path: '/graph', query: path ? { node: path } : {} })
    },
    global: { plugins: [router] }
  })
}

describe('Riskiest files card', () => {
  it('lists the top files with a score bar, name, short path, why, and a graph link', async () => {
    const w = await mountCard()
    const card = w.get('[data-testid="riskiest-files"]')
    expect(card.text()).toContain('Riskiest files')
    expect(card.text()).toContain('ViewerApp.vue')
    expect(card.text()).toContain('apps/web/src/viewer')
    expect(card.text()).toContain('Used by 12 files and has 3 findings')
    expect(card.text()).toContain('High')
    expect(card.text()).toContain('Medium')
    expect(card.text()).toContain('Low')
    const first = card.get('a.hotspot__link')
    expect(first.attributes('href')).toContain('node=')
    expect(w.find('.score__fill').exists()).toBe(true)
  })

  it('hides the card when a 1.1 graph has no hotspots list', async () => {
    const w = await mountCard([])
    expect(w.find('[data-testid="riskiest-files"]').exists()).toBe(false)
  })
})

describe('Show hotspots toggle and legend', () => {
  it('is hidden unless the host passes a label (older graphs)', () => {
    const w = mount(GraphFloatingBar, { props: barBase as never })
    expect(w.find('[data-testid="graph-show-hotspots"]').exists()).toBe(false)
  })

  it('renders an accessible toggle with a tooltip, off by default, and emits the change', async () => {
    const w = mount(GraphFloatingBar, {
      props: {
        ...barBase,
        showHotspotsLabel: 'Show hotspots',
        showHotspotsTooltip: 'Colour files by how risky they are to change',
        showHotspots: false
      } as never
    })
    const button = w.get('[data-testid="graph-show-hotspots"]')
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(button.attributes('aria-label')).toBe('Show hotspots')
    expect(w.findAllComponents(Tip).some((tip) => tip.props('text') === 'Colour files by how risky they are to change')).toBe(true)
    await button.trigger('click')
    expect(w.emitted('toggleShowHotspots')).toHaveLength(1)
  })

  it('keeps the name as an accessible label when the bar is compact', () => {
    const w = mount(GraphFloatingBar, {
      props: {
        ...barBase,
        density: 'tight',
        showHotspotsLabel: 'Show hotspots',
        showHotspotsTooltip: 'Colour files by how risky they are to change',
        showHotspots: true
      } as never
    })
    const button = w.get('[data-testid="graph-show-hotspots"]')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(button.attributes('aria-label')).toBe('Show hotspots')
    expect(button.classes()).toContain('is-compact')
  })

  it('shows the Low, Medium and High key as words plus colour', () => {
    const w = mount(HotspotLegend, {
      props: {
        title: 'Risk to change',
        bands: [
          { id: 'low', label: 'Low' },
          { id: 'medium', label: 'Medium' },
          { id: 'high', label: 'High' }
        ]
      }
    })
    expect(w.get('[data-testid="hotspot-legend"]').text()).toContain('Risk to change')
    expect(w.get('[data-testid="hotspot-legend"]').text()).toContain('Low')
    expect(w.get('[data-testid="hotspot-legend"]').text()).toContain('Medium')
    expect(w.get('[data-testid="hotspot-legend"]').text()).toContain('High')
    expect(w.findAll('.swatch').map((swatch) => swatch.attributes('data-band'))).toEqual(['low', 'medium', 'high'])
  })

  it('docks a compact phone legend under the toolbar and keeps the 1440 toolbar on one row', () => {
    const read = (rel: string) => readFileSync(resolve(rel), 'utf8')
    expect(read('src/viewer/components/HotspotLegend.vue')).toMatch(
      /@media \(max-width: 640px\)[\s\S]*display: flex/
    )
    const app = read('src/viewer/ViewerApp.vue')
    expect(app).toContain("if (space >= 1120) return 'full'")
    expect(app).toMatch(/@media \(max-width: 640px\)[\s\S]*translateX\(-50%\)/)
    expect(read('src/viewer/components/GraphFloatingBar.vue')).toMatch(
      /\.floating-bar\.density-full[\s\S]*flex-wrap: nowrap/
    )
  })
})

describe('File insights Risk to change line', () => {
  it('shows the score and band as a word plus colour', () => {
    const w = mount(NodeDetail, {
      props: detailProps({
        ...emptySections,
        hotspot: { score: 82, band: 'high' }
      }) as never
    })
    const line = w.get('[data-testid="risk-to-change"]')
    expect(line.text()).toContain('Risk to change')
    expect(line.text()).toContain('82 (High)')
    expect(line.get('.risk-value').attributes('data-band')).toBe('high')
  })

  it('hides the line on a 1.1 file with no hotspot score', () => {
    const w = mount(NodeDetail, { props: detailProps(emptySections) as never })
    expect(w.find('[data-testid="risk-to-change"]').exists()).toBe(false)
  })
})
