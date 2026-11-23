import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import ReportQuality from '../../src/components/dashboard/report/ReportQuality.vue'
import type { FolderQualityScore, GraphQuality, QualityCategory, QualityScore } from '../../src/viewer/graph-types'
import {
  cappedFolderQuality,
  cappedQualityTips,
  folderQualitySummary,
  hasGraphQuality,
  qualityCategoryTitle,
  qualityFolderName,
  qualityFolderShortPath,
  qualityGradeFromScore,
  sortedFolderQuality,
  tipActionText
} from '../../src/viewer/quality-score'
import { scanReportMessages } from '../../src/services/scan-report-messages'

const messages = scanReportMessages('en')

function breakdown(overrides: Partial<Record<QualityCategory, { label: string; penalty: number }>> = {}): QualityScore['breakdown'] {
  const defaults: Record<QualityCategory, { label: string; penalty: number }> = {
    architecture: { label: 'No architecture rule breaks', penalty: 0 },
    cycles: { label: '2 import cycles', penalty: 12 },
    hotspots: { label: '1 file is a heavy hotspot', penalty: 3 },
    imports: { label: 'Imports resolve cleanly', penalty: 0 },
    size: { label: '1 very large file', penalty: 4 }
  }
  return (['architecture', 'cycles', 'hotspots', 'imports', 'size'] as const).map((category) => ({
    category,
    ...(overrides[category] ?? defaults[category])
  }))
}

function project(overrides: Partial<QualityScore> = {}): QualityScore {
  return {
    score: 81,
    grade: 'B',
    breakdown: breakdown(),
    tips: [
      { text: 'Break the cycle between graph and scan to gain about 8 points', gain: 8 },
      { text: 'Split packages/engine/src/graph/types.ts (1600 lines) into smaller files to gain about 8 points', gain: 8 },
      { text: 'Spread work out of the heaviest hotspot files to gain about 3 points', gain: 3 },
      { text: 'This fourth tip should be hidden', gain: 2 }
    ],
    ...overrides
  }
}

function folder(path: string, score: number, grade: QualityScore['grade'], extra?: Partial<FolderQualityScore>): FolderQualityScore {
  return {
    path,
    score,
    grade,
    breakdown: breakdown(),
    tips: [],
    ...extra
  }
}

function quality(overrides: Partial<GraphQuality> = {}): GraphQuality {
  return {
    project: project(),
    folders: [
      folder('apps/web/src/viewer', 54, 'F', {
        breakdown: breakdown({
          cycles: { label: '3 import cycles', penalty: 16 },
          size: { label: '2 very large files', penalty: 8 }
        })
      }),
      folder('packages/cli', 68, 'D'),
      folder('docs', 94, 'A', {
        breakdown: breakdown({
          cycles: { label: 'No import cycles', penalty: 0 },
          hotspots: { label: 'No highly connected hotspots', penalty: 0 },
          size: { label: 'No unusually large files or functions', penalty: 0 }
        })
      })
    ],
    ...overrides
  }
}

async function mountCard(data: GraphQuality | null | undefined | 'default' = 'default') {
  const qualityProp = data === 'default' ? quality() : data
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: defineComponent({ render: () => h('div') }) }]
  })
  await router.push('/en/w/ws/projects/p/scans/s/summary')
  await router.isReady()
  return mount(ReportQuality, {
    props: {
      quality: qualityProp,
      title: messages.qualityTitle,
      hint: messages.qualityHint,
      scoreLabel: messages.qualityScoreLabel,
      gradeLabel: messages.qualityGradeLabel,
      outOfLabel: messages.qualityOutOf,
      breakdownTitle: messages.qualityBreakdownTitle,
      categoryTitle: messages.qualityCategoryTitle,
      pointsOff: messages.qualityPointsOff,
      tipsTitle: messages.qualityTipsTitle,
      tipGain: messages.qualityTipGain,
      foldersTitle: messages.qualityFoldersTitle,
      foldersHint: messages.qualityFoldersHint,
      foldersShowing: messages.qualityFoldersShowing,
      openLabel: messages.qualityFoldersOpen,
      folderEmptySummary: messages.qualityFolderSummaryNone,
      graphHref: (path?: string) => ({ path: '/graph', query: path ? { node: path } : {} })
    },
    global: { plugins: [router] }
  })
}

