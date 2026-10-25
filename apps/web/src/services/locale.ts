export const WEB_LOCALES = [
  { tag: 'en', nativeName: 'English', direction: 'ltr' },
  { tag: 'pt', nativeName: 'Português', direction: 'ltr' },
  { tag: 'it', nativeName: 'Italiano', direction: 'ltr' },
  { tag: 'fr', nativeName: 'Français', direction: 'ltr' },
  { tag: 'nl', nativeName: 'Nederlands', direction: 'ltr' },
  { tag: 'es', nativeName: 'Español', direction: 'ltr' },
  { tag: 'ja', nativeName: '日本語', direction: 'ltr' },
  { tag: 'zh-Hans', nativeName: '简体中文', direction: 'ltr' },
  { tag: 'hi', nativeName: 'हिन्दी', direction: 'ltr' },
  { tag: 'ur', nativeName: 'اردو', direction: 'rtl' }
] as const

export type WebLocale = typeof WEB_LOCALES[number]['tag']

export const LOCALE_PREFERENCE_KEY = 'structura-locale'

const localeTags = new Set<string>(WEB_LOCALES.map(locale => locale.tag))

function isWebLocale(value: string): value is WebLocale {
  return localeTags.has(value)
}

export function isSupportedWebLocale(value: string): value is WebLocale {
  return isWebLocale(value)
}

export function localizedPath(locale: WebLocale, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const [firstSegment, ...remainingSegments] = normalizedPath.slice(1).split('/')
  const pathSegments = isWebLocale(firstSegment)
    ? remainingSegments
    : [firstSegment, ...remainingSegments]
  const pathWithoutLocale = pathSegments.join('/')

  return pathWithoutLocale ? `/${locale}/${pathWithoutLocale}` : `/${locale}`
}

export function matchWebLocale(requestedTag: string): WebLocale | null {
  let canonicalTag: string
  try {
    const canonical = Intl.getCanonicalLocales(requestedTag)[0]
    if (!canonical) return null
    canonicalTag = canonical
  } catch {
    return null
  }

  const candidates = [
    canonicalTag,
    canonicalTag === 'zh-CN' || canonicalTag === 'zh-SG' ? 'zh-Hans' : '',
    canonicalTag.split('-')[0]
  ]

  return candidates.find(isWebLocale) ?? null
}

export function resolvePreferredWebLocale(
  storedLocale: string | null,
  languagePreferences: readonly string[]
): WebLocale {
  if (storedLocale && isWebLocale(storedLocale)) return storedLocale

  for (const language of languagePreferences) {
    const locale = matchWebLocale(language)
    if (locale) return locale
  }

  return 'en'
}

export function webLocaleDirection(locale: WebLocale): 'ltr' | 'rtl' {
  const item = WEB_LOCALES.find(localeDefinition => localeDefinition.tag === locale)
  if (!item) throw new Error(`Unsupported web locale: ${locale}`)
  return item.direction
}
