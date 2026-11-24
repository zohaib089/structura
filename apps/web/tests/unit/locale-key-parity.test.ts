import { describe, expect, it } from 'vitest'
import { dashboardMessages } from '../../src/services/dashboard-messages'
import { WEB_LOCALES, type WebLocale } from '../../src/services/locale'
import { scanMessages } from '../../src/services/scan-messages'
import { scanReportMessages } from '../../src/services/scan-report-messages'
import { viewerMessages } from '../../src/viewer/messages'

/** Flatten strings, arrays and plain objects to dotted/indexed leaf keys. Functions are leaves. */
function leafKeys(value: unknown, path = ''): string[] {
  if (typeof value === 'function' || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return path ? [path] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leafKeys(item, `${path}[${index}]`))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      leafKeys(child, path ? `${path}.${key}` : key)
    )
  }
  return path ? [path] : []
}

function leafMap(value: unknown): Map<string, unknown> {
  const entries: Array<[string, unknown]> = []
  function walk(current: unknown, path = ''): void {
    if (typeof current === 'function' || typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean') {
      if (path) entries.push([path, current])
      return
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }
    if (current && typeof current === 'object') {
      for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
        walk(child, path ? `${path}.${key}` : key)
      }
    } else if (path) {
      entries.push([path, current])
    }
  }
  walk(value)
  return new Map(entries)
}

const catalogs: Array<{ name: string; read: (locale: WebLocale) => unknown }> = [
  { name: 'dashboard', read: dashboardMessages },
  { name: 'scan-report', read: scanReportMessages },
  { name: 'scan', read: scanMessages },
  { name: 'viewer', read: viewerMessages }
]

/** New-screen and Activity keys that must be real translations, not leftover English. */
const MUST_TRANSLATE_PREFIXES = [
  'projectAccess',
  'activity',
  'riskiestFiles',
  'hotspotBand',
  'quality',
  'duplicates',
  'ask',
  'showHotspots',
  'hotspotLegend',
  'riskToChange',
  'layout',
  'coachOpen',
  'zoomFit',
  'fitTooltip',
  'fileListLabel',
  'provExtracted',
  'provInferred',
  'provUnresolved',
  'provMixed',
  'budgetMeter',
  'search',
  'crumbRoot',
  'projectBreadcrumb',
  'scanBreadcrumb',
  'graphTabBreadcrumb',
  'tabSummary',
  'tabFindings',
  'tabViolations',
  'tabSecurity',
  'tabBadPractices',
  'tabImprovements',
  'tabRemovals',
  'tabGraph',
  'tabHistory',
  'tabArchitecture',
  'hotspotWhy',
  'qa',
  'scansNav',
  'settingsNav',
  'openProjectNav',
  'navGroup',
  'switchWorkspace',
  'sidebarCollapse',
  'sidebarExpand',
  'skipToContent',
  'commandPalette',
  'appShellNavigation',
  'breadcrumbLabel',
  'hubEyebrow',
  'hubTitle',
  'hubDescription',
  'openProjectTitle',
  'openProjectHint',
  'sourceFolder',
  'sourceZip',
  'sourceGit',
  'folderDropTitle',
  'zipDropTitle',
  'browseLabel',
  'folderHint',
  'zipHint',
  'gitUrlLabel',
  'gitUrlHint',
  'invalidGitUrl',
  'branchLabel',
  'branchOptional',
  'startScan',
  'scanning',
  'uploadProgress',
  'zipUploadTooLarge',
  'invalidZipUpload',
  'scanListTitle',
  'scanListEmpty',
  'loadScansError',
  'refreshScans',
  'scanStatus',
  'scanSourceLabel',
  'scanFailed',
  'scanStep',
  'scanCancel',
  'scanCancelling',
  'scanCompleteToast',
  'viewReportAction',
  'progressHeading',
  'selectScan',
  'recentScansTitle',
  'viewAllScans',
  'noScanSelected',
  'loadingScanGraph',
  'loadScanGraphError',
  'treeExpandFolder',
  'treeCollapseFolder',
  'historyHotspotsHint',
  'historyChurnHint'
]