describe('quality score helpers', () => {
  it('maps 0–100 scores to A–F grades', () => {
    expect(qualityGradeFromScore(100)).toBe('A')
    expect(qualityGradeFromScore(90)).toBe('A')
    expect(qualityGradeFromScore(89)).toBe('B')
    expect(qualityGradeFromScore(80)).toBe('B')
    expect(qualityGradeFromScore(79)).toBe('C')
    expect(qualityGradeFromScore(70)).toBe('C')
    expect(qualityGradeFromScore(69)).toBe('D')
    expect(qualityGradeFromScore(60)).toBe('D')
    expect(qualityGradeFromScore(59)).toBe('F')
    expect(qualityGradeFromScore(0)).toBe('F')
  })

  it('uses plain-English category titles', () => {
    expect(qualityCategoryTitle('architecture')).toBe('Structure rules')
    expect(qualityCategoryTitle('cycles')).toBe('Circular imports')
    expect(qualityCategoryTitle('hotspots')).toBe('Riskiest files')
    expect(qualityCategoryTitle('imports')).toBe('Imports')
    expect(qualityCategoryTitle('size')).toBe('File and function size')
  })

  it('caps tips at 3 and keeps estimated point gains', () => {
    const tips = cappedQualityTips(project().tips)
    expect(tips).toHaveLength(3)
    expect(tips.map((tip) => tip.gain)).toEqual([8, 8, 3])
    expect(tipActionText(tips[0]!)).toBe('Break the cycle between graph and scan')
    expect(tipActionText({ text: 'Do something else', gain: 4 })).toBe('Do something else')
  })

  it('sorts folders worst score first, then by path', () => {
    const rows = sortedFolderQuality([
      folder('z', 70, 'C'),
      folder('b', 54, 'F'),
      folder('a', 54, 'F'),
      folder('m', 90, 'A')
    ])
    expect(rows.map((row) => row.path)).toEqual(['a', 'b', 'z', 'm'])
  })

  it('caps the folder list at the 10 worst scores', () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      folder(`f${String(index).padStart(2, '0')}`, 50 + index, 'F')
    )
    const capped = cappedFolderQuality(rows)
    expect(capped).toHaveLength(10)
    expect(capped.map((row) => row.path)).toEqual(rows.slice(0, 10).map((row) => row.path))
    expect(capped.at(-1)?.score).toBe(59)
  })

  it('summarises a folder from the penalties that pulled the score down', () => {
    expect(folderQualitySummary(folder('apps/web', 54, 'F'))).toBe(
      '2 import cycles, 1 file is a heavy hotspot, and 1 very large file'
    )
    expect(
      folderQualitySummary(
        folder('docs', 100, 'A', {
          breakdown: breakdown({
            cycles: { label: 'No import cycles', penalty: 0 },
            hotspots: { label: 'No highly connected hotspots', penalty: 0 },
            size: { label: 'No unusually large files or functions', penalty: 0 }
          })
        })
      )
    ).toBe('No issues in this folder.')
    expect(
      folderQualitySummary(
        folder('apps/web', 74, 'C', {
          breakdown: breakdown({
            imports: { label: 'Imports resolve cleanly', penalty: 3 }
          })
        })
      )
    ).toBe('2 import cycles, 1 file is a heavy hotspot, a small imports penalty, and 1 very large file')
  })

  it('formats folder names and short paths', () => {
    expect(qualityFolderName('apps/web/src/viewer')).toBe('viewer')
    expect(qualityFolderShortPath('apps/web/src/viewer')).toBe('apps/web/src')
    expect(qualityFolderShortPath('docs')).toBe('')
  })

  it('treats a missing quality object as absent', () => {
    expect(hasGraphQuality(undefined)).toBe(false)
    expect(hasGraphQuality(null)).toBe(false)
    expect(hasGraphQuality(quality())).toBe(true)
  })
})

