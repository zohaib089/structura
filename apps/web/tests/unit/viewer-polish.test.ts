import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readOnboarded, writeOnboarded } from '../../src/hosted-onboarding'
import { budgetTone } from '../../src/viewer/budget-tone'
import BudgetMeter from '../../src/viewer/components/BudgetMeter.vue'
import CoachMark from '../../src/viewer/components/CoachMark.vue'
import DriftPanel from '../../src/viewer/components/DriftPanel.vue'
import FocusBar from '../../src/viewer/components/FocusBar.vue'
import GraphLegend from '../../src/viewer/components/GraphLegend.vue'
import OverviewEdge from '../../src/viewer/components/OverviewEdge.vue'
import OverviewNode from '../../src/viewer/components/OverviewNode.vue'
import SearchPalette from '../../src/viewer/components/SearchPalette.vue'
import Tip from '../../src/viewer/components/Tip.vue'
import { fitDurationMs, motionMs, prefersReducedMotion } from '../../src/viewer/motion'
import { highlightParts, truncateMiddle } from '../../src/viewer/text'
import type { OverviewEdgeModel, SearchHit } from '../../src/viewer/overview'

const nodeProps = {
  id: 'dir:apps',
  label: 'apps',
  kind: 'directory',
  cluster: true,
  clusterSize: 4,
  expanded: false,
  more: false,
  remainder: 0,
  selected: false,
  dimmed: false,
  tabIndex: 0,
  path: 'apps/web/src/viewer/components/GraphCanvas.vue',
  moreLabel: '+1 more',
  expandLabel: 'Expand',
  collapseLabel: 'Collapse'
}

