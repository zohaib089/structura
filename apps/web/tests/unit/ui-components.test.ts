import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ErrorState from '../../src/components/ui/ErrorState.vue'
import SeverityChip from '../../src/components/ui/SeverityChip.vue'
import Tabs from '../../src/components/ui/Tabs.vue'

describe('shared UI components', () => {
  it('Tabs moves focus with arrow, Home, and End keys', async () => {
    const wrapper = mount(Tabs, {
      props: {
        modelValue: 'a',
        ariaLabel: 'Report sections',
        items: [
          { id: 'a', label: 'One', tabId: 'tab-a', panelId: 'panel-a' },
          { id: 'b', label: 'Two', tabId: 'tab-b', panelId: 'panel-b' },
          { id: 'c', label: 'Three', tabId: 'tab-c', panelId: 'panel-c' }
        ]
      }
    })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0]?.attributes('aria-selected')).toBe('true')
    expect(tabs[1]?.attributes('tabindex')).toBe('-1')

    await tabs[0]!.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b'])

    await wrapper.setProps({ modelValue: 'b' })
    await tabs[1]!.trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['c'])

    await wrapper.setProps({ modelValue: 'c' })
    await tabs[2]!.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['a'])
  })

  it('SeverityChip renders icon and visible label text', () => {
    const wrapper = mount(SeverityChip, {
      props: {
        severity: 'critical',
        label: 'Critical'
      }
    })

    expect(wrapper.text()).toContain('Critical')
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.attributes('style')).toContain('--sev-critical-fg')
  })

  it('ErrorState emits retry when the action is activated', async () => {
    const wrapper = mount(ErrorState, {
      props: {
        message: 'Unable to load scans.',
        retryLabel: 'Retry'
      }
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
