import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { BRAND, quickstartCommand } from '../../../../packages/brand/src/brand'
import QuickstartCommand from '../../src/components/landing/QuickstartCommand.vue'
import { fillLanding, landingMessages } from '../../src/services/landing-messages'
import { WEB_LOCALES } from '../../src/services/locale'
import { hostedAppEnabledFrom } from '../../src/hosted-app'

describe('landing copy', () => {
  it('interpolates the product name and falls back to English', () => {
    const english = landingMessages('en')
    for (const locale of WEB_LOCALES) {
      expect(landingMessages(locale.tag)).toEqual(english)
    }
    const text = JSON.stringify(english)
    expect(text.includes(BRAND.name)).toBe(false)
    expect(text.includes(BRAND.wordmark)).toBe(false)
    expect(text.toLowerCase().includes(BRAND.legacySlug)).toBe(false)
    expect(fillLanding(english.subtitle, { name: BRAND.name, graphFile: BRAND.graphFile })).toContain(BRAND.name)
    expect(text).not.toContain('2.1x')
    expect(text).not.toContain('Trusted by')
  })

  it('copies the quickstart command from the brand module', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })
    const wrapper = mount(QuickstartCommand, {
      props: {
        command: quickstartCommand(),
        label: 'Run in your repository',
        copyLabel: 'Copy',
        copiedLabel: 'Copied',
        failedLabel: 'Press Ctrl/⌘ C'
      }
    })
    expect(wrapper.text()).toContain(quickstartCommand())
    expect(wrapper.text()).not.toContain(BRAND.legacySlug)
    await wrapper.get('button').trigger('click')
    expect(writeText).toHaveBeenCalledWith(quickstartCommand())
    expect(wrapper.get('[role="status"]').text()).toBe('Copied')
  })
})

describe('hosted app flag', () => {
  it('stays on unless the env value is the string false', () => {
    expect(hostedAppEnabledFrom(undefined)).toBe(true)
    expect(hostedAppEnabledFrom('')).toBe(true)
    expect(hostedAppEnabledFrom('true')).toBe(true)
    expect(hostedAppEnabledFrom('false')).toBe(false)
  })
})
