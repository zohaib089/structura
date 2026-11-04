import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SeverityChip from '../../src/components/ui/SeverityChip.vue'
import {
  buildReportPathSeverityMap,
  fileSeverityChips,
  folderSeverityChip,
  lookupPathSeverityCounts
} from '../../src/services/scan-report-tree-display'
import { buildReportFileTree, emptySeverityCounts, highestSeverity } from '../../src/services/scan-report-tree'
import type { ReportFinding } from '../../src/api/scan-report-types'

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

  it('indexes the same per-path severity totals as the report tree', () => {
    const findings: ReportFinding[] = [
      {
        id: 'f1',
        severity: 'critical',
        section: 'violations',
        message: 'x',
        file: 'src/a.ts',
        provenance: 'EXTRACTED'
      },
      {
        id: 'f2',
        severity: 'medium',
        section: 'violations',
        message: 'y',
        file: 'src/a.ts',
        provenance: 'EXTRACTED'
      },
      {
        id: 'f3',
        severity: 'high',
        section: 'security',
        message: 'z',
        file: 'src/b.ts',
        provenance: 'EXTRACTED'
      }
    ]
    const map = buildReportPathSeverityMap(findings)
    const root = buildReportFileTree(findings)
    const srcFolder = root.children.find(child => child.path === 'src')
    expect(srcFolder?.counts.total).toBe(3)
    expect(lookupPathSeverityCounts(map, 'src')?.total).toBe(3)
    expect(lookupPathSeverityCounts(map, 'src/a.ts')?.total).toBe(2)
    expect(highestSeverity(lookupPathSeverityCounts(map, 'src/a.ts')!)).toBe('critical')
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
