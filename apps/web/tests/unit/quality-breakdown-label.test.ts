import { describe, expect, it } from 'vitest'
import { scanReportMessages } from '../../src/services/scan-report-messages'
import type { QualityBreakdownItem } from '../../src/viewer/graph-types'
import {
  parseQualityBreakdownLabel,
  qualityBreakdownLabel,
  localizedFolderQualitySummary
} from '../../src/viewer/quality-breakdown-label'

const en = scanReportMessages('en')
const fr = scanReportMessages('fr')

function item(
  category: QualityBreakdownItem['category'],
  label: string,
  penalty = 0
): QualityBreakdownItem {
  return { category, label, penalty }
}

describe('qualityBreakdownLabel', () => {
  it('renders clean and counted labels from structured data, with English fallback', () => {
    expect(qualityBreakdownLabel(item('architecture', 'No architecture rule breaks'), fr)).toBe(
      'Aucune rupture des règles de structure'
    )
    expect(qualityBreakdownLabel(item('cycles', '2 import cycles', 12), fr)).toBe('2 imports circulaires')
    expect(qualityBreakdownLabel(item('cycles', '1 import cycle', 8), fr)).toBe('1 import circulaire')
    expect(qualityBreakdownLabel(item('size', '11 very large files and 28 very large functions', 15), fr)).toBe(
      '11 fichiers très volumineux et 28 fonctions très volumineuses'
    )
    expect(qualityBreakdownLabel(item('imports', '1% of imports could not be resolved', 4), fr)).toBe(
      fr.qualityLabelImportsUnresolved(1)
    )
    expect(qualityBreakdownLabel(item('cycles', 'something the parser does not know', 4), fr)).toBe(
      'something the parser does not know'
    )
    expect(qualityBreakdownLabel(item('cycles', '2 import cycles', 12), en)).toBe('2 import cycles')
  })

  it('parses hotspot labels with an optional maximum-score clause', () => {
    expect(parseQualityBreakdownLabel(item('hotspots', '1 file is a heavy hotspot', 3))).toEqual({
      kind: 'hotspots',
      values: { count: 1, maxCount: 0 }
    })
    expect(
      parseQualityBreakdownLabel(
        item('hotspots', '3 files are heavy hotspots, including 1 file at the maximum score', 8)
      )
    ).toEqual({ kind: 'hotspots-max', values: { count: 3, maxCount: 1 } })
  })

  it('builds a folder summary from translated parts', () => {
    const summary = localizedFolderQualitySummary(
      {
        score: 70,
        grade: 'C',
        breakdown: [
          item('architecture', 'No architecture rule breaks', 0),
          item('cycles', '2 import cycles', 12),
          item('imports', 'Imports resolve cleanly', 2)
        ],
        tips: []
      },
      fr,
      fr.qualityFolderSummaryNone
    )
    expect(summary).toContain('2 imports circulaires')
    expect(summary).toMatch(/petite pénalité/i)
  })
})
