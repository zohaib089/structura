import { describe, expect, it } from 'vitest'
import { scanReportMessages } from '../../src/services/scan-report-messages'
import {
  MESSAGE_CODE_IDS,
  formatHotspotWhyText,
  formatMessageCode,
  formatQualityTipAction,
  formatQualityTipText,
  localizeAskSuggestion
} from '../../src/viewer/graph-message-codes'
import type { MessageParams } from '../../src/viewer/graph-types'
import { tipActionText } from '../../src/viewer/quality-score'
import { qualityBreakdownLabel } from '../../src/viewer/quality-breakdown-label'
import { duplicateGroupDescription } from '../../src/viewer/duplicates'

const en = scanReportMessages('en')
const fr = scanReportMessages('fr')
const hi = scanReportMessages('hi')

const samples: Record<(typeof MESSAGE_CODE_IDS)[number], MessageParams | undefined> = {
  'quality.architecture': { high: 2, medium: 1 },
  'quality.cycles': { count: 2 },
  'quality.hotspots': { count: 3, maxCount: 1 },
  'quality.imports': { unresolvedPercent: 12, externalPercent: 60 },
  'quality.size': { largeFiles: 1, largeFunctions: 2 },
  'quality.tip.forbidden-import': { file: 'src/app.ts', gain: 4 },
  'quality.tip.undeclared-import': { file: 'src/app.ts', gain: 3 },
  'quality.tip.cycle': { files: ['src/a.ts', 'src/b.ts'], gain: 5 },
  'quality.tip.large-file': { path: 'src/app.ts', lines: 800, gain: 6 },
  'quality.tip.large-function': { name: 'parse', path: 'src/app.ts', lines: 200, gain: 4 },
  'quality.tip.unresolved-imports': { gain: 3 },
  'quality.tip.hotspot': { path: 'src/app.ts', score: 80, gain: 5 },
  'quality.tip.architecture': { gain: 8 },
  'quality.tip.cycles': { gain: 8 },
  'quality.tip.hotspots': { gain: 8 },
  'quality.tip.imports': { gain: 8 },
  'quality.tip.size': { gain: 8 },
  'hotspot.why': { fanIn: 36, fanOut: 1, impact: 111, size: 488, sizeKind: 'lines' },
  'duplicate.same-file': { lineCount: 48, path: 'src/msg.ts', times: 8 },
  'duplicate.pair': { lineCount: 64, path: 'a.ts', otherPath: 'b.ts' },
  'duplicate.many-files': { lineCount: 20, fileCount: 4 },
  'qa.resolve.missing': { ref: 'nope.ts' },
  'qa.resolve.ambiguous': { ref: 'util', listed: ['src/util.ts', 'lib/util.ts'], extraCount: 2 },
  'qa.impact.need-target': undefined,
  'qa.impact.no-files': { target: 'src/app.ts' },
  'qa.impact.none': { target: 'src/app.ts', kind: 'file' },
  'qa.impact.dependents': {
    target: 'src/app.ts',
    kind: 'file',
    dependentCount: 2,
    listed: ['src/main.ts (depth 1)', 'src/cli.ts (depth 2)'],
    extraCount: 1
  },
  'qa.explain.need-target': undefined,
  'qa.explain.file': { path: 'src/app.ts', language: 'TypeScript', lineCount: 20, imports: ['src/lib.ts'], extraImports: 0 },
  'qa.explain.folder': { path: 'src', fileCount: 4, files: ['src/app.ts'], extraFiles: 3 },
  'qa.explain.folder-empty': { path: 'empty' },
  'qa.explain.symbol': { name: 'parse', kind: 'function', path: 'src/app.ts', startLine: 10, endLine: 18, exported: true },
  'qa.hotspots.none': undefined,
  'qa.hotspots.list': { count: 2, paths: ['src/a.ts', 'src/b.ts'], scores: ['61', '52'], extraCount: 1 },
  'qa.quality.none': undefined,
  'qa.quality.score': { lead: 'The project scores', score: 80, grade: 'B' },
  'qa.quality.folder-missing': { path: 'src', projectScore: 80, projectGrade: 'B' },
  'qa.duplicates.none': undefined,
  'qa.duplicates.list': {
    groups: 2,
    duplicatedLines: 40,
    percentage: 6,
    descriptions: ['64 identical lines in a.ts and b.ts'],
    extraCount: 1
  },
  'qa.architecture': { cycleCount: 2, hasConfig: true, findingCount: 0 },
  'qa.overview': { fileCount: 10, languages: '8 TypeScript and 2 Python', folders: ['src', 'apps'], extraFolders: 1 },
  'qa.fallback.empty': { examples: ['How healthy is the project?'] },
  'qa.fallback.unknown': { examples: ['What are the riskiest files?'] }
}

