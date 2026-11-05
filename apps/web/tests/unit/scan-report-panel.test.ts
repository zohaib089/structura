import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import ScanReportPanel from '../../src/components/dashboard/ScanReportPanel.vue'
import type { ReportFinding, ScanReportV1 } from '../../src/api/scan-report-types'
import { clearToasts, useToast } from '../../src/composables/useToast'
import type { GraphDocument } from '../../src/viewer/graph-types'

const BASE = '/en/w/ws-1/projects/proj-1/scans/scan-1'

function finding(id: string, overrides: Partial<ReportFinding> = {}): ReportFinding {
  return {
    id,
    section: 'violations',
    severity: 'medium',
    file: `src/${id}.ts`,
    line: 3,
    message: `Message ${id}`,
    provenance: 'EXTRACTED',
    ...overrides
  }
}

function makeReport(overrides: Partial<ScanReportV1> = {}): ScanReportV1 {
  return {
    schemaVersion: '1.0.0',
    generatedAt: '2026-11-02T12:00:00.000Z',
    analysers: {
      eslint: { status: 'ran', durationMs: 120 },
      'swift-modules': { status: 'skipped', durationMs: 0, reason: 'No Swift sources' }
    },
    history: null,
    findings: [
      finding('gateway', { severity: 'critical', file: 'packages/core/src/gateway.ts', message: 'Layer bypass: api to ui' }),
      finding('upload', { severity: 'critical', section: 'security', file: 'apps/api/src/upload.ts', message: 'Untrusted path join' }),
      finding('router', { severity: 'high', file: 'apps/web/src/router.ts', message: 'Circular dependency' }),
      finding('view', { severity: 'high', section: 'badPractices', file: 'apps/web/src/views/DashboardView.vue', message: 'God component' }),
      finding('misc', { severity: 'low', file: 'apps/api/src/misc.ts', message: 'Minor thing' })
    ],
    improvements: [],
    ...overrides
  }
}

function makeGraph(): GraphDocument {
  return {
    schemaVersion: '1.0.0',
    summary: { nodes: 0, edges: 0, files: 0 },
    coverage: {
      files: { discovered: 1390, parsed: 1200, partial: 84, failed: 0, skipped: 0, ignored: 0 },
      byLanguage: [],
      skipped: [],
      ignored: [],
      unresolved: [{ reason: 'Missing protobuf import', count: 3 }],
      accounting: { discovered: 1390, accounted: 1390 }
    },
    nodes: [],
    edges: []
  }
}

async function mountPanel(url: string, props: Record<string, unknown> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:locale/w/:workspace/projects/:projectId/scans',
        component: defineComponent({ render: () => h('div') })
      },
      {
        path: '/:locale/w/:workspace/projects/:projectId/scans/:scanId/:tab?',
        component: defineComponent({ render: () => h('div') })
      }
    ]
  })
  await router.push(url)
  await router.isReady()
  const wrapper = mount(ScanReportPanel, {
    props: {
      locale: 'en',
      report: makeReport(),
      scanId: 'scan-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      graph: makeGraph(),
      ...props
    },
    global: { plugins: [router] },
    attachTo: document.body
  })
  await flushPromises()
  return { wrapper, router }
}

