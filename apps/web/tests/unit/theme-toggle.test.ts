import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import ThemeToggle from '../../src/components/layout/ThemeToggle.vue'
import { useThemeStore } from '../../src/stores/theme'

describe('ThemeToggle', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('is an icon-only button with an accessible name and pressed state', async () => {
    const wrapper = mount(ThemeToggle, { props: { label: 'Toggle theme' } })
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('Toggle theme')
    expect(button.text()).toBe('')
    const store = useThemeStore()
    const before = store.theme
    expect(button.attributes('aria-pressed')).toBe(String(before === 'dark'))
    await button.trigger('click')
    expect(store.theme).not.toBe(before)
    expect(button.attributes('aria-pressed')).toBe(String(store.theme === 'dark'))
  })
})

describe('landing theme tokens', () => {
  it('declares a light override scoped to the landing page and keeps dark as the default', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync(`${process.cwd()}/src/styles/landing.css`, 'utf8')
    expect(css).toMatch(/\.landing-page \{\s*color-scheme: dark;/)
    expect(css).toMatch(/\[data-theme='light'\] \.landing-page \{\s*color-scheme: light;/)
  })
})