describe('Project quality card', () => {
  it('shows the 0–100 score, letter grade, category breakdown, and up to 3 tips with point gains', async () => {
    const w = await mountCard()
    const card = w.get('[data-testid="quality-score-card"]')
    expect(card.text()).toContain('Project quality')
    expect(card.text()).toContain('81')
    expect(card.text()).toContain('out of 100')
    expect(card.get('.grade').text()).toBe('B')
    expect(card.get('.grade').attributes('data-grade')).toBe('B')
    expect(card.text()).toContain('Structure rules')
    expect(card.text()).toContain('Circular imports')
    expect(card.text()).toContain('Riskiest files')
    expect(card.text()).toContain('Imports')
    expect(card.text()).toContain('File and function size')
    expect(card.text()).toContain('2 import cycles')
    expect(card.text()).toContain('12 points off')
    expect(card.text()).toContain('No points off')

    const tips = w.get('[data-testid="quality-tips"]')
    expect(tips.text()).toContain('How to raise this score')
    expect(tips.findAll('.tip')).toHaveLength(3)
    expect(tips.text()).toContain('About +8 points')
    expect(tips.text()).toContain('Break the cycle between graph and scan')
    expect(tips.text()).not.toContain('This fourth tip should be hidden')
    expect(tips.text()).not.toContain('to gain about 8 points')
  })

  it('lists folders worst score first with a grade, summary, and graph link', async () => {
    const w = await mountCard()
    const list = w.get('[data-testid="quality-folders"]')
    expect(list.text()).toContain('Folder scores')
    const links = list.findAll('a.folder__link')
    expect(links.map((link) => link.get('.folder__name').text())).toEqual(['viewer', 'cli', 'docs'])
    expect(links[0]!.text()).toContain('54')
    expect(links[0]!.get('.grade').attributes('data-grade')).toBe('F')
    expect(links[0]!.text()).toContain('3 import cycles')
    expect(links[0]!.attributes('href')).toContain('node=')
    expect(links[0]!.attributes('href')).toContain('apps/web/src/viewer')
    expect(links[2]!.text()).toContain('No issues in this folder.')
  })

  it('shows at most 10 folders and says when more exist', async () => {
    const folders = Array.from({ length: 12 }, (_, index) =>
      folder(`folder-${String(index).padStart(2, '0')}`, 40 + index, 'F')
    )
    const w = await mountCard(quality({ folders }))
    const list = w.get('[data-testid="quality-folders"]')
    expect(list.findAll('a.folder__link')).toHaveLength(10)
    expect(list.text()).toContain('Showing the 10 folders with the lowest scores, of 12')
    expect(list.text()).toContain('folder-00')
    expect(list.text()).not.toContain('folder-11')
  })

  it('hides the card and folder list when a 1.1 or 1.2 graph has no quality field', async () => {
    expect((await mountCard(null)).find('[data-testid="quality-score"]').exists()).toBe(false)
    const omitted = await mountCard()
    await omitted.setProps({ quality: undefined })
    expect(omitted.find('[data-testid="quality-score"]').exists()).toBe(false)
  })

  it('hides tips and folders when those lists are empty, but still shows a perfect score', async () => {
    const w = await mountCard({
      project: project({
        score: 100,
        grade: 'A',
        tips: [],
        breakdown: breakdown({
          cycles: { label: 'No import cycles', penalty: 0 },
          hotspots: { label: 'No highly connected hotspots', penalty: 0 },
          size: { label: 'No unusually large files or functions', penalty: 0 }
        })
      })
    })
    expect(w.get('[data-testid="quality-score-card"]').text()).toContain('100')
    expect(w.get('.grade').attributes('data-grade')).toBe('A')
    expect(w.find('[data-testid="quality-tips"]').exists()).toBe(false)
    expect(w.find('[data-testid="quality-folders"]').exists()).toBe(false)
  })
})
