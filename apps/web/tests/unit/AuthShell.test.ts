import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthShell from '../../src/components/auth/AuthShell.vue'

describe('AuthShell', () => {
  it('renders the access mode, title, subtitle, and form content', () => {
    const wrapper = mount(AuthShell, {
      props: {
        accountType: 'enterprise',
        eyebrow: 'Secure access',
        title: 'Welcome back',
        subtitle: 'Sign in to continue.'
      },
      slots: {
        default: '<form aria-label="Sign in form"></form>'
      }
    })

    expect(wrapper.text()).toContain('Enterprise access')
    expect(wrapper.text()).toContain('Secure access')
    expect(wrapper.get('h1').text()).toBe('Welcome back')
    expect(wrapper.text()).toContain('Sign in to continue.')
    expect(wrapper.get('[aria-label="Sign in form"]').element).toBeDefined()
  })

  it('defaults to individual access', () => {
    const wrapper = mount(AuthShell)

    expect(wrapper.text()).toContain('Individual access')
  })
})
