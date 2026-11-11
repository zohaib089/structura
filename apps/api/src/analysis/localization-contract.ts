export const PRODUCT_LOCALES = [
  { tag: 'en', englishName: 'English', nativeName: 'English', direction: 'ltr' },
  { tag: 'pt', englishName: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { tag: 'it', englishName: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  { tag: 'fr', englishName: 'French', nativeName: 'Français', direction: 'ltr' },
  { tag: 'nl', englishName: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
  { tag: 'es', englishName: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { tag: 'ja', englishName: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { tag: 'zh-Hans', englishName: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr' },
  { tag: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  { tag: 'ur', englishName: 'Urdu', nativeName: 'اردو', direction: 'rtl' }
] as const

export type ProductLocale = typeof PRODUCT_LOCALES[number]['tag']
export type TextDirection = typeof PRODUCT_LOCALES[number]['direction']

export const LOCALIZED_CONTENT_SURFACES = [
  'web-ui',
  'authentication-emails',
  'product-emails',
  'reports',
  'recommendations',
  'errors-and-notifications',
  'repository-prose'
] as const

export type LocalizedContentSurface = typeof LOCALIZED_CONTENT_SURFACES[number]
export type TranslationReviewStatus = 'missing' | 'draft' | 'reviewed' | 'released'

export interface LocaleCoverage {
  locale: ProductLocale
  surface: LocalizedContentSurface
  status: TranslationReviewStatus
  reviewedAt: string | null
}

const localeTags = new Set<string>(PRODUCT_LOCALES.map(locale => locale.tag))

function isProductLocale(tag: string): tag is ProductLocale {
  return localeTags.has(tag)
}

function canonicalLocale(tag: string): string {
  const [canonical] = Intl.getCanonicalLocales(tag)
  if (!canonical) throw new Error(`Invalid BCP 47 language tag: ${tag}`)
  return canonical
}

export function resolveProductLocale(
  requestedTag: string,
  availableLocales: readonly ProductLocale[]
): ProductLocale {
  if (availableLocales.length === 0) {
    throw new Error('At least one available product locale is required.')
  }

  const canonical = canonicalLocale(requestedTag)
  const candidates = [
    canonical,
    canonical === 'zh-CN' || canonical === 'zh-SG' ? 'zh-Hans' : '',
    canonical.split('-')[0],
    'en'
  ]

  for (const candidate of candidates) {
    if (isProductLocale(candidate) && availableLocales.includes(candidate)) {
      return candidate
    }
  }

  throw new Error(`No supported fallback locale is available for ${requestedTag}.`)
}

export function localeDirection(localeTag: ProductLocale): TextDirection {
  const locale = PRODUCT_LOCALES.find(item => item.tag === localeTag)
  if (!locale) throw new Error(`Unsupported product locale: ${localeTag}`)
  return locale.direction
}