describe('formatMessageCode', () => {
  it('covers all 43 engine message codes from params', () => {
    expect(MESSAGE_CODE_IDS).toHaveLength(43)
    const missing: string[] = []
    for (const code of MESSAGE_CODE_IDS) {
      const text = formatMessageCode(code, samples[code], en)
      if (!text || text.trim().length === 0) missing.push(code)
    }
    expect(missing).toEqual([])
  })

  it('returns null for a missing, unknown, or under-specified code so callers can keep English', () => {
    expect(formatMessageCode(undefined, { count: 2 }, en)).toBeNull()
    expect(formatMessageCode('not.a.real-code', { count: 2 }, en)).toBeNull()
    expect(formatMessageCode('quality.cycles', {}, en)).toBeNull()
    expect(formatMessageCode('quality.tip.forbidden-import', { gain: 4 }, en)).toBeNull()
    expect(formatMessageCode('duplicate.pair', { lineCount: 4, path: 'a.ts' }, en)).toBeNull()
  })

  it('renders clean and counted quality labels, including zero-count none cases', () => {
    expect(formatMessageCode('quality.architecture', { high: 0, medium: 0 }, en)).toBe('No architecture rule breaks')
    expect(formatMessageCode('quality.cycles', { count: 0 }, fr)).toBe(fr.qualityLabelCyclesNone)
    expect(formatMessageCode('quality.cycles', { count: 2 }, fr)).toBe(fr.qualityLabelCycles(2))
    expect(formatMessageCode('quality.imports', { unresolvedPercent: 0, externalPercent: 20 }, en)).toBe(
      'Imports resolve cleanly'
    )
    expect(formatMessageCode('quality.hotspots', { count: 3, maxCount: 1 }, hi)).toBe(hi.qualityLabelHotspotsWithMax(3, 1))
  })

  it('uses existing English label or occurrence data when a code is absent', () => {
    expect(
      qualityBreakdownLabel({ category: 'cycles', label: '2 import cycles', penalty: 8 }, en)
    ).toBe('2 import cycles')
    expect(
      duplicateGroupDescription(
        {
          lineCount: 64,
          occurrences: [
            { path: 'a.ts', startLine: 1, endLine: 64 },
            { path: 'b.ts', startLine: 1, endLine: 64 }
          ],
          description: '64 identical lines in a.ts and b.ts'
        },
        en
      )
    ).toBe('64 identical lines in a.ts and b.ts')
  })

  it('prefers code and params over the English string in the UI helpers', () => {
    expect(
      qualityBreakdownLabel(
        { category: 'cycles', label: '2 import cycles', penalty: 8, code: 'quality.cycles', params: { count: 2 } },
        fr
      )
    ).toBe(fr.qualityLabelCycles(2))
    expect(
      duplicateGroupDescription(
        {
          lineCount: 64,
          occurrences: [
            { path: 'a.ts', startLine: 1, endLine: 64 },
            { path: 'b.ts', startLine: 1, endLine: 64 }
          ],
          description: '64 identical lines in a.ts and b.ts',
          code: 'duplicate.pair',
          params: { lineCount: 64, path: 'a.ts', otherPath: 'b.ts' }
        },
        fr
      )
    ).toBe(fr.duplicatesDescriptionTwoPaths(64, 'a.ts', 'b.ts'))
    expect(
      formatHotspotWhyText(
        {
          path: 'src/app.ts',
          score: 61,
          why: 'Used by 36 files, imports 1 file, impacts 111 files, and has 488 lines',
          code: 'hotspot.why',
          params: { fanIn: 36, fanOut: 1, impact: 111, size: 488, sizeKind: 'lines' }
        },
        fr
      )
    ).toContain('36')
    expect(
      formatHotspotWhyText(
        {
          path: 'src/app.ts',
          score: 61,
          why: 'Used by 36 files, imports 1 file, impacts 111 files, and has 488 lines',
          code: 'hotspot.why',
          params: { fanIn: 36, fanOut: 1, impact: 111, size: 488, sizeKind: 'lines' }
        },
        fr
      )
    ).not.toBe('Used by 36 files, imports 1 file, impacts 111 files, and has 488 lines')
  })

  it('omits the gain suffix on tip actions when the chip already shows the gain', () => {
    const tip = {
      text: 'Fix the forbidden import in src/app.ts to gain about 4 points',
      gain: 4,
      code: 'quality.tip.forbidden-import' as const,
      params: { file: 'src/app.ts', gain: 4 }
    }
    expect(formatQualityTipAction(tip, en)).toBe('Fix the forbidden import in src/app.ts')
    expect(formatQualityTipText(tip, en)).toBe('Fix the forbidden import in src/app.ts to gain about 4 points')
    expect(tipActionText(tip, fr)).toBe(fr.qualityTipForbiddenImport('src/app.ts'))
    expect(tipActionText(tip, fr)).not.toContain(fr.qualityTipGainSuffix(4))
    expect(tipActionText({ text: 'Do something else', gain: 4 }, fr)).toBe('Do something else')
  })

  it('translates closed-set Q&A suggestions and leaves unknown text in English', () => {
    expect(localizeAskSuggestion('How healthy is the project?', fr)).toBe(fr.askSuggestionQuality)
    expect(localizeAskSuggestion('What breaks if I change src/app.ts?', hi)).toBe(hi.askSuggestionImpact('src/app.ts'))
    expect(localizeAskSuggestion('Tell me a secret handshake', fr)).toBe('Tell me a secret handshake')
  })

  it('localizes Q&A answers from code and params, including French typographic quotes', () => {
    const missing = formatMessageCode('qa.resolve.missing', { ref: 'nope.ts' }, fr)
    expect(missing).toContain('nope.ts')
    expect(missing).not.toContain('I could not find')
    const fallback = formatMessageCode('qa.fallback.empty', { examples: ['How healthy is the project?'] }, fr)
    expect(fallback).toContain(fr.askSuggestionQuality)
    expect(fallback?.startsWith(fr.qaFallbackEmpty)).toBe(true)
    const architecture = formatMessageCode('qa.architecture', { cycleCount: 0, hasConfig: true, findingCount: 0 }, hi)
    expect(architecture).toBe(`${hi.qaArchitectureNoCycles} ${hi.qaArchitectureNoFindings}`)
  })
})
