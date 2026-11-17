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
        skipToContentLabel: 'Skip', commandPaletteLabel: 'Search', commandPaletteHint: '⌘K',
        closeNavigationLabel: 'Close'
      },
      global: { plugins: [router] },
      attachTo: document.body
    })
    const button = wrapper.get('[data-testid="shell-menu-button"]')
    expect(button.attributes('aria-label')).toBe('App navigation')
    expect(button.attributes('aria-controls')).toBe('app-shell-sidebar')
    expect(wrapper.find('#app-shell-sidebar').exists()).toBe(true)
    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.classes()).toContain('app-shell--nav-open')
    await wrapper.vm.$nextTick()
    const close = wrapper.get('#app-shell-sidebar [data-testid="shell-close-button"]')
    expect(close.attributes('aria-label')).toBe('Close')
    expect(document.activeElement).toBe(close.element)
    await close.trigger('click')
    await wrapper.vm.$nextTick()
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button.element)
    expect(wrapper.find('[data-testid="shell-mobile-brand"] svg[role="img"]').exists()).toBe(true)
    await button.trigger('click')
    await router.push('/en/w/ws/scans')
    await wrapper.vm.$nextTick()
    expect(button.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('collapses the desktop sidebar to a remembered icon rail and switches workspaces from real data', async () => {
    window.localStorage.removeItem('atlasmith.shell.sidebarRail')
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
    await router.push('/en/w/ws')
    await router.isReady()
    const props = {
      workspaceName: 'Platform team', breadcrumbs: [],
      navItems: [{ id: 'scans', label: 'Scans', to: '/en/w/ws/scans', active: true, group: 'Workspace' }],
      appNavigationLabel: 'App navigation', workspaceLabel: 'Workspace',
      skipToContentLabel: 'Skip', commandPaletteLabel: 'Search', commandPaletteHint: '⌘K',
      workspaces: [{ id: 'ws', name: 'Platform team', to: '/en/w/ws' }, { id: 'ws2', name: 'Data', to: '/en/w/ws2' }],
      currentWorkspaceId: 'ws', switchWorkspaceLabel: 'Switch workspace',
      collapseNavigationLabel: 'Collapse sidebar', expandNavigationLabel: 'Expand sidebar',
      userName: 'Taylor Engineer', userEmail: 'taylor@example.test'
    }
    const mountShell = () => mount(AppShell, { props, global: { plugins: [router] }, attachTo: document.body })
    const wrapper = mountShell()
    expect(wrapper.get('[data-testid="sidebar-user"]').text()).toContain('taylor@example.test')
    expect(wrapper.get('.nav-group-label').text()).toBe('Workspace')
    const toggle = wrapper.get('[data-testid="sidebar-rail-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.attributes('aria-label')).toBe('Collapse sidebar')
    await toggle.trigger('click')
    expect(wrapper.classes()).toContain('app-shell--rail')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-label')).toBe('Expand sidebar')
    expect(wrapper.get('[data-testid="nav-scans"]').attributes('title')).toBe('Scans')
    expect(window.localStorage.getItem('atlasmith.shell.sidebarRail')).toBe('1')

    const switcher = wrapper.get('[data-testid="workspace-switcher"]')
    await switcher.trigger('click')
    const menu = wrapper.get('[data-testid="workspace-menu"]')
    const options = menu.findAll('[role="menuitem"]')
    expect(options.map((o) => o.get('.workspace-name').text())).toEqual(['Platform team', 'Data'])
    expect(options[0].attributes('aria-current')).toBe('true')
    await menu.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-testid="workspace-menu"]').exists()).toBe(false)
    wrapper.unmount()

    const again = mountShell()
    expect(again.classes()).toContain('app-shell--rail')
    await again.get('[data-testid="sidebar-rail-toggle"]').trigger('click')
    expect(again.classes()).not.toContain('app-shell--rail')
    expect(window.localStorage.getItem('atlasmith.shell.sidebarRail')).toBe('0')
    again.unmount()
  })
})
