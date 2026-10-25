import { createMemoryHistory } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALE_PREFERENCE_KEY } from '../../src/services/locale'

const { getCurrentSession } = vi.hoisted(() => ({
  getCurrentSession: vi.fn()
}))

vi.mock('../../src/services/auth', () => ({ getCurrentSession }))

import { createAppRouter } from '../../src/router'

describe('localized routes', () => {
  beforeEach(() => {
    localStorage.clear()
    getCurrentSession.mockReturnValue(null)
  })

  it('redirects legacy deep links to the selected locale and preserves query and hash', async () => {
    localStorage.setItem(LOCALE_PREFERENCE_KEY, 'pt')
    const router = createAppRouter(createMemoryHistory())

    await router.push('/dashboard?source=landing#projects')

    expect(router.currentRoute.value.fullPath).toBe('/pt/auth/login?source=landing#projects')
    expect(document.documentElement.lang).toBe('pt')
    expect(localStorage.getItem(LOCALE_PREFERENCE_KEY)).toBe('pt')
  })

  it('negotiates the locale for the root route and applies RTL direction', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/ur')

    expect(router.currentRoute.value.path).toBe('/ur')
    expect(document.documentElement.lang).toBe('ur')
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('retains localized routes through authentication redirects', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/ja/dashboard?tab=projects')

    expect(router.currentRoute.value.fullPath).toBe('/ja/auth/login?tab=projects')
    expect(document.documentElement.lang).toBe('ja')
  })

  it('redirects authenticated users from localized auth pages to the dashboard', async () => {
    getCurrentSession.mockReturnValue({ token: 'active-session' })
    const router = createAppRouter(createMemoryHistory())

    await router.push('/fr/auth/login')

    expect(router.currentRoute.value.path).toBe('/fr/dashboard')
  })

  it('redirects authenticated users from the localized home route to the dashboard', async () => {
    getCurrentSession.mockReturnValue({ token: 'active-session' })
    const router = createAppRouter(createMemoryHistory())

    await router.push('/fr')

    expect(router.currentRoute.value.path).toBe('/fr/dashboard')
  })
})
