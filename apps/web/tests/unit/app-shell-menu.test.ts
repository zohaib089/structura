import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import AppShell from '../../src/components/ui/AppShell.vue'

describe('AppShell mobile navigation', () => {
  it('exposes a labelled menu button that toggles the sidebar drawer', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
    await router.push('/en/w/ws')
    await router.isReady()
    const wrapper = mount(AppShell, {
      props: {
        workspaceName: 'Platform team', navItems: [], breadcrumbs: [],
        appNavigationLabel: 'App navigation', workspaceLabel: 'Workspace',
        skipToContentLabel: 'Skip', commandPaletteLabel: 'Search', commandPaletteHint: '⌘K'
      },
      global: { plugins: [router] }
    })
    const button = wrapper.get('[data-testid="shell-menu-button"]')
    expect(button.attributes('aria-label')).toBe('App navigation')
    expect(button.attributes('aria-controls')).toBe('app-shell-sidebar')
    expect(wrapper.find('#app-shell-sidebar').exists()).toBe(true)
    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.classes()).toContain('app-shell--nav-open')
    await router.push('/en/w/ws/scans')
    await wrapper.vm.$nextTick()
    expect(button.attributes('aria-expanded')).toBe('false')
  })
})
