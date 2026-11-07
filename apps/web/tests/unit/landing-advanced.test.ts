import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

const { getCurrentSession } = vi.hoisted(() => ({ getCurrentSession: vi.fn() }))
vi.mock('../../src/services/auth', () => ({ getCurrentSession }))

import { BRAND } from '../../../../packages/brand/src/brand'
import LandingHow from '../../src/components/landing/LandingHow.vue'
import ToastStack from '../../src/components/ui/ToastStack.vue'
import { useToast } from '../../src/composables/useToast'
import { LANDING_LINKS } from '../../src/landing-links'
import { landingPageCopy } from '../../src/services/landing-page-copy'
import {
  edgeKey,
  pathToEntry,
  ringCounts,
  SAMPLE_EDGES,
  SAMPLE_NODES
} from '../../src/services/landing-sample-graph'
import HomeView from '../../src/views/HomeView.vue'

const toast = useToast()
const mounted: VueWrapper[] = []

function makeRouter(): Router {
  const stub = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:locale(en)', name: 'localized-home', component: stub },
      { path: '/:locale(en)/viewer', name: 'localized-viewer', component: stub },
      { path: '/:locale(en)/w/:workspace', name: 'ws', component: stub },
      { path: '/:locale(en)/w/:workspace/new', name: 'ws-new', component: stub }
    ]
  })
}

async function mountHome() {
  const router = makeRouter()
  await router.push('/en')
  await router.isReady()
  const wrapper = mount(HomeView, { global: { plugins: [router, createPinia()] }, attachTo: document.body })
  mounted.push(wrapper)
  return { wrapper, router }
}

beforeEach(() => {
  getCurrentSession.mockReturnValue(null)
  vi.useFakeTimers()
})
afterEach(() => {
  while (mounted.length) mounted.pop()?.unmount()
  toast.clear()
  vi.useRealTimers()
})

describe('sample graph data', () => {
  it('has the entry nucleus, three rings and ~31 files', () => {
    expect(SAMPLE_NODES[0]).toMatchObject({ label: 'main.ts', ring: 0, entry: true })
    expect(ringCounts()).toEqual({ 1: 8, 2: 12, 3: 10 })
    expect(SAMPLE_NODES).toHaveLength(31)
  })

  it('uses all three link kinds and only draws edges between real nodes', () => {
    const kinds = new Set(SAMPLE_EDGES.map(edge => edge.kind))
    expect(kinds).toEqual(new Set(['extracted', 'inferred', 'unresolved']))
    for (const edge of SAMPLE_EDGES) {
      expect(SAMPLE_NODES[edge.from]).toBeDefined()
      expect(SAMPLE_NODES[edge.to]).toBeDefined()
    }
    expect(SAMPLE_EDGES.filter(edge => edge.kind === 'unresolved')).toHaveLength(2)
  })

  it('walks every node back to the entry file', () => {
    for (const node of SAMPLE_NODES) {
      const path = pathToEntry(node.id)
      expect(path).toHaveLength(node.ring)
      if (path.length) expect(path[path.length - 1]![0]).toBe(0)
    }
  })
})

describe('landing copy and links', () => {
  it('never uses the previous product name in copy', () => {
    const text = JSON.stringify(landingPageCopy).toLowerCase()
    expect(text).not.toContain(BRAND.legacySlug)
    expect(text).not.toContain('provenance')
    expect(text).not.toContain('static dependency intelligence')
  })

  it('keeps every landing URL in one config', () => {
    expect(LANDING_LINKS.repoUrl).toBe(BRAND.repoUrl)
    expect(LANDING_LINKS.viewerPath).toBe('/viewer')
  })
})

