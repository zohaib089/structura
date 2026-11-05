import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import AppShell from '../../src/components/ui/AppShell.vue'

describe('app shell + graph viewport containment', () => {
  it('locks the shell to the viewport and supports flush/fill content panes', async () => {
    const wrapper = mount(AppShell, {
      props: {
        workspaceName: 'tes',
        navItems: [
          { id: 'projects', label: 'Projects', to: '/en/w/ws', active: false },
          { id: 'scans', label: 'Scans', to: '/en/w/ws/scans', active: true },
          { id: 'settings', label: 'Settings', to: '/en/w/ws/settings', active: false }
        ],
        breadcrumbs: [{ label: 'tes' }],
        appNavigationLabel: 'App',
        workspaceLabel: 'Workspace',
        skipToContentLabel: 'Skip',
        commandPaletteLabel: 'Search',
        commandPaletteHint: '⌘K',
        fillContent: true
      },
      global: {
        stubs: {
          RouterLink: true
        }
      }
    })

    expect(wrapper.get('.app-shell').classes()).toContain('app-shell')
    const content = wrapper.get('#app-main-content')
    expect(content.classes()).toContain('shell-content--fill')
    expect(content.classes()).not.toContain('shell-content--flush')
    expect(wrapper.find('.shell-content-body').exists()).toBe(true)

    await wrapper.setProps({ flushContent: true, fillContent: true })
    const flushed = wrapper.get('#app-main-content')
    expect(flushed.classes()).toContain('shell-content--flush')
    expect(flushed.classes()).not.toContain('shell-content--fill')
    wrapper.unmount()

    const shellSource = readFileSync(
      resolve(__dirname, '../../src/components/ui/AppShell.vue'),
      'utf8'
    )
    expect(shellSource).toContain('height: 100dvh')
    expect(shellSource).toContain('max-height: 100dvh')
    expect(shellSource).toMatch(/\.app-shell\s*\{[^}]*overflow:\s*hidden/s)
    expect(shellSource).toContain('.shell-content--fill')
    expect(shellSource).toContain('.shell-content--flush')
  })

  it('keeps the embedded viewer overflow clipped so closed filter rails cannot escape', async () => {
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

    const { default: ViewerApp } = await import('../../src/viewer/ViewerApp.vue')
    const wrapper = mount(ViewerApp, {
      props: {
        embedded: true,
        locale: 'en',
        shellTheme: 'light',
        graphDocument: null
      },
      attachTo: document.body
    })

    const viewer = wrapper.get('.viewer.viewer-embedded')
    expect(viewer.classes()).toContain('viewer-radial')
    expect(wrapper.get('aside.rail').classes()).toContain('rail')
    wrapper.unmount()

    const viewerSource = readFileSync(
      resolve(__dirname, '../../src/viewer/ViewerApp.vue'),
      'utf8'
    )
    expect(viewerSource).toMatch(/\.viewer\.viewer-radial\s*\{[^}]*overflow:\s*hidden/s)
    expect(viewerSource).toContain('.viewer.viewer-radial:not(.viewer-embedded) .rail')
    expect(viewerSource).toContain('.viewer.viewer-radial:not(.viewer-embedded) .inspector')
  })

  it('wires report Graph tab and scan graph view to flex-fill rather than viewport-tall hacks', () => {
    const reportSource = readFileSync(
      resolve(__dirname, '../../src/components/dashboard/ScanReportPanel.vue'),
      'utf8'
    )
    expect(reportSource).toContain("report--graph': activeTab === 'graph'")
    expect(reportSource).toContain('.report--graph')
    expect(reportSource).toContain('flex: 1 1 auto')
    expect(reportSource).not.toMatch(/report--graph[^{]*\{[\s\S]*100dvh/)

    const graphSource = readFileSync(
      resolve(__dirname, '../../src/views/dashboard/ScanGraphView.vue'),
      'utf8'
    )
    expect(graphSource).not.toContain('100dvh')
    expect(graphSource).toContain('block-size: 100%')

    const viewerSource = readFileSync(
      resolve(__dirname, '../../src/viewer/ViewerApp.vue'),
      'utf8'
    )
    expect(viewerSource).toContain('overflow: hidden')
    expect(viewerSource).toContain('.viewer.viewer-radial:not(.viewer-embedded) .rail')
  })
})