/** Templates that can legitimately stay identical across locales (placeholders only, or shared punctuation). */
const MAY_MATCH_EN = new Set([
  'activityExactTimeLabel',
  'riskiestFilesScore',
  'duplicatesPercentValue',
  'riskToChangeValue',
  'askCitationIn', // Italian naturally uses "in {path}"
  'nl:activityFilterProject', // Dutch uses the same word
  'nl:projectBreadcrumb',
  'nl:coachOpenLabel', // "Tips" is also the Dutch word
  'pt:layoutRadial',
  'pt:layoutLinear',
  'fr:layoutRadial',
  'es:layoutRadial',
  'fr:tabArchitecture', // "Architecture" is the same word in French
  'it:searchFiles', // "File" is the same word in Italian
  'qaExplainKind', // `${kind} ${name}` keeps identifier order
  'qaQualityPenaltyItem', // label plus unicode minus penalty
  'qaDuplicatesItem', // numbered list marker
  'qaQuote', // typographic quotes are shared by several locales
  'pt:qaEntryPythonMain',
  'it:qaEntryPythonMain',
  'fr:qaEntryPythonMain',
  'nl:qaEntryPythonMain',
  'es:qaEntryPythonMain',
  'zh-Hans:qaEntryPythonMain',
  'hi:qaEntryPythonMain',
  'ur:qaEntryPythonMain',
  'archiveLimitLabel', // formatted size, shared across locales
  'pt:sourceZip',
  'it:sourceZip',
  'fr:sourceZip',
  'nl:sourceZip',
  'es:sourceZip',
  'ja:sourceZip',
  'zh-Hans:sourceZip',
  'hi:sourceZip',
  'ur:sourceZip',
  'pt:sourceGit',
  'it:sourceGit',
  'ja:sourceGit',
  'hi:sourceGit',
  'ur:sourceGit',
  'pt:branchLabel',
  'it:branchLabel',
  'nl:branchLabel'
])

