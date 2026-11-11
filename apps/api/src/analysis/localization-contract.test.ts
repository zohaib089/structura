import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LOCALIZED_CONTENT_SURFACES,
  PRODUCT_LOCALES,
  localeDirection,
  resolveProductLocale
} from './localization-contract.js'

test('defines requested initial locales and all user-facing content surfaces', () => {
  assert.deepEqual(PRODUCT_LOCALES.map(locale => locale.tag), [
    'en', 'pt', 'it', 'fr', 'nl', 'es', 'ja', 'zh-Hans', 'hi', 'ur'
  ])
  assert.deepEqual(LOCALIZED_CONTENT_SURFACES, [
    'web-ui',
    'authentication-emails',
    'product-emails',
    'reports',
    'recommendations',
    'errors-and-notifications',
    'repository-prose'
  ])
  assert.equal(localeDirection('ur'), 'rtl')
  assert.equal(localeDirection('zh-Hans'), 'ltr')
})

test('resolves regional requests to an available language and then English fallback', () => {
  assert.equal(resolveProductLocale('pt-BR', ['en', 'pt']), 'pt')
  assert.equal(resolveProductLocale('zh-CN', ['en', 'zh-Hans']), 'zh-Hans')
  assert.equal(resolveProductLocale('fr-CA', ['en', 'fr']), 'fr')
  assert.equal(resolveProductLocale('hi-IN', ['en']), 'en')
})

test('rejects invalid tags and unavailable fallbacks rather than silently selecting a locale', () => {
  assert.throws(() => resolveProductLocale('not a locale', ['en']))
  assert.throws(() => resolveProductLocale('ur', ['pt']))
  assert.throws(() => resolveProductLocale('en', []))
})
