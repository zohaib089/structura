import { describe, expect, it } from 'vitest'
import { dashboardMessages } from '../../src/services/dashboard-messages'
import { WEB_LOCALES, type WebLocale } from '../../src/services/locale'
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
  'riskToChange'
]

/** Templates that can legitimately stay identical across locales (placeholders only, or shared punctuation). */
const MAY_MATCH_EN = new Set([
  'activityExactTimeLabel',
  'riskiestFilesScore',
  'duplicatesPercentValue',
  'riskToChangeValue',
  'askCitationIn', // Italian naturally uses "in {path}"
  'nl:activityFilterProject' // Dutch uses the same word
])

function isNewScreenKey(key: string): boolean {
  const head = key.split(/[.\[]/, 1)[0] ?? key
  return MUST_TRANSLATE_PREFIXES.some((prefix) => head.startsWith(prefix))
}

function sample(key: string, value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value !== 'function') return String(value ?? '')
  const fn = value as (...args: never[]) => string
  const call = (...args: unknown[]) => String((fn as (...a: unknown[]) => unknown)(...args) ?? '')
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

  it('translates Access, Activity, riskiest files, quality, duplicates, ask, and hotspot legend strings', () => {
    for (const catalog of catalogs) {
      const english = leafMap(catalog.read('en'))
      for (const { tag } of WEB_LOCALES) {
        if (tag === 'en') continue
        const localized = leafMap(catalog.read(tag))
        const leftover: string[] = []
        for (const [key, enValue] of english) {
          if (!isNewScreenKey(key) || MAY_MATCH_EN.has(key) || MAY_MATCH_EN.has(`${tag}:${key}`)) continue
          const value = localized.get(key)
          const enSample = sample(key, enValue)
          const locSample = sample(key, value)
          expect(locSample.trim().length, `${catalog.name} ${tag} ${key}`).toBeGreaterThan(0)
          if (locSample === enSample && /[a-z]{3,}/i.test(enSample)) leftover.push(key)
        }
        expect(leftover, `${catalog.name} ${tag}`).toEqual([])
      }
    }
  })
})
