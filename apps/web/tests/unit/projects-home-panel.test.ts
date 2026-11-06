import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProjectsHomePanel from '../../src/components/dashboard/ProjectsHomePanel.vue'

vi.mock('../../src/api/scans', () => ({
  listScans: vi.fn(async () => [
    {
      id: 'scan-1',
      workspaceId: 'ws-1',
      requestedBy: 'u1',
      source: 'git',
      url: 'https://example.com/repo.git',
      branch: 'main',
      status: 'succeeded',
      step: null,
      errorMessage: null,
      createdAt: '2026-11-05T12:00:00.000Z',
      updatedAt: '2026-11-05T12:00:00.000Z',
      startedAt: '2026-11-05T12:00:00.000Z',
      finishedAt: '2026-11-05T12:05:00.000Z'
    }
  ])
}))

describe('ProjectsHomePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function mountPanel(overrides: Record<string, unknown> = {}) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/:pathMatch(.*)*', component: { template: '<div />' } }
      ]
    })
    await router.push('/')
    await router.isReady()
    return mount(ProjectsHomePanel, {
      props: {
        locale: 'en',
        workspaceId: 'ws-1',
        workspaceName: 'tes',
        projects: [
          {
            id: 'p1',
            name: 'tesoooo',
            description: '',
            created_at: '2026-10-21T00:00:00.000Z',
            updated_at: '2026-10-21T00:00:00.000Z'
          }
        ],
        loading: false,
        error: '',
        canCreate: true,
        search: '',
        projectName: '',
        projectDescription: '',
        submitting: false,
        ...overrides
      },
      global: {
        plugins: [router]
      }
    })
  }

  it('renders a full-width projects table with truthful workspace-scan strip', async () => {
    const wrapper = await mountPanel()
    await flushPromises()

    expect(wrapper.find('[data-testid="projects-home"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="projects-table"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('tesoooo')
    expect(wrapper.text()).toContain('Projects name areas of work')
    expect(wrapper.text()).toContain('not filtered by project yet')
    expect(wrapper.get('[data-testid="projects-open-cta"]').text()).toContain('Scan a project')
    expect(wrapper.get('[data-testid="project-open-link"]').attributes('href')).toBe(
      '/en/w/ws-1/projects/p1/graph'
    )
    expect(wrapper.get('[data-testid="recent-workspace-scans"]').text()).toContain(
      'Recent workspace scans'
    )
    expect(wrapper.get('[data-testid="recent-workspace-scans"]').text()).toContain(
      'belong to the workspace'
    )
    wrapper.unmount()
  })

  it('keeps create project available behind a compact toggle', async () => {
    const wrapper = await mountPanel()
    await flushPromises()
    expect(wrapper.find('[data-testid="projects-create-form"]').exists()).toBe(false)
    await wrapper.get('[data-testid="projects-create-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="projects-create-form"]').exists()).toBe(true)
    await wrapper.get('[data-testid="projects-create-form"]').trigger('submit')
    expect(wrapper.emitted('create')).toBeTruthy()
    wrapper.unmount()
  })

  it('shows approachable empty state with scan CTA when there are no projects', async () => {
    const wrapper = await mountPanel({ projects: [] })
    await flushPromises()
    expect(wrapper.get('[data-testid="projects-empty"]').text()).toContain('No projects yet')
    expect(wrapper.get('[data-testid="projects-empty"]').text()).toContain('Scan a project')
    wrapper.unmount()
  })
})
