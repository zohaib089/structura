import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import HexLoader from '../../src/components/ui/HexLoader.vue'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('HexLoader', () => {
  it('does not render before the 200ms delay and then shows with role=status', async () => {
    const wrapper = mount(HexLoader, { props: { label: 'Loading projects…' } })
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    vi.advanceTimersByTime(199)
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('Loading projects…')
  })

  it.each([
    ['sm', '16px'],
    ['md', '24px'],
    ['lg', '40px']
  ] as const)('renders %s at %s', async (size, px) => {
    const wrapper = mount(HexLoader, { props: { size, delay: 0 } })
    await nextTick()
    expect(wrapper.get('svg').attributes('width')).toBe(px)
    expect(wrapper.find('.nucleus-sweep').exists()).toBe(true)
    expect(wrapper.find('.nucleus-core').exists()).toBe(true)
  })

  it('labels the status with aria-label when the text is hidden', async () => {
    const wrapper = mount(HexLoader, { props: { label: 'Loading graph', hideLabel: true, delay: 0 } })
    await nextTick()
    const root = wrapper.get('[role="status"]')
    expect(root.attributes('aria-label')).toBe('Loading graph')
    expect(wrapper.get('.hex-loader__label').classes()).toContain('hex-loader__label--hidden')
  })

  it('keeps the loader visible for at least 400ms once shown', async () => {
    const wrapper = mount(HexLoader, { props: { active: true } })
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    await wrapper.setProps({ active: false })
    vi.advanceTimersByTime(399)
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('never shows when loading finishes inside the delay', async () => {
    const wrapper = mount(HexLoader, { props: { active: true } })
    vi.advanceTimersByTime(100)
    await wrapper.setProps({ active: false })
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('is decorative with no label inside controls that already have text', async () => {
    const wrapper = mount(HexLoader, { props: { inline: true, delay: 0, size: 'sm' } })
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.get('.hex-loader').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.hex-loader__label').exists()).toBe(false)
  })
})
