import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'
import LocaleSwitcher from '../../src/components/layout/LocaleSwitcher.vue'
import { LOCALE_PREFERENCE_KEY } from '../../src/services/locale'
import { createAppRouter } from '../../src/router'

describe('LocaleSwitcher', () => {
  it('switches the locale while preserving the current path, query, and hash', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/en/auth/login?next=dashboard#form')
    await router.isReady()

    const wrapper = mount(LocaleSwitcher, {
      global: { plugins: [router] }
    })

    await wrapper.get('select').setValue('ur')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/ur/auth/login?next=dashboard#form')
    expect(localStorage.getItem(LOCALE_PREFERENCE_KEY)).toBe('ur')
  })
})