function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() { return store.size },
    clear() { store.clear() },
    getItem(key) { return store.get(key) ?? null },
    key(index) { return [...store.keys()][index] ?? null },
    removeItem(key) { store.delete(key) },
    setItem(key, value) { store.set(key, value) }
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('v2 viewer polish', () => {
  it('keeps the budget meter neutral through comfort, info above it, and warning at the cap', () => {
    expect(budgetTone(0, 150, 1000)).toBe('neutral')
    expect(budgetTone(150, 150, 1000)).toBe('neutral')
    expect(budgetTone(151, 150, 1000)).toBe('detail')
    expect(budgetTone(999, 150, 1000)).toBe('detail')
    expect(budgetTone(1000, 150, 1000)).toBe('limit')

    const quiet = mount(BudgetMeter, {
      props: { text: '150 of 1000 visible', ratio: 0.15, warn: false, full: false, nearLabel: 'near', fullLabel: 'full', hiddenLabel: '', tone: 'neutral', detailLabel: 'Detail reduced', limitLabel: 'Limit reached' }
    })
    expect(quiet.attributes('data-tone')).toBe('neutral')
    expect(quiet.text()).not.toContain('Detail reduced')

    const detail = mount(BudgetMeter, {
      props: { text: '151 of 1000 visible', ratio: 0.151, warn: true, full: false, nearLabel: 'near', fullLabel: 'full', hiddenLabel: '', tone: 'detail', detailLabel: 'Detail reduced', limitLabel: 'Limit reached' }
    })
    expect(detail.attributes('data-tone')).toBe('detail')
    expect(detail.text()).toContain('Detail reduced')

    const limit = mount(BudgetMeter, {
      props: { text: '1000 of 1000 visible', ratio: 1, warn: false, full: true, nearLabel: 'near', fullLabel: 'full', hiddenLabel: '', tone: 'limit', detailLabel: 'Detail reduced', limitLabel: 'Limit reached: collapse or filter to see more' }
    })
    expect(limit.attributes('data-tone')).toBe('limit')
    expect(limit.text()).toContain('▲')
    expect(limit.text()).toContain('Limit reached')
  })

  it('dims non-neighbours in focus and keeps their names available to assistive tech', () => {
    const dimmed = mount(OverviewNode, {
      global: { stubs: { Handle: true } },
      props: { ...nodeProps, dimmed: true }
    })
    expect(dimmed.classes()).toContain('is-dimmed')
    expect(dimmed.text()).toContain('apps')
    expect(dimmed.attributes('aria-label')).toBe('apps')

    const focused = mount(OverviewNode, {
      global: { stubs: { Handle: true } },
      props: { ...nodeProps, dimmed: false, selected: true }
    })
    expect(focused.classes()).not.toContain('is-dimmed')
    expect(focused.classes()).toContain('is-selected')
  })

  it('collapses motion durations when reduced motion is requested', () => {
    expect(motionMs('--duration-slow', 400, true)).toBe(0)
    expect(motionMs('--duration-flow', 1600, true)).toBe(0)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() { return false }
    }))
    expect(prefersReducedMotion()).toBe(true)
    expect(fitDurationMs()).toBe(0)
  })

  it('moves the search palette with the arrow keys and jumps on enter', async () => {
    const hits: SearchHit[] = [
      { id: 'dir:apps', label: 'apps', path: 'apps', kind: 'directory', score: 1 },
      { id: 'file:src/app.ts', label: 'app.ts', path: 'src/app.ts', kind: 'file', score: 1 },
      { id: 'sym:foo', label: 'foo', path: 'src/foo.ts', kind: 'symbol', score: 1 }
    ]
    const wrapper = mount(SearchPalette, {
      props: {
        label: 'Search',
        placeholder: 'Find',
        none: 'none',
        hint: '',
        more: '',
        footer: '',
        hits,
        total: 3,
        query: 'ap',
        clustersLabel: 'Clusters',
        filesLabel: 'Files',
        symbolsLabel: 'Symbols'
      }
    })
    expect(wrapper.text()).toContain('Clusters')
    expect(wrapper.text()).toContain('Files')
    expect(wrapper.find('mark').text()).toBe('ap')
    expect(wrapper.html()).not.toContain('v-html')

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.get('[aria-selected="true"]').attributes('id')).toBe('hit-file:src/app.ts')
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.get('[aria-selected="true"]').attributes('id')).toBe('hit-dir:apps')
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('choose')?.[0]).toEqual(['dir:apps'])
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.classes()).not.toContain('is-solid')

    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-transparency'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() { return false }
    }))
    const solid = mount(SearchPalette, {
      props: {
        label: 'Search',
        placeholder: 'Find',
        none: 'none',
        hint: '',
        more: '',
        footer: '',
        hits,
        total: 3,
        query: '',
        clustersLabel: 'Clusters',
        filesLabel: 'Files',
        symbolsLabel: 'Symbols'
      }
    })
    expect(solid.classes()).toContain('is-solid')
  })

  it('shows a tooltip immediately on focus and after the delay on hover', async () => {
    vi.useFakeTimers()
    const wrapper = mount(Tip, { props: { text: 'Zoom in' }, slots: { default: '<button type="button">+</button>' } })
    await wrapper.trigger('mouseenter')
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(400)
    expect(wrapper.find('[role="tooltip"]').text()).toBe('Zoom in')
    await wrapper.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)

    await wrapper.trigger('focusin')
    expect(wrapper.find('[role="tooltip"]').text()).toBe('Zoom in')
  })

  it('truncates paths in the middle', () => {
    expect(truncateMiddle('apps', 28)).toBe('apps')
    const long = 'apps/web/src/viewer/components/GraphCanvas.vue'
    const short = truncateMiddle(long, 28)
    expect(short).toContain('…')
    expect(short.startsWith('apps')).toBe(true)
    expect(short.endsWith('.vue')).toBe(true)
    expect(short.length).toBeLessThanOrEqual(28)
    expect(highlightParts('AppCanvas', 'app')).toEqual([
      { text: 'App', match: true },
      { text: 'Canvas', match: false }
    ])
  })

  it('dismisses the coach mark without writing storage', async () => {
    const before = localStorage.length
    const coach = mount(CoachMark, {
      props: {
        steps: ['Expand a cluster', 'Focus a node', 'Open Coverage'],
        skipLabel: 'Skip',
        nextLabel: 'Next',
        openLabel: 'Tips'
      },
      attachTo: document.body
    })
    // Coach starts collapsed as a Tips chip (phone + desktop).
    expect(coach.text()).toContain('Tips')
    await coach.get('[data-testid="coach-expand"]').trigger('click')
    expect(coach.text()).toContain('Expand a cluster')
    await coach.get('button').trigger('click')
    expect(coach.text()).toContain('Focus a node')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(coach.emitted('dismiss')).toHaveLength(1)
    expect(localStorage.length).toBe(before)
    coach.unmount()

    const skipped = mount(CoachMark, {
      props: { steps: ['Expand a cluster'], skipLabel: 'Skip', nextLabel: 'Next', openLabel: 'Tips' }
    })
    await skipped.get('[data-testid="coach-expand"]').trigger('click')
    // Skip is the dismiss control once expanded (Next is first among action buttons).
    const buttons = skipped.findAll('button')
    const skip = buttons.find((b) => b.text() === 'Skip') ?? buttons[buttons.length - 1]!
    await skip.trigger('click')
    expect(skipped.emitted('dismiss')).toHaveLength(1)
  })

  it('remembers onboarding only through the hosted helper', () => {
    const storage = memoryStorage()
    expect(readOnboarded(storage)).toBe(false)
    writeOnboarded(storage)
    expect(readOnboarded(storage)).toBe(true)
    expect(storage.getItem('atlasmith-onboarded')).toBe('1')
  })

  it('keeps drift unconfigured until findings exist, then groups them by rule', async () => {
    const idle = mount(DriftPanel, {
      props: {
        title: 'No architecture file found',
        body: 'This graph does not include drift findings. A declared architecture file is not in the scan.',
        status: 'Not configured',
        snippetLabel: 'Example',
        snippet: 'layers: []\nrules: []\n',
        copyLabel: 'Copy'
      }
    })
    expect(idle.text()).toContain('Not configured')
    expect(idle.text().toLowerCase()).not.toContain('check')
    expect(idle.text()).not.toContain('passed')
    expect(idle.text()).not.toContain('Passing')

    const findings = mount(DriftPanel, {
      props: {
        title: 'unused',
        body: 'unused',
        status: 'unused',
        snippetLabel: 'unused',
        snippet: '',
        copyLabel: 'Copy',
        failingLabel: 'Failing · 2 violations',
        passingLabel: 'Passing',
        findings: [
          { rule: 'layer-boundary', edgeId: 'e1', label: 'apps to packages', failing: true },
          { rule: 'layer-boundary', edgeId: 'e2', label: 'apps to web', failing: false },
          { rule: 'import-cycle', edgeId: 'e3', label: 'cycle', failing: true }
        ]
      }
    })
    expect(findings.text()).toContain('Failing · 2 violations')
    expect(findings.text()).not.toContain('Not configured')
    expect(findings.findAll('h3').map((heading) => heading.text())).toEqual(['layer-boundary', 'import-cycle'])
    await findings.get('button').trigger('click')
    expect(findings.emitted('focus')?.[0]).toEqual(['e1'])

    const clear = mount(DriftPanel, {
      props: {
        title: 'unused',
        body: 'unused',
        status: 'unused',
        snippetLabel: 'unused',
        snippet: '',
        copyLabel: 'Copy',
        failingLabel: 'Failing Â· 0 violations',
        passingLabel: 'Passing',
        findings: []
      }
    })
    expect(clear.text()).toContain('Passing')
    expect(clear.text()).not.toContain('passed')
  })

  it('does not animate unresolved edges and presses legend filters', () => {
    const edge: OverviewEdgeModel = {
      id: 'e1',
      source: 'a',
      target: 'b',
      provenance: 'EXTRACTED',
      resolved: false,
      weight: 1,
      visual: 'unresolved',
      hierarchy: false,
      role: 'cross',
      extracted: 0,
      inferred: 0,
      unresolved: 1,
      importKind: '',
      typeOnly: '',
      label: '',
      flowing: true
    }
    const wrapper = mount(OverviewEdge, {
      props: {
        id: 'e1',
        source: 'a',
        target: 'b',
        sourceX: 0,
        sourceY: 0,
        targetX: 80,
        targetY: 0,
        data: edge
      }
    })
    expect(wrapper.classes()).not.toContain('is-flowing')

    const legend = mount(GraphLegend, {
      props: {
        title: 'Legend',
        rows: [
          { visual: 'extracted', label: 'Extracted', count: '1', active: true },
          { visual: 'inferred', label: 'Inferred', count: '1', active: false }
        ]
      }
    })
    expect(legend.findAll('button')[0].attributes('aria-pressed')).toBe('true')
    expect(legend.findAll('button')[1].attributes('aria-pressed')).toBe('false')
  })

  it('steps focus depth only inside the cap', async () => {
    const focus = mount(FocusBar, {
      props: {
        label: 'Focus mode',
        name: 'apps',
        dependencies: 'Dependencies',
        dependents: 'Dependents',
        both: 'Both',
        depthLabel: 'Depth 6',
        confirmedOnly: 'Confirmed only',
        confirmed: 'Confirmed: 1',
        possible: 'Possible: +0',
        unresolved: '',
        none: '',
        exit: 'Exit focus',
        direction: 'out',
        depth: 6,
        confirmedOnlyOn: false,
        chip: 'Focused: apps · depth 6',
        escHint: 'Esc'
      }
    })
    expect(focus.text()).toContain('Focused: apps · depth 6')
    const buttons = focus.findAll('button')
    await buttons[1].trigger('click')
    expect(focus.emitted('depth')?.[0]).toEqual([6])
  })

  it('uses the shared focus ring for keyboard focus and keeps amber on selection', () => {
    const base = readFileSync(resolve('src/viewer/viewer-base.css'), 'utf8')
    expect(base).toContain('box-shadow: var(--focus-ring)')
    expect(base).not.toContain('brand-amber-ui')

    const nodeSource = readFileSync(resolve('src/viewer/components/OverviewNode.vue'), 'utf8')
    expect(nodeSource).toMatch(/\.overview-node:focus-visible\s*\{[^}]*var\(--focus-ring\)/)
    expect(nodeSource).toMatch(/\.is-selected\s*\{[\s\S]*var\(--graph-selected-ring/)

    const meter = readFileSync(resolve('src/viewer/components/BudgetMeter.vue'), 'utf8')
    expect(meter).toContain('var(--graph-budget-track')
  })

  it('keeps legacy blue accent tokens out of viewer sources', () => {
    const paths = [
      resolve('src/viewer/viewer-base.css'),
      resolve('src/viewer/components/GraphSourcePicker.vue'),
      resolve('src/viewer/components/SearchPalette.vue'),
      resolve('src/viewer/ViewerApp.vue')
    ]
    for (const path of paths) {
      const text = readFileSync(path, 'utf8')
      expect(text.includes('--color-accent-primary'), path).toBe(false)
      expect(text.includes('shadow-accent-glow'), path).toBe(false)
    }
  })
})

