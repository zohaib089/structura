import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BrandMark from '../../src/components/brand/BrandMark.vue'

describe('BrandMark (Nucleus)', () => {
  it('renders plate, ring, core and specular on a 64 viewBox with no graph nodes', () => {
    const wrapper = mount(BrandMark)
    const svg = wrapper.get('svg')
    expect(svg.attributes('viewBox')).toBe('0 0 64 64')
    expect(wrapper.find('path.plate').exists()).toBe(true)
    expect(wrapper.find('.nucleus-ring').exists()).toBe(true)
    expect(wrapper.find('.nucleus-core').exists()).toBe(true)
    expect(wrapper.find('.specular').exists()).toBe(true)
    expect(wrapper.find('radialGradient').exists()).toBe(true)
    expect(wrapper.findAll('line')).toHaveLength(0)
    expect(wrapper.findAll('circle').length).toBeLessThanOrEqual(4)
  })

  it('is decorative unless titled', () => {
    expect(mount(BrandMark).get('svg').attributes('aria-hidden')).toBe('true')
    const titled = mount(BrandMark, { props: { title: 'Atlasmith' } })
    expect(titled.get('svg').attributes('role')).toBe('img')
    expect(titled.get('title').text()).toBe('Atlasmith')
  })

  it('keeps the same shape at compact sizes and sets the size', () => {
    const small = mount(BrandMark, { props: { size: 16 } })
    expect(small.get('svg').attributes('width')).toBe('16px')
    expect(small.get('svg').attributes('viewBox')).toBe('0 0 64 64')
    expect(small.find('.nucleus-core').exists()).toBe(true)
  })

  it('supports a mono variant without the glow or specular', () => {
    const mono = mount(BrandMark, { props: { variant: 'mono' } })
    expect(mono.get('svg').classes()).toContain('is-mono')
    expect(mono.find('radialGradient').exists()).toBe(false)
    expect(mono.find('.specular').exists()).toBe(false)
  })

  it('only adds the sweep arc when animated and gives each instance its own gradient id', () => {
    expect(mount(BrandMark).find('.nucleus-sweep').exists()).toBe(false)
    const a = mount(BrandMark, { props: { animated: true } })
    const b = mount(BrandMark)
    expect(a.find('.nucleus-sweep').exists()).toBe(true)
    expect(a.get('radialGradient').attributes('id')).not.toBe(b.get('radialGradient').attributes('id'))
  })
})
