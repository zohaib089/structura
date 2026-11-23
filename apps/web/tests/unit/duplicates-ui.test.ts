import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import ReportDuplicates from '../../src/components/dashboard/report/ReportDuplicates.vue'
import type { DuplicateGroup, DuplicateOccurrence, GraphDuplicates } from '../../src/viewer/graph-types'
import {
  cappedDuplicateGroups,
  descriptionSegments,
  duplicateFileName,
  duplicateShortPath,
  hasGraphDuplicates,
  sortedDuplicateGroups
} from '../../src/viewer/duplicates'
import { scanReportMessages } from '../../src/services/scan-report-messages'

const messages = scanReportMessages('en')

function occurrence(path: string, startLine: number, endLine: number): DuplicateOccurrence {
  return { path, startLine, endLine }
}

function group(
  id: string,
  lineCount: number,
  occurrences: DuplicateOccurrence[],
  description?: string
): DuplicateGroup {
  return {
    id,
    lineCount,
    occurrences,
    description: description ?? `${lineCount} identical lines in ${occurrences.map((item) => item.path).join(' and ')}`
  }
}

function duplicates(overrides: Partial<GraphDuplicates> = {}): GraphDuplicates {
  const groups = [
    group('bbbbbbbbbbbb', 14, [
      occurrence('apps/web/src/viewer/read-graph.ts', 10, 28),
      occurrence('apps/web/src/viewer/parse-client.ts', 4, 22)
    ]),
    group('aaaaaaaaaaaa', 8, [
      occurrence('packages/cli/src/run.ts', 40, 52),
      occurrence('packages/cli/src/run.ts', 80, 92),
      occurrence('packages/engine/src/graph/read.ts', 3, 15)
    ])
  ]
  return {
    summary: { groups: 2, duplicatedLines: 42, percentage: 8 },
    groups,
    ...overrides
  }
}

async function mountSection(data: GraphDuplicates | null | undefined | 'default' = 'default') {
  const duplicatesProp = data === 'default' ? duplicates() : data
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: defineComponent({ render: () => h('div') }) }]
  })
  await router.push('/en/w/ws/projects/p/scans/s/summary')
  await router.isReady()
  return mount(ReportDuplicates, {
    props: {
      duplicates: duplicatesProp,
      title: messages.duplicatesTitle,
      hint: messages.duplicatesHint,
      groupsCaption: messages.duplicatesGroupsCaption,
      linesCaption: messages.duplicatesLinesCaption,
      percentValue: messages.duplicatesPercentValue,
      percentCaption: messages.duplicatesPercentCaption,
      summaryLabel: messages.duplicatesSummaryLabel,
      groupLines: messages.duplicatesGroupLines,
      groupPlaces: messages.duplicatesGroupPlaces,
      lineRange: messages.duplicatesLineRange,
      openLabel: messages.duplicatesOpen,
      showing: messages.duplicatesShowing,
      graphHref: (path?: string) => ({ path: '/graph', query: path ? { node: path } : {} })
    },
    global: { plugins: [router] }
  })
}

describe('duplicate helpers', () => {
  it('formats summary copy in plain English', () => {
    expect(messages.duplicatesTitle).toBe('Duplicated code')
    expect(messages.duplicatesGroupsValueLabel(1)).toBe('1 repeated block')
    expect(messages.duplicatesGroupsValueLabel(3)).toBe('3 repeated blocks')
    expect(messages.duplicatesLinesValueLabel(1)).toBe('1 repeated line')
    expect(messages.duplicatesLinesValueLabel(142)).toBe('142 repeated lines')
    expect(messages.duplicatesPercentValue(8)).toBe('8%')
    expect(messages.duplicatesSummaryLabel(2, 42, 8)).toBe(
      '2 repeated blocks. 42 repeated lines. 8% of the scanned code is repeated'
    )
    expect(messages.duplicatesGroupLines(14)).toBe('14 lines')
    expect(messages.duplicatesGroupPlaces(2)).toBe('2 places')
    expect(messages.duplicatesLineRange(10, 16)).toBe('lines 10–16')
    expect(messages.duplicatesLineRange(7, 7)).toBe('line 7')
  })

  it('sorts groups by line count, then occurrence count, then id', () => {
    const rows = sortedDuplicateGroups([
      group('z', 8, [occurrence('a.ts', 1, 8), occurrence('b.ts', 1, 8)]),
      group('b', 14, [occurrence('a.ts', 1, 14), occurrence('b.ts', 1, 14)]),
      group('a', 14, [occurrence('a.ts', 1, 14), occurrence('b.ts', 1, 14)]),
      group('m', 14, [occurrence('a.ts', 1, 14), occurrence('b.ts', 1, 14), occurrence('c.ts', 1, 14)])
    ])
    expect(rows.map((row) => row.id)).toEqual(['m', 'a', 'b', 'z'])
  })

  it('caps the list at the 20 largest groups', () => {
    const rows = Array.from({ length: 24 }, (_, index) =>
      group(
        `id${String(index).padStart(2, '0')}`,
        6 + index,
        [occurrence('a.ts', 1, 8), occurrence('b.ts', 1, 8)]
      )
    )
    const capped = cappedDuplicateGroups(rows)
    expect(capped).toHaveLength(20)
    expect(capped[0]?.lineCount).toBe(29)
    expect(capped.at(-1)?.lineCount).toBe(10)
    expect(capped.map((row) => row.id)).not.toContain('id00')
  })

  it('formats file names and short paths', () => {
    expect(duplicateFileName('apps/web/src/viewer/read-graph.ts')).toBe('read-graph.ts')
    expect(duplicateShortPath('apps/web/src/viewer/read-graph.ts')).toBe('apps/web/src/viewer')
    expect(duplicateShortPath('run.ts')).toBe('')
  })

  it('splits descriptions so long paths can wrap at slashes', () => {
    expect(descriptionSegments('6 identical lines in src/a.ts and src/b.ts')).toEqual([
      '6 identical lines in src',
      '/a.ts and src',
      '/b.ts'
    ])
    expect(descriptionSegments('No slashes here')).toEqual(['No slashes here'])
  })

  it('treats a missing or empty duplicates object as absent', () => {
    expect(hasGraphDuplicates(undefined)).toBe(false)
    expect(hasGraphDuplicates(null)).toBe(false)
    expect(hasGraphDuplicates({ summary: { groups: 0, duplicatedLines: 0, percentage: 0 }, groups: [] })).toBe(false)
    expect(hasGraphDuplicates(duplicates())).toBe(true)
  })
})

