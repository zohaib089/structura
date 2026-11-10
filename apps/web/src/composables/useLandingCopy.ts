import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { landingPageCopyFor, type LandingPageCopy } from '../services/landing-page-copy'
import { isSupportedWebLocale, type WebLocale } from '../services/locale'

/**
 * Landing copy for the current route locale. Returns a proxy that reads the current locale's copy on every access,
 * so templates and script code use `copy.x` as before and re-render when the locale changes.
 */
export function useLandingCopy(): LandingPageCopy {
  const route = useRoute()
  const locale = computed<WebLocale>(() => {
    const raw = route?.params.locale
    return typeof raw === 'string' && isSupportedWebLocale(raw) ? raw : 'en'
  })
  const current = computed(() => landingPageCopyFor(locale.value))
  return new Proxy({} as LandingPageCopy, {
    get: (_target, key) => (current.value as Record<string | symbol, unknown>)[key],
    has: (_target, key) => key in current.value,
    ownKeys: () => Reflect.ownKeys(current.value),
    getOwnPropertyDescriptor: (_target, key) => ({ ...Reflect.getOwnPropertyDescriptor(current.value, key), configurable: true })
  })
}
