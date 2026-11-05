import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Skeleton from '../../src/components/ui/Skeleton.vue'
import SkeletonGraph from '../../src/components/ui/skeleton/SkeletonGraph.vue'
import SkeletonReport from '../../src/components/ui/skeleton/SkeletonReport.vue'
import SkeletonTableRows from '../../src/components/ui/skeleton/SkeletonTableRows.vue'

describe('skeletons', () => {
  it('marks every region aria-busy with an accessible status name', () => {
    for (const wrapper of [
      mount(Skeleton, { props: { label: 'Loading things' } }),
      mount(SkeletonTableRows, { props: { label: 'Loading projects' } }),
      mount(SkeletonGraph, { props: { label: 'Loading graph' } }),
      mount(SkeletonReport, { props: { label: 'Loading report' } })
    ]) {
      const region = wrapper.get('[role="status"]')
      expect(region.attributes('aria-busy')).toBe('true')
      expect(region.attributes('aria-label')).toMatch(/^Loading/)
    }
  })

  it('table skeleton renders 8 rows by default with five columns', () => {
    const wrapper = mountTable()
    expect(wrapper.findAll('.sk-table__row')).toHaveLength(8)
    expect(wrapper.get('.sk-table__row').findAll('.sk-block')).toHaveLength(5)
    expect(wrapper.get('.sk-table__row').findAll('.sk-block--pill')).toHaveLength(1)
  })

  it('graph skeleton draws 3 rings and 8-12 ghost nodes, with no spinner', () => {
    const wrapper = mount(SkeletonGraph)
    expect(wrapper.findAll('.sk-graph__ring')).toHaveLength(3)
    const ghosts = wrapper.findAll('.sk-graph__node:not(.sk-graph__node--root)')
    expect(ghosts.length).toBeGreaterThanOrEqual(8)
    expect(ghosts.length).toBeLessThanOrEqual(12)
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('report skeleton has 4 KPI pills and 4 finding rows and no tables', () => {
    const wrapper = mount(SkeletonReport)
    expect(wrapper.findAll('.sk-report__kpis .sk-block--pill')).toHaveLength(4)
    expect(wrapper.findAll('.sk-report__finding')).toHaveLength(4)
    expect(wrapper.find('table').exists()).toBe(false)
  })
})

function mountTable() {
  return mount(SkeletonTableRows)
}
