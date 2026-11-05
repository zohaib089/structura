import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { hostedAppEnabled } from '../hosted-app'
import { LANDING_LINKS } from '../landing-links'
import { getCurrentSession } from '../services/auth'
import {
  isSupportedWebLocale,
  localizedPath,
  readLocalePreference,
  resolvePreferredWebLocale
} from '../services/locale'
import { landingPageCopy as copy } from '../services/landing-page-copy'

/**
 * Resolved landing link targets for the current locale (see landing-links.ts for the config).
 * `app` is the product action: "Scan a project" for visitors, "Go to your projects" when signed in
 * (existing-screens-usability.md §2 #6). It is null when the hosted app is switched off.
 */
export function useLandingLinks() {
  const route = useRoute()
  const locale = computed(() => {
    const routeLocale = route.params.locale
    if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
    return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
  })
  const signedIn = computed(() => Boolean(route.fullPath) && getCurrentSession() !== null)
  const app = computed(() => {
    if (!hostedAppEnabled) return null
    return signedIn.value
      ? { to: localizedPath(locale.value, LANDING_LINKS.projectsPath), label: copy.cta.projects }
      : { to: localizedPath(locale.value, LANDING_LINKS.scanPath), label: copy.cta.scan }
  })
  return {
    locale,
    signedIn,
    app,
    home: computed(() => localizedPath(locale.value, '/')),
    viewer: computed(() => localizedPath(locale.value, LANDING_LINKS.viewerPath)),
    docs: LANDING_LINKS.docsUrl,
    selfHostDocs: LANDING_LINKS.selfHostDocsUrl,
    repo: LANDING_LINKS.repoUrl
  }
}