afterEach(() => {
  clearToasts()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('ScanReportPanel (summary-first)', () => {
  it('opens on Summary with coverage, severity words and top findings', async () => {
    const { wrapper } = await mountPanel(BASE)
    const selected = wrapper.get('[role="tab"][aria-selected="true"]')
    expect(selected.text()).toContain('Summary')

    const text = wrapper.text()
    expect(text).toContain('92%')
    expect(text).toContain('1,284 / 1,390')
    for (const word of ['Critical', 'High', 'Medium', 'Low', 'Info']) expect(text).toContain(word)
    expect(text).toContain('Top findings')
    expect(text).toContain('Layer bypass: api to ui')
    // severity is icon + word, never colour only
    expect(wrapper.findAll('.severity-link svg').length).toBe(5)
    // the summary view has no filter wall
    expect(wrapper.find('[data-testid="filter-path"]').exists()).toBe(false)
  })

  it('shows critical and high as separate counts', async () => {
    const { wrapper } = await mountPanel(BASE)
    const links = wrapper.findAll('.severity-link').map(link => link.text().replace(/\s+/g, ' '))
    expect(links.find(text => text.startsWith('Critical'))).toMatch(/^Critical\s*2$/)
    expect(links.find(text => text.startsWith('High'))).toMatch(/^High\s*2$/)
  })

  it('puts skipped analysers and unresolved imports after the top findings, as secondary content', async () => {
    const { wrapper } = await mountPanel(BASE)
    const html = wrapper.html()
    const top = html.indexOf('Top findings')
    const skipped = html.indexOf('Skipped checks')
    const unresolved = html.indexOf('Unresolved imports')
    expect(top).toBeGreaterThan(-1)
    expect(skipped).toBeGreaterThan(top)
    expect(unresolved).toBeGreaterThan(top)
    expect(wrapper.text()).toContain('No Swift sources')
    expect(wrapper.text()).toContain('Missing protobuf import')
    // jargon is explained in plain language
    expect(wrapper.text()).toContain('Analysers are the individual checks we run')
  })

  it('explains what the person is seeing on every tab and tooltips the tab names', async () => {
    const { wrapper, router } = await mountPanel(BASE)
    expect(wrapper.get('[data-testid="report-hint"]').text()).toContain('quick health check')
    await router.push(`${BASE}/security`)
    await flushPromises()
    expect(wrapper.get('[data-testid="report-hint"]').text()).toContain('security')
    expect(wrapper.get('#report-tab-violations').attributes('title')).toContain('quality rule')
  })

  it('shows counts on tabs where data exists', async () => {
    const { wrapper } = await mountPanel(BASE)
    const tab = (id: string) => wrapper.get(`#report-tab-${id}`).text()
    expect(tab('findings')).toContain('5')
    expect(tab('security')).toContain('1')
    expect(tab('violations')).toContain('3')
    expect(wrapper.get('#report-tab-summary').text()).toBe('Summary')
  })

  it('links severity counts to the findings list narrowed to that severity', async () => {
    const { wrapper, router } = await mountPanel(BASE)
    const critical = wrapper.findAll('.severity-link').find(link => link.text().startsWith('Critical'))!
    await critical.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`${BASE}/findings`)
    expect(router.currentRoute.value.query.sev).toBe('critical')
    const rows = wrapper.findAll('[data-testid="findings-table"] tbody tr')
    expect(rows).toHaveLength(2)
    expect(wrapper.text()).toContain('Showing 2 of 5 findings')
  })

  it('restores tab and filters from the URL (reload keeps state)', async () => {
    const { wrapper } = await mountPanel(`${BASE}/findings?sev=high&path=apps/web`)
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain('All findings')
    const rows = wrapper.findAll('[data-testid="findings-table"] tbody tr')
    expect(rows).toHaveLength(2)
    expect(wrapper.get('[data-testid="filter-sev-high"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="filter-sev-critical"]').attributes('aria-pressed')).toBe('false')
    expect((wrapper.get('[data-testid="filter-path"]').element as HTMLInputElement).value).toBe('apps/web')
  })

  it('writes filter edits to the URL and can clear them', async () => {
    const { wrapper, router } = await mountPanel(`${BASE}/findings`)
    await wrapper.get('[data-testid="filter-sev-low"]').trigger('click')
    await flushPromises()
    expect(String(router.currentRoute.value.query.sev)).not.toContain('low')

    const input = wrapper.get('[data-testid="filter-path"]')
    await input.setValue('apps/api')
    await flushPromises()
    expect(router.currentRoute.value.query.path).toBe('apps/api')

    await wrapper.get('[data-testid="filter-clear"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({})
    expect(wrapper.findAll('[data-testid="findings-table"] tbody tr')).toHaveLength(5)
  })

  it('shows a filtered-empty state with a clear action', async () => {
    const { wrapper, router } = await mountPanel(`${BASE}/findings?path=does-not-exist`)
    const empty = wrapper.get('[data-testid="findings-empty-filtered"]')
    expect(empty.text()).toContain('No findings match your filters')
    await empty.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.path).toBeUndefined()
    expect(wrapper.find('[data-testid="findings-table"]').exists()).toBe(true)
  })

  it('shows a plain-language empty state with a next step on an empty tab', async () => {
    const report = makeReport({ findings: [finding('only', { severity: 'low' })] })
    const { wrapper, router } = await mountPanel(`${BASE}/security`, { report })
    const empty = wrapper.get('[data-testid="findings-empty-none"]')
    expect(empty.text()).toContain('No security findings in this scan')
    expect(empty.text()).toContain('Check All findings')
    await empty.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`${BASE}/findings`)
  })

  it('shows an all-clear summary when nothing was found', async () => {
    const { wrapper } = await mountPanel(BASE, { report: makeReport({ findings: [] }) })
    expect(wrapper.text()).toContain('No problems found')
    expect(wrapper.text()).toContain('Open the graph')
  })

  it('degrades the Graph tab to a retryable message when the graph is unavailable', async () => {
    const { wrapper } = await mountPanel(`${BASE}/graph`, { graph: null, graphError: true })
    expect(wrapper.find('[data-testid="error-state"]').text()).toContain('graph is not available')
    await wrapper.get('[data-testid="error-state"] button').trigger('click')
    expect(wrapper.emitted('retryGraph')).toHaveLength(1)
    // the rest of the report keeps working
    expect(wrapper.find('#report-tab-summary').exists()).toBe(true)
  })

  it('keeps the Summary usable while the graph is still loading', async () => {
    const { wrapper } = await mountPanel(BASE, { graph: null, graphLoading: true })
    expect(wrapper.text()).toContain('Top findings')
    // secondary sections that depend on the graph wait for it
    expect(wrapper.text()).not.toContain('What we could not check')
  })

  it('cross-links findings and the header to the Graph tab', async () => {
    const { wrapper } = await mountPanel(`${BASE}/findings`)
    const graphLinks = wrapper.findAll('a').filter(link => link.text() === 'Show in graph')
    expect(graphLinks.length).toBeGreaterThan(0)
    expect(graphLinks[0]!.attributes('href')).toContain('/graph')
    expect(wrapper.text()).toContain('Open graph')
  })
})

