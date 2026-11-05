import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ToastStack from '../../src/components/ui/ToastStack.vue'
import { useToast } from '../../src/composables/useToast'

const toast = useToast()

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  toast.clear()
  vi.useRealTimers()
})

function mountStack() {
  return mount(ToastStack, { attachTo: document.body })
}

describe('ToastStack', () => {
  it('keeps a Notifications region in the DOM even when empty', () => {
    const wrapper = mountStack()
    expect(wrapper.get('section').attributes('aria-label')).toBe('Notifications')
    wrapper.unmount()
  })

  it('uses status/polite for success and info, alert/assertive for warning and error', async () => {
    const wrapper = mountStack()
    toast.success('Project created')
    toast.info('Layout updated')
    toast.warning('Scan is slow')
    toast.error("Couldn't save")
    await nextTick()
    const roles = Object.fromEntries(
      wrapper.findAll('article').map(a => [a.attributes('data-variant'), [a.attributes('role'), a.attributes('aria-live')]])
    )
    // max 3 visible: the oldest (success) is behind "+1 more"
    expect(roles).toEqual({
      info: ['status', 'polite'],
      warning: ['alert', 'assertive'],
      error: ['alert', 'assertive']
    })
    wrapper.unmount()
  })

  it('names toasts with icon + variant word, never colour only', async () => {
    const wrapper = mountStack()
    toast.error("Couldn't save")
    await nextTick()
    const article = wrapper.get('article')
    const labelId = article.attributes('aria-labelledby') as string
    expect(document.getElementById(labelId)?.textContent).toBe("Error: Couldn't save")
    expect(article.find('svg').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows at most 3 toasts, then a "+N more" chip that expands the list', async () => {
    const wrapper = mountStack()
    for (let i = 1; i <= 5; i++) toast.error(`Problem ${i}`)
    await nextTick()
    expect(wrapper.findAll('article')).toHaveLength(3)
    const chip = wrapper.get('.toast-stack__more')
    expect(chip.text()).toBe('+2 more')
    await chip.trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(5)
    wrapper.unmount()
  })

  it('shows the duplicate count in the title', async () => {
    const wrapper = mountStack()
    toast.error("Couldn't save")
    toast.error("Couldn't save")
    toast.error("Couldn't save")
    await nextTick()
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.get('.toast-item__title').text()).toContain("Couldn't save ×3")
    wrapper.unmount()
  })

  it('pauses auto-dismiss on hover and resumes on leave', async () => {
    const wrapper = mountStack()
    toast.success('Project created')
    await nextTick()
    const article = wrapper.get('article')
    await article.trigger('mouseenter')
    vi.advanceTimersByTime(30_000)
    expect(toast.toasts).toHaveLength(1)
    await article.trigger('mouseleave')
    vi.advanceTimersByTime(5000)
    expect(toast.toasts).toHaveLength(0)
    wrapper.unmount()
  })

  it('dismisses with the × button (aria-label Dismiss) and with Escape', async () => {
    const wrapper = mountStack()
    toast.error('One')
    toast.error('Two')
    await nextTick()
    expect(wrapper.get('.toast-item__dismiss').attributes('aria-label')).toBe('Dismiss')
    await wrapper.get('.toast-item__dismiss').trigger('click')
    expect(toast.toasts).toHaveLength(1)
    await wrapper.get('article').trigger('keydown', { key: 'Escape' })
    expect(toast.toasts).toHaveLength(0)
    wrapper.unmount()
  })

  it('renders one action that runs and dismisses, and moves focus to it when requested', async () => {
    const wrapper = mountStack()
    const onAction = vi.fn()
    toast.error("Couldn't save", { body: 'Check your connection.', action: { label: 'Retry', onAction }, focusAction: true })
    await nextTick()
    await nextTick()
    const action = wrapper.get('.toast-item__action')
    expect(document.activeElement).toBe(action.element)
    expect(wrapper.findAll('.toast-item__action')).toHaveLength(1)
    await action.trigger('click')
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(toast.toasts).toHaveLength(0)
    wrapper.unmount()
  })
})
