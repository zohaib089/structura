import { describe, expect, it } from 'vitest'
import {
  matchWebLocale,
  localizedPath,
  resolvePreferredWebLocale,
  webLocaleDirection
} from '../../src/services/locale'

describe('locale preference resolution', () => {
  it('prefers a valid stored locale over browser languages', () => {
    expect(resolvePreferredWebLocale('fr', ['pt-BR', 'en-US'])).toBe('fr')
  })

  it('matches regional language tags and Simplified Chinese', () => {
    expect(matchWebLocale('pt-BR')).toBe('pt')
    expect(matchWebLocale('zh-CN')).toBe('zh-Hans')
    expect(matchWebLocale('zh-TW')).toBeNull()
  })

  it('uses browser preference order and falls back to English', () => {
    expect(resolvePreferredWebLocale('unsupported', ['it-IT', 'en-US'])).toBe('it')
    expect(resolvePreferredWebLocale(null, ['de-DE'])).toBe('en')
  })

  it('marks Urdu as right-to-left', () => {
    expect(webLocaleDirection('ur')).toBe('rtl')
    expect(webLocaleDirection('ja')).toBe('ltr')
  })

  it('builds localized paths without duplicating an existing locale prefix', () => {
    expect(localizedPath('fr', '/auth/login')).toBe('/fr/auth/login')
    expect(localizedPath('ur', '/en/dashboard')).toBe('/ur/dashboard')
    expect(localizedPath('ja', '/')).toBe('/ja')
  })
})
