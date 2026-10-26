import { createMemoryHistory } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/hosted-app', () => ({
  hostedAppEnabled: false,
  hostedAppEnabledFrom: (value: string | undefined) => value !== 'false'
}))

vi.mock('../../src/services/auth', () => ({
  getCurrentSession: () => null
}))

import { createAppRouter } from '../../src/router'

describe('hosted routes when the flag is off', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sends auth and dashboard routes home', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/en/auth/login')
    expect(router.currentRoute.value.path).toBe('/en')
    await router.push('/en/dashboard')
    expect(router.currentRoute.value.path).toBe('/en')
  })
})
