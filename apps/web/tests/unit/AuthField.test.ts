import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthField from '../../src/components/auth/AuthField.vue'

describe('AuthField', () => {
  it('renders the label and hint and emits updated input values', async () => {
    const wrapper = mount(AuthField, {
      props: {
        label: 'Work email',
        modelValue: '',
        type: 'email',
        hint: 'Use your work address.'
      }
    })

    expect(wrapper.get('input').attributes('type')).toBe('email')
    expect(wrapper.text()).toContain('Work email')
    expect(wrapper.text()).toContain('Use your work address.')

    await wrapper.get('input').setValue('engineer@example.test')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['engineer@example.test'])
  })

  it('shows a labeled password visibility control only for password fields', async () => {
    const wrapper = mount(AuthField, {
      props: {
        label: 'New password',
        modelValue: 'secret-value',
        type: 'password'
      }
    })
    const input = wrapper.get('input')
    const toggle = wrapper.get('button[aria-controls]')

    expect(input.attributes('type')).toBe('password')
    expect(toggle.attributes('aria-label')).toBe('Show new password')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.element.tagName).toBe('BUTTON')
    expect(toggle.attributes('type')).toBe('button')

    await toggle.trigger('click')

    expect(input.attributes('type')).toBe('text')
    expect(toggle.attributes('aria-label')).toBe('Hide new password')
    expect(toggle.attributes('aria-pressed')).toBe('true')

    await toggle.trigger('click')

    expect(input.attributes('type')).toBe('password')
  })

  it('does not render a visibility control for non-password fields', () => {
    const wrapper = mount(AuthField, {
      props: {
        label: 'Work email',
        modelValue: '',
        type: 'email'
      }
    })

    expect(wrapper.find('button[aria-controls]').exists()).toBe(false)
  })
})
