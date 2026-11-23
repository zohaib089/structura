import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardLayout from '../../src/views/dashboard/DashboardLayout.vue'
import type { Project, Workspace } from '../../src/services/workspaces'

const listWorkspaces = vi.fn()
const getProject = vi.fn()

vi.mock('../../src/services/workspaces', async () => {
  const actual = await vi.importActual<typeof import('../../src/services/workspaces')>(
    '../../src/services/workspaces'
  )
  return {
    ...actual,
    listWorkspaces: (...args: unknown[]) => listWorkspaces(...args),
    getProject: (...args: unknown[]) => getProject(...args)
  }
})

const workspace: Workspace = {
  id: 'workspace-1',
  name: 'Platform team',
  role: 'owner',
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-11-22T00:00:00.000Z'
}

const project: Project = {
  id: 'project-1',
  name: 'Atlas',
  description: 'Code map',
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-11-22T00:00:00.000Z'
}

async function mountAccess() {
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:locale/w/:workspace', name: 'workspace-projects', component: stub },
      { path: '/:locale/w/:workspace/new', name: 'open-project', component: stub },
      { path: '/:locale/w/:workspace/scans', name: 'workspace-scans', component: stub },
      { path: '/:locale/w/:workspace/members', name: 'workspace-members', component: stub },
      { path: '/:locale/w/:workspace/settings', name: 'workspace-settings', component: stub },
      { path: '/:locale/w/:workspace/projects/:projectId/graph', name: 'project-graph', component: stub },
      { path: '/:locale/w/:workspace/projects/:projectId/access', name: 'project-access', component: stub }
    ]
  })
  await router.push('/en/w/workspace-1/projects/project-1/access')
  await router.isReady()
  const wrapper = mount(DashboardLayout, {
    global: { plugins: [router, createPinia()] },
    attachTo: document.body
  })
  await flushPromises()
  return wrapper
}

describe('DashboardLayout breadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listWorkspaces.mockResolvedValue([workspace])
    getProject.mockResolvedValue(project)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the project name from GET project on the Access page, not Project', async () => {
    const wrapper = await mountAccess()
    expect(getProject).toHaveBeenCalledWith('workspace-1', 'project-1')
    const crumb = wrapper.get('nav[aria-label="Breadcrumb"]')
    expect(crumb.text()).toContain('Atlas')
    expect(crumb.text()).toContain('Access')
    expect(crumb.text()).not.toMatch(/\bProject\b/)
    wrapper.unmount()
  })

  it('falls back to Project when the project cannot be loaded', async () => {
    getProject.mockRejectedValue(new Error('Project not found.'))
    const wrapper = await mountAccess()
    const crumb = wrapper.get('nav[aria-label="Breadcrumb"]')
    expect(crumb.text()).toContain('Project')
    expect(crumb.text()).toContain('Access')
    expect(crumb.text()).not.toContain('Atlas')
    wrapper.unmount()
  })
})
