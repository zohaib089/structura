import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DashboardToast from '../../src/components/dashboard/DashboardToast.vue'

describe('DashboardToast', () => {
  it('announces the message and emits a dismiss event', async () => {
    const wrapper = mount(DashboardToast, {
      props: {
        message: 'Project created.',
        dismissLabel: 'Dismiss notification'
      }
    })

    expect(wrapper.get('[role="status"]').text()).toContain('Project created.')
    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('polite')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })
})