function isNewScreenKey(key: string): boolean {
  const head = key.split(/[.\[]/, 1)[0] ?? key
  return MUST_TRANSLATE_PREFIXES.some((prefix) => head.startsWith(prefix))
}

function sample(key: string, value: unknown, self?: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value !== 'function') return String(value ?? '')
  const fn = value as (...args: never[]) => string
  const call = (...args: unknown[]) => String((fn as (this: unknown, ...a: unknown[]) => unknown).call(self, ...args) ?? '')
  if (/hotspotBand|BandLabel/.test(key)) return call('high')
  if (/qualityCategory/.test(key)) return call('architecture')
  if (/RolePhrase/.test(key)) return call('admin')
  if (/CharCount/.test(key)) return call(12, 500)
  if (/LineRange|askLines/.test(key)) return call(10, 18)
  if (key === 'askLine' || key.endsWith('.askLine')) return call(4)
  if (/MinutesAgo|HoursAgo|DaysAgo/.test(key)) return call(3)
  if (/PointsOff|TipGain/.test(key)) return call(4)
  if (/Showing/.test(key)) return call(5, 20)
  if (/ScoreLabel/.test(key)) return call(69, 'D')
  if (/GradeLabel/.test(key)) return call('D')
  if (/PercentValue/.test(key)) return call(6)
  if (/SummaryLabel/.test(key)) return call(3, 40, 6)
  if (/GroupsValueLabel|LinesValueLabel|GroupLines|GroupPlaces|Caption/.test(key)) return call(4)
  if (/AccessLimited/.test(key)) return call('Taylor', 'Atlas', 2)
  if (/ExactTimeLabel/.test(key)) return call('yesterday', '12:00')
  if (/CitationIn/.test(key)) return call('src/app.ts')
  if (/ListAnd/.test(key)) return call(['alpha', 'bravo', 'charlie'])
  if (/SmallPenalty/.test(key)) return call('Circular imports')
  if (/budgetMeter/.test(key)) return call('4', '3', 3)
  if (/HotspotsWithMax/.test(key)) return call(3, 1)
  if (/DescriptionTwoPaths/.test(key)) return call(12, 'a.ts', 'b.ts')
  if (/DescriptionOnePath/.test(key)) return call(12, 8, 'a.ts')
  if (/DescriptionManyPaths/.test(key)) return call(12, 3)
  if (/HotspotsItem/.test(key)) return call(1, 'src/app.ts', 61, 'Used by 2 files')
  if (/ExplainFileLead/.test(key)) return call('src/app.ts', 'TypeScript', 40)
  if (/ExplainFolderLead/.test(key)) return call('src', 4, '4 TypeScript')
  if (/ExplainFolderTip|QualityTipItem/.test(key)) return call('Fix the cycle', 4)
  if (/ExplainSymbol/.test(key) && fn.length >= 4) return call('parse', 'function', 'src/app.ts', 10, 18)
  if (/FolderMissing/.test(key)) return call('src', 80, 'B')
  if (/DuplicatesHead/.test(key)) return call(3, 40, 6)
  if (/ScoreLine/.test(key)) return call('The project scores', 80, 'B')
  if (/DependentsFolder/.test(key)) return call('src', 4, 6, 'a.ts (depth 1)', ' 2 more.')
  if (/DependentsFile|ResolveAmbiguous/.test(key)) return call('src/app.ts', 'a.ts and b.ts', ' and 2 more')
  if (/tabArchitecture|qualityLabel|duplicatesDescription|fileListLabel/.test(key) && fn.length === 1) return call(2)
  if (/scanStatus/.test(key)) return call('succeeded')
  if (/scanSourceLabel/.test(key)) return call({ source: 'upload', branch: null, url: null })
  if (/scanStepStatusLines|scanStepLabels|scanStepTerminalLabels/.test(key)) {
    return JSON.stringify((fn as (this: unknown, ...a: unknown[]) => unknown).call(self) ?? {})
  }
  if (fn.length >= 2) return call('Taylor', 'Sam')
  if (fn.length === 1) return call('Taylor')
  return call()
}

describe('locale key parity', () => {
  it('gives every locale the same keys as English, including nested keys, with no extras', () => {
    for (const catalog of catalogs) {
      const englishKeys = leafKeys(catalog.read('en')).sort()
      expect(englishKeys.length, `${catalog.name} english`).toBeGreaterThan(0)
      for (const { tag } of WEB_LOCALES) {
        const keys = leafKeys(catalog.read(tag)).sort()
        const missing = englishKeys.filter((key) => !keys.includes(key))
        const extra = keys.filter((key) => !englishKeys.includes(key))
        expect({ catalog: catalog.name, locale: tag, missing, extra }).toEqual({
          catalog: catalog.name,
          locale: tag,
          missing: [],
          extra: []
        })
      }
    }
  })

  it('translates Access, Activity, riskiest files, quality, duplicates, ask, hotspot legend, and remaining dashboard chrome strings', () => {
    for (const catalog of catalogs) {
      const english = leafMap(catalog.read('en'))
      for (const { tag } of WEB_LOCALES) {
        if (tag === 'en') continue
        const localized = leafMap(catalog.read(tag))
        const leftover: string[] = []
        for (const [key, enValue] of english) {
          if (!isNewScreenKey(key) || MAY_MATCH_EN.has(key) || MAY_MATCH_EN.has(`${tag}:${key}`)) continue
          const value = localized.get(key)
          const enSample = sample(key, enValue, catalog.read('en'))
          const locSample = sample(key, value, catalog.read(tag))
          expect(locSample.trim().length, `${catalog.name} ${tag} ${key}`).toBeGreaterThan(0)
          if (locSample === enSample && /[a-z]{3,}/i.test(enSample)) leftover.push(key)
        }
        expect(leftover, `${catalog.name} ${tag}`).toEqual([])
      }
    }
  })
})