describe('Duplicated code section', () => {
  it('shows the summary counts and top group rows', async () => {
    const w = await mountSection()
    const section = w.get('[data-testid="duplicated-code"]')
    expect(section.text()).toContain('Duplicated code')
    const summary = w.get('[data-testid="duplicates-summary"]')
    expect(summary.text()).toContain('2')
    expect(summary.text()).toContain('repeated blocks')
    expect(summary.text()).toContain('42')
    expect(summary.text()).toContain('repeated lines')
    expect(summary.text()).toContain('8%')
    expect(summary.text()).toContain('of the scanned code is repeated')
    expect(summary.attributes('aria-label')).toContain('2 repeated blocks')

    const rows = w.get('[data-testid="duplicates-groups"]').findAll('.group')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('14 lines')
    expect(rows[0]!.text()).toContain('2 places')
    expect(rows[0]!.text()).toContain('14 identical lines in apps/web/src/viewer/read-graph.ts and apps/web/src/viewer/parse-client.ts')
    expect(rows[1]!.text()).toContain('8 lines')
    expect(rows[1]!.text()).toContain('3 places')
  })

  it('links each file occurrence to the graph with the path and line range', async () => {
    const w = await mountSection()
    const links = w.get('[data-testid="duplicates-groups"]').findAll('a.occ__link')
    expect(links).toHaveLength(5)
    expect(links[0]!.text()).toContain('read-graph.ts')
    expect(links[0]!.text()).toContain('apps/web/src/viewer')
    expect(links[0]!.text()).toContain('lines 10–28')
    expect(links[0]!.attributes('href')).toBe('/graph?node=apps/web/src/viewer/read-graph.ts')
    expect(links[0]!.attributes('aria-label')).toContain('Show in graph')
    expect(links[2]!.text()).toContain('run.ts')
    expect(links[2]!.text()).toContain('lines 40–52')
    expect(links[2]!.attributes('href')).toBe('/graph?node=packages/cli/src/run.ts')
  })

  it('shows at most 20 groups and says when more exist', async () => {
    const groups = Array.from({ length: 22 }, (_, index) =>
      group(
        `id${String(index).padStart(2, '0')}`,
        6 + index,
        [occurrence(`src/a${index}.ts`, 1, 8), occurrence(`src/b${index}.ts`, 1, 8)]
      )
    )
    const w = await mountSection({
      summary: { groups: 22, duplicatedLines: 200, percentage: 12 },
      groups
    })
    const list = w.get('[data-testid="duplicates-groups"]')
    const rows = list.findAll('.group')
    expect(rows).toHaveLength(20)
    expect(w.get('[data-testid="duplicated-code"]').text()).toContain(
      'Showing the 20 largest repeated blocks, of 22'
    )
    expect(rows[0]!.attributes('data-group-id')).toBe('id21')
    expect(rows[0]!.text()).toContain('a21.ts')
    expect(rows.at(-1)!.attributes('data-group-id')).toBe('id02')
    expect(list.text()).not.toContain('a00.ts')
    expect(list.text()).not.toContain('a01.ts')
  })

  it('hides the section when a 1.1–1.3 graph has no duplicates field, or when there are no groups', async () => {
    expect((await mountSection(null)).find('[data-testid="duplicated-code"]').exists()).toBe(false)
    const omitted = await mountSection()
    await omitted.setProps({ duplicates: undefined })
    expect(omitted.find('[data-testid="duplicated-code"]').exists()).toBe(false)
    const empty = await mountSection({
      summary: { groups: 0, duplicatedLines: 0, percentage: 0 },
      groups: []
    })
    expect(empty.find('[data-testid="duplicated-code"]').exists()).toBe(false)
  })
})
