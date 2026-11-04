import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SeverityChip from '../../src/components/ui/SeverityChip.vue'
import { fileSeverityChips, folderSeverityChip } from '../../src/services/scan-report-tree-display'
import { emptySeverityCounts } from '../../src/services/scan-report-tree'

describe('report tree severity chips', () => {
  it('summarizes folder nodes with the highest severity and total count', () => {
    const counts = { ...emptySeverityCounts(), critical: 1, medium: 2, total: 3 }
    expect(folderSeverityChip(counts)).toEqual({ severity: 'critical', count: 3 })
  })

  it('limits file nodes to visible severity chips with overflow', () => {
    const counts = {
      ...emptySeverityCounts(),
      critical: 1,
      high: 2,
      medium: 3,
      total: 6
    }
    const { chips, overflow } = fileSeverityChips(counts, 2)
    expect(chips).toEqual([
      { severity: 'critical', count: 1 },
      { severity: 'high', count: 2 }
    ])
    expect(overflow).toBe(1)
  })

  it('SeverityChip compact mode renders icon and numeric count', () => {
    const wrapper = mount(SeverityChip, {
      props: {
        severity: 'high',
        label: 'High',
        count: 4,
        compact: true
      }
    })
    expect(wrapper.text()).toContain('4')
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
