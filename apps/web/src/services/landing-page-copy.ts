import { BRAND } from '../../../../packages/brand/src/brand'
import type { WebLocale } from './locale'
import { en } from './landing-copy/en'
import { es } from './landing-copy/es'
import { fr } from './landing-copy/fr'
import { hi } from './landing-copy/hi'
import { it } from './landing-copy/it'
import { ja } from './landing-copy/ja'
import { nl } from './landing-copy/nl'
import { pt } from './landing-copy/pt'
import type { LandingStrings } from './landing-copy/types'
import { ur } from './landing-copy/ur'
import { zhHans } from './landing-copy/zh-Hans'
import type { SampleLinkKind, SampleSeverity } from './landing-sample-graph'

/**
 * Copy for the advanced landing page (design: landing-advanced.md §3-4), for every supported web locale.
 * Text lives in ./landing-copy/<locale>.ts (typed by LandingStrings, so a missing key fails typecheck).
 * Structure, icons, numbers, code lines and commands are shared here. The product name always comes from BRAND.
 * EXTRACTED / INFERRED / UNRESOLVED stay as untranslated small tags.
 */
export const LANDING_STRINGS: Record<WebLocale, LandingStrings> = { en, pt, it, fr, nl, es, ja, 'zh-Hans': zhHans, hi, ur }

const name = BRAND.name

export function fillCopy(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{([A-Za-z]+)\}/g, (match, key: string) =>
    key === 'name' ? name : values[key] !== undefined ? String(values[key]) : match
  )
}

function deepFill<T>(value: T): T {
  if (typeof value === 'string') return fillCopy(value) as T
  if (Array.isArray(value)) return value.map(item => deepFill(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepFill(item)])) as T
  }
  return value
}

const PROOF_ICONS = ['monitor', 'user', 'code', 'tag'] as const
const PHASE_PROGRESS = [12, 48, 80, 94] as const
const FINDING_SEVERITY: SampleSeverity[] = ['critical', 'high', 'medium']
const CONNECTION_ROWS = [
  { kind: 'extracted' as SampleLinkKind, tag: 'EXTRACTED', commentLine: '// router.ts', codeLine: "import { auth } from './auth'" },
  { kind: 'inferred' as SampleLinkKind, tag: 'INFERRED', commentLine: '// api.ts', codeLine: 'const page = await import(`./pages/${name}`)' },
  { kind: 'unresolved' as SampleLinkKind, tag: 'UNRESOLVED', commentLine: '// plugins.ts', codeLine: 'require(process.env.PLUGIN_PATH)' }
]
const COVERAGE_ICONS = ['alert', 'alert', 'check'] as const
/** Commands follow the repository README (Docker Compose). Shown as Illustrative until the self-host guide is published. */
const TERMINAL_COMMANDS = ['git clone <atlasmith-repo-url>', 'docker compose up --build', 'http://localhost:5173']

function buildCopy(raw: LandingStrings) {
  const t = deepFill(raw)
  const stepsAway = (ring: number) => fillCopy(ring === 1 ? t.steps.one : t.steps.other, { n: ring })
  return {
    documentTitle: t.documentTitle,
    metaDescription: t.metaDescription,
    skipLink: t.skipLink,
    homeLabel: t.homeLabel,
    nav: { ...t.nav, github: 'GitHub' },
    cta: { ...t.cta, github: 'GitHub' },
    hero: { ...t.hero, legend: { extracted: t.linkKind.extracted, inferred: t.linkKind.inferred, unresolved: t.linkKind.unresolved } },
    ringLabels: { 1: stepsAway(1), 2: stepsAway(2), 3: stepsAway(3) } as Record<1 | 2 | 3, string>,
    stepsAway,
    a11y: t.a11y,
    proof: {
      label: t.proof.label,
      items: t.proof.items.map(([title, body], index) => ({ icon: PROOF_ICONS[index], title, body }))
    },
    how: {
      kicker: t.how.kicker,
      title: t.how.title,
      lead: t.how.lead,
      step: t.how.step,
      steps: t.how.steps.map(([title, body]) => ({ title, body })),
      sources: [...t.how.sources],
      checking: { ...t.how.checking, skipped: 'node_modules' },
      loaderLabel: t.how.loaderLabel,
      initialStatus: t.how.initialStatus,
      initialProgress: 43,
      runScan: t.how.runScan,
      previewToasts: t.how.previewToasts,
      phases: t.how.phases.map(([title, status], index) => ({ title, status, progress: PHASE_PROGRESS[index] })),
      finished: { title: t.how.finished[0], status: t.how.finished[1], progress: 100 },
      findingsLabel: t.how.findingsLabel,
      findings: t.how.findings.map((text, index) => ({ severity: FINDING_SEVERITY[index], text }))
    },
    toasts: t.toasts,
    connections: {
      kicker: t.connections.kicker,
      title: t.connections.title,
      lead: t.connections.lead,
      rows: CONNECTION_ROWS.map((row, index) => ({
        kind: row.kind,
        title: t.connections.rows[index][0],
        tag: `${row.tag} \u00b7 ${t.connections.lines[index]}`,
        body: t.connections.rows[index][1],
        commentLine: row.commentLine,
        codeLine: row.codeLine
      }))
    },
    coverage: {
      kicker: t.coverage.kicker,
      title: t.coverage.title,
      lead: t.coverage.lead,
      note: t.coverage.note,
      statValue: t.coverage.statValue,
      statLabel: t.coverage.statLabel,
      barLabel: t.coverage.barLabel,
      checkedPercent: 94.7,
      rows: t.coverage.rows.map(([text, why, count], index) => ({ icon: COVERAGE_ICONS[index], text, why, count }))
    },
    selfHost: {
      kicker: t.selfHost.kicker,
      title: t.selfHost.title,
      lead: t.selfHost.lead,
      bullets: [...t.selfHost.bullets],
      terminalLabel: t.selfHost.terminalLabel,
      terminalBadge: t.selfHost.terminalBadge,
      terminalTitle: 'terminal',
      terminalLines: TERMINAL_COMMANDS.map((command, index) => ({ comment: t.selfHost.comments[index], command }))
    },
    closing: t.closing,
    footer: { ...t.footer, github: 'GitHub' },
    severity: t.severity as Record<SampleSeverity, string>,
    linkKind: t.linkKind as Record<SampleLinkKind, string>
  }
}

export type LandingPageCopy = ReturnType<typeof buildCopy>

const cache = new Map<WebLocale, LandingPageCopy>()

export function landingPageCopyFor(locale: WebLocale): LandingPageCopy {
  let copy = cache.get(locale)
  if (!copy) {
    copy = buildCopy(LANDING_STRINGS[locale] ?? en)
    cache.set(locale, copy)
  }
  return copy
}

/** English copy, kept for callers that have no route (tests, static defaults). */
export const landingPageCopy = landingPageCopyFor('en')

export function stepsAway(ring: number): string {
  return landingPageCopy.stepsAway(ring)
}
