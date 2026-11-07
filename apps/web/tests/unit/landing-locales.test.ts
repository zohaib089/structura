import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import AuthShell from '../../src/components/auth/AuthShell.vue'
import HomeView from '../../src/views/HomeView.vue'
import { LANDING_STRINGS, landingPageCopyFor } from '../../src/services/landing-page-copy'
import { en } from '../../src/services/landing-copy/en'
import { WEB_LOCALES } from '../../src/services/locale'
import { navigationMessages } from '../../src/services/navigation-messages'

function leaves(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]]
  if (Array.isArray(value)) return value.flatMap((item, i) => leaves(item, `${path}[${i}]`))
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
  return []
}

/** Keys whose English value is a proper noun, number or code and may legitimately stay identical. */
const MAY_MATCH_EN = new Set(['how.sources[1]', 'coverage.rows[0][1]', 'nl:nav.product'])
const PLACEHOLDERS = /\{(name|n|label|steps|link|issue|severity|start)\}/g

const enLeaves = new Map(leaves(en))

describe('landing copy translations', () => {
  it('covers every supported locale with every key', () => {
    expect(Object.keys(LANDING_STRINGS).sort()).toEqual(WEB_LOCALES.map(l => l.tag).sort())
    for (const { tag } of WEB_LOCALES) {
      const keys = leaves(LANDING_STRINGS[tag]).map(([k]) => k)
      expect(keys, tag).toEqual([...enLeaves.keys()])
    }
  })

  it('translates every non-English string (no English fallback leaks) and keeps the same placeholders', () => {
    for (const { tag } of WEB_LOCALES) {
      if (tag === 'en') continue
      const untranslated: string[] = []
      for (const [key, value] of leaves(LANDING_STRINGS[tag])) {
        const source = enLeaves.get(key) ?? ''
        expect(value.trim().length, `${tag} ${key}`).toBeGreaterThan(0)
        if (value === source && !MAY_MATCH_EN.has(key) && !MAY_MATCH_EN.has(`${tag}:${key}`) && /[a-z]{3,}/i.test(source.replace(PLACEHOLDERS, ''))) untranslated.push(key)
        expect((value.match(PLACEHOLDERS) ?? []).sort(), `${tag} ${key} placeholders`).toEqual((source.match(PLACEHOLDERS) ?? []).sort())
      }
      expect(untranslated, tag).toEqual([])
    }
  })

  it('fills the brand name and never leaves a placeholder in built copy', () => {
    for (const { tag } of WEB_LOCALES) {
      const built = landingPageCopyFor(tag)
      for (const [key, value] of leaves(built)) {
        expect(value, `${tag} ${key}`).not.toMatch(/(?<!\$)\{(name|n)\}/)
      }
      expect(built.hero.eyebrow).toContain('Atlasmith')
      expect(built.connections.rows[0].tag.startsWith('EXTRACTED')).toBe(true)
      expect(built.connections.rows[0].codeLine).toBe("import { auth } from './auth'")
    }
  })

  it('has natural representative translations', () => {
    expect(landingPageCopyFor('fr').hero.titleEmphasis).toBe('et ce qui est risqué.')
    expect(landingPageCopyFor('fr').cta.viewer).toBe('Essayer la visionneuse')
    expect(landingPageCopyFor('es').stepsAway(1)).toBe('1 paso')
    expect(landingPageCopyFor('es').stepsAway(2)).toBe('2 pasos')
    expect(landingPageCopyFor('ja').closing.title).toBe('プロジェクトをマップで見てみませんか？')
    expect(landingPageCopyFor('ur').coverage.title).toBe('کچھ بھی چپکے سے نہیں چھوڑا جاتا۔')
  })
})

function router() {
  const stub = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:locale', name: 'localized-home', component: stub },
      { path: '/:locale/viewer', component: stub },
      { path: '/:locale/auth/:view?', component: stub },
      { path: '/:locale/w/:workspace/:rest(.*)*', component: stub }
    ]
  })
}

describe('landing page renders the route locale', () => {
  it('shows French copy on /fr and switches to Japanese when the locale changes', async () => {
    const r = router()
    await r.push('/fr')
    await r.isReady()
    const wrapper = mount(HomeView, { global: { plugins: [r, createPinia()] }, attachTo: document.body })
    expect(wrapper.get('h1').text()).toContain('Voyez comment votre code s\u2019articule')
    expect(wrapper.text()).toContain('Trois étapes, du dossier à la carte.')
    expect(wrapper.text()).not.toContain('Three steps from folder to map.')
    expect(document.title).toContain('Voyez comment')
    await r.push('/ja')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toContain('コードのつながりを見る')
    expect(document.title).toContain('コードのつながり')
    wrapper.unmount()
  })
})

describe('small auth and shell translations', () => {
  it('localizes the auth brand tagline and drawer close label in every locale', async () => {
    for (const { tag } of WEB_LOCALES) {
      const m = navigationMessages(tag)
      expect(m.brandTagline.length, tag).toBeGreaterThan(0)
      expect(m.closeMenu.length, tag).toBeGreaterThan(0)
      if (tag !== 'en') {
        expect(m.brandTagline, tag).not.toBe(navigationMessages('en').brandTagline)
        expect(m.closeMenu, tag).not.toBe(navigationMessages('en').closeMenu)
      }
    }
    const r = router()
    await r.push('/fr/auth/login')
    await r.isReady()
    const wrapper = mount(AuthShell, { global: { plugins: [r] } })
    expect(wrapper.get('.tagline').text()).toBe('Votre architecture, maîtrisée et vérifiée.')
  })
})

describe('RTL code direction and light navy band palette', () => {
  it('keeps code and command examples left-to-right on the Urdu landing, in exact order', async () => {
    const r = router()
    await r.push('/ur')
    await r.isReady()
    const wrapper = mount(HomeView, { global: { plugins: [r, createPinia()] }, attachTo: document.body })
    const codes = wrapper.findAll('.conn__row code')
    expect(codes.length).toBe(3)
    for (const code of codes) expect(code.attributes('dir')).toBe('ltr')
    expect(codes[0].text()).toContain("import { auth } from './auth'")
    const commands = wrapper.findAll('.sh__command')
    expect(commands.map(c => c.attributes('dir'))).toEqual(['ltr', 'ltr', 'ltr'])
    expect(commands.map(c => c.text())).toEqual(['git clone <atlasmith-repo-url>', 'docker compose up --build', 'http://localhost:5173'])
    wrapper.unmount()
  })

  it('scopes a dark-surface palette to the navy band in light theme and mirrors the hero fade in RTL', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync(`${process.cwd()}/src/styles/landing.css`, 'utf8')
    expect(css).toMatch(/\[data-theme='light'\] \.landing-page \.landing-band--navy \{\s*color-scheme: dark;\s*--gray-0: #0b0d10;[\s\S]*?--gray-10: #e6e8eb;/)
    expect(css).toMatch(/\[dir='rtl'\] \.landing-page \.landing-hero::after \{\s*background: linear-gradient\(270deg/)
    expect(css).toMatch(/\.landing-page \[dir='ltr'\] \{\s*unicode-bidi: isolate;\s*direction: ltr;/)
  })
})