describe('ScanReportPanel export', () => {
  it('downloads the chosen format and confirms with a plain-language toast', async () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const { wrapper } = await mountPanel(`${BASE}/findings?sev=critical`)
    await wrapper.get('[data-testid="report-export-trigger"]').trigger('click')
    expect(wrapper.text()).toContain('Includes the 2 findings matching your current filters.')
    await wrapper.get('[data-testid="report-export-json"]').trigger('click')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalled()
    const toast = useToast().toasts[0]
    expect(toast?.variant).toBe('success')
    expect(toast?.title).toBe('Report downloaded')
    expect(toast?.body).toContain('scan-report-scan-1.json')
    expect(`${toast?.title} ${toast?.body}`).not.toMatch(/\b[45]\d\d\b|HTTP/)
  })

  it('shows a sticky, plain-language error toast with Try again when export fails', async () => {
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: () => {
        throw new Error('boom')
      },
      revokeObjectURL: vi.fn()
    }))
    const { wrapper } = await mountPanel(BASE)
    await wrapper.get('[data-testid="report-export-trigger"]').trigger('click')
    await wrapper.get('[data-testid="report-export-markdown"]').trigger('click')

    const toast = useToast().toasts[0]
    expect(toast?.variant).toBe('error')
    expect(toast?.title).toBe('Could not download the report')
    expect(toast?.action?.label).toBe('Try again')
    expect(toast?.duration).toBeNull()
    expect(`${toast?.title} ${toast?.body}`).not.toContain('boom')
  })
})