describe('HomeView', () => {
  it('renders the bands in the mockup order with one h1 and no old product name outside the repo link', async () => {
    const { wrapper } = await mountHome()
    const headings = wrapper.findAll('h1, h2').map(h => h.text())
    expect(headings).toEqual([
      "See how your code fits together — and what's risky.",
      'Three steps from folder to map.',
      'Every connection is labelled.',
      'Nothing is skipped silently.',
      'Run it on your own computer or server.',
      'Ready to see your project as a map?'
    ])
    expect(wrapper.find('a.landing-skip').attributes('href')).toBe('#main')

    const text = wrapper.text().toLowerCase()
    expect(text).not.toContain(BRAND.legacySlug)
    const html = wrapper.element.outerHTML.toLowerCase()
    // Only the GitHub repository URL may carry the repo slug.
    const withoutRepoLinks = html.split(BRAND.repoUrl.toLowerCase()).join('')
    expect(withoutRepoLinks).not.toContain(BRAND.legacySlug)
  })

  it('shows the three CTAs with identical labels in the hero and the closing band', async () => {
    const { wrapper } = await mountHome()
    const labels = (root: string) =>
      wrapper.findAll(`${root} a`).map(a => a.text()).filter(t => ['Try the viewer', 'Self-host', 'GitHub'].includes(t))
    expect(labels('#top')).toEqual(['Try the viewer', 'Self-host', 'GitHub'])
    expect(labels('.closing')).toEqual(['Try the viewer', 'Self-host', 'GitHub'])
    expect(wrapper.findAll('.landing-cta--amber')).toHaveLength(2)
    const viewer = wrapper.get('#top a.landing-cta--amber')
    expect(viewer.attributes('href')).toBe('/en/viewer')
  })

  it('offers "Scan a project" to visitors and "Go to your projects" when signed in', async () => {
    const guest = await mountHome()
    expect(guest.wrapper.get('.landing-nav .landing-cta--neutral').text()).toBe('Scan a project')
    expect(guest.wrapper.get('.landing-hero__scan').text()).toContain('Scan a project')
    expect(guest.wrapper.get('.landing-nav .landing-cta--neutral').attributes('href')).toBe('/en/w/pending/new')
    expect(guest.wrapper.text()).not.toContain('Go to your projects')

    getCurrentSession.mockReturnValue({ token: 't' })
    const member = await mountHome()
    expect(member.wrapper.get('.landing-nav .landing-cta--neutral').text()).toBe('Go to your projects')
    expect(member.wrapper.get('.landing-nav .landing-cta--neutral').attributes('href')).toBe('/en/w/pending')
    expect(member.wrapper.text()).not.toContain('Scan a project')
  })

  it('draws the radial graph with an icon and a word for every severity, a text list and keyboard-focusable nodes', async () => {
    const { wrapper } = await mountHome()
    const nodes = wrapper.findAll('.radial__node')
    expect(nodes).toHaveLength(31)
    for (const node of nodes) {
      expect(node.attributes('tabindex')).toBe('0')
      expect(node.attributes('aria-label')).toMatch(/\.$/)
    }
    // Severity words are in the accessible name, never colour alone.
    expect(wrapper.get('[data-node-id="3"]').attributes('aria-label')).toContain('Critical issue')
    expect(wrapper.get('[data-node-id="6"]').attributes('aria-label')).toContain('No issues found')
    expect(wrapper.findAll('.radial__edge--inferred').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.radial__edge--unresolved').length).toBeGreaterThan(0)
    expect(wrapper.find('.radial__node--unresolved').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sample data — a made-up project')
    expect(wrapper.findAll('#landing-graph-desc li')).toHaveLength(30)
    expect(wrapper.get('svg[data-testid="landing-radial"]').attributes('aria-describedby')).toBe('landing-graph-desc')
  })

  it('highlights the path to main.ts on hover and focus, and tells the inspector', async () => {
    const { wrapper } = await mountHome()
    const inspector = wrapper.get('[data-testid="landing-inspector"]')
    expect(inspector.text()).toContain('main.ts — where the project starts')

    // ScanReport (id 12) sits two steps out.
    await wrapper.get('[data-node-id="12"]').trigger('mouseenter')
    expect(wrapper.find('.radial--dim').exists()).toBe(true)
    expect(inspector.text()).toContain('ScanReport')
    expect(inspector.text()).toContain('High issue')
    expect(inspector.text()).toContain('2 steps from main.ts')
    const hot = wrapper.findAll('.radial__edge.is-hot')
    expect(hot).toHaveLength(pathToEntry(12).length)
    expect(pathToEntry(12).every(([from, to]) => SAMPLE_EDGES.some(e => edgeKey(e.from, e.to) === edgeKey(from, to)))).toBe(true)

    await wrapper.get('[data-node-id="12"]').trigger('mouseleave')
    expect(wrapper.find('.radial--dim').exists()).toBe(false)

    await wrapper.get('[data-node-id="1"]').trigger('focus')
    expect(inspector.text()).toContain('router.ts')
    await wrapper.get('[data-node-id="1"]').trigger('blur')
    expect(inspector.text()).toContain('main.ts — where the project starts')
  })

  it('toggles a selected node with Enter', async () => {
    const { wrapper } = await mountHome()
    const node = wrapper.get('[data-node-id="2"]')
    await node.trigger('keydown', { key: 'Enter' })
    expect(node.classes()).toContain('is-selected')
    await node.trigger('keydown', { key: 'Enter' })
    expect(node.classes()).not.toContain('is-selected')
  })

  it('fires the "Sample project loaded" toast once after the graph draws and clears it on leave', async () => {
    const stack = mount(ToastStack, { attachTo: document.body })
    const { wrapper } = await mountHome()
    expect(toast.toasts).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1600)
    expect(toast.toasts.map(t => t.title)).toEqual(['Sample project loaded'])
    wrapper.unmount()
    mounted.pop()
    await nextTick()
    expect(toast.toasts).toHaveLength(0)
    stack.unmount()
  })

  it('offers an icon-only theme toggle in the landing header', async () => {
    const { wrapper } = await mountHome()
    const toggle = wrapper.get('.landing-nav [data-testid="theme-toggle"]')
    expect(toggle.attributes('aria-label')).toBe('Toggle theme')
  })

  it('sets and restores the document title', async () => {
    document.title = 'Before'
    const { wrapper } = await mountHome()
    expect(document.title).toBe(landingPageCopy.documentTitle)
    expect(document.title.toLowerCase()).not.toContain(BRAND.legacySlug)
    wrapper.unmount()
    mounted.pop()
    expect(document.title).toBe('Before')
  })
})

describe('scan demo', () => {
  async function mountHow() {
    const router = makeRouter()
    await router.push('/en')
    await router.isReady()
    const wrapper = mount(LandingHow, { global: { plugins: [router] }, attachTo: document.body })
    mounted.push(wrapper)
    return { wrapper, router }
  }

  it('shows the shipped HexLoader on step 2 as a decorative mark next to a live status line', async () => {
    const { wrapper } = await mountHow()
    const demo = wrapper.get('[data-testid="scan-demo"]')
    expect(demo.find('.hex-loader').exists()).toBe(true)
    expect(demo.find('.hex-loader').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('[data-testid="scan-status"]').attributes('role')).toBe('status')
  })

  it('cycles the phases, then fires a success toast with a View map action', async () => {
    const { wrapper, router } = await mountHow()
    await wrapper.get('[data-testid="run-scan"]').trigger('click')
    expect(toast.toasts[0]?.title).toBe('Scan started')
    expect(wrapper.get('[data-testid="scan-title"]').text()).toBe('Preparing files')
    expect(wrapper.get('[data-testid="run-scan"]').attributes('disabled')).toBeDefined()

    await vi.advanceTimersByTimeAsync(1100)
    expect(wrapper.get('[data-testid="scan-title"]').text()).toBe('Analysing code')
    await vi.advanceTimersByTimeAsync(1100 * 4)
    expect(wrapper.get('[data-testid="scan-title"]').text()).toBe('Scan finished')
    expect(wrapper.get('[data-testid="scan-status"]').text()).toBe('142 of 150 files checked')
    expect(wrapper.find('.hex-loader').exists()).toBe(false)

    const done = toast.toasts.find(t => t.title === 'Scan finished')
    expect(done?.variant).toBe('success')
    expect(done?.action?.label).toBe('View map')
    // Toasts never carry HTTP codes or ids.
    expect(`${done?.title} ${done?.body}`).not.toMatch(/\b[1-5]\d\d\b(?! files)|id[:=]/i)
    done?.action?.onAction()
    await vi.advanceTimersByTimeAsync(0)
    expect(router.currentRoute.value.path).toBe('/en/viewer')
    expect(wrapper.get('[data-testid="run-scan"]').attributes('disabled')).toBeUndefined()
  })

  it('previews info, warning and error notifications and removes them on unmount', async () => {
    const { wrapper } = await mountHow()
    await wrapper.get('[data-testid="preview-toasts"]').trigger('click')
    expect(toast.toasts.map(t => t.variant).sort()).toEqual(['error', 'info', 'warning'])
    expect(toast.toasts.find(t => t.variant === 'error')?.duration).toBeNull()
    wrapper.unmount()
    mounted.pop()
    expect(toast.toasts).toHaveLength(0)
  })
})
