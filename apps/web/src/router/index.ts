import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { getCurrentSession } from '../services/auth'
import {
  LOCALE_PREFERENCE_KEY,
  WEB_LOCALES,
  isSupportedWebLocale,
  readLocalePreference,
  resolvePreferredWebLocale,
  webLocaleDirection
} from '../services/locale'

const localePattern = WEB_LOCALES.map(locale => locale.tag).join('|')

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const localePath = `/:locale(${localePattern})`
  const appRouter = createRouter({
    history,
    routes: [
      {
        path: '/',
        name: 'home',
        component: () => import('../views/HomeView.vue')
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/auth/:view?',
        name: 'auth',
        component: () => import('../views/AuthView.vue'),
        meta: { guestOnly: true }
      },
      {
        path: localePath,
        name: 'localized-home',
        component: () => import('../views/HomeView.vue')
      },
      {
        path: `${localePath}/dashboard`,
        name: 'localized-dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: `${localePath}/auth/:view?`,
        name: 'localized-auth',
        component: () => import('../views/AuthView.vue'),
        meta: { guestOnly: true }
      }
    ]
  })

  appRouter.beforeEach((to) => {
    const routeLocale = typeof to.params.locale === 'string' ? to.params.locale : null
    if (!routeLocale) {
      const preferredLocale = resolvePreferredWebLocale(
        readLocalePreference(),
        navigator.languages
      )
      return {
        path: to.path === '/' ? `/${preferredLocale}` : `/${preferredLocale}${to.path}`,
        query: to.query,
        hash: to.hash,
        replace: true
      }
    }

    if (!isSupportedWebLocale(routeLocale)) return { path: '/en', replace: true }
    localStorage.setItem(LOCALE_PREFERENCE_KEY, routeLocale)

    const session = getCurrentSession()
    if (to.meta.requiresAuth && !session) {
      return { path: `/${routeLocale}/auth/login`, query: to.query, hash: to.hash }
    }

    if (session && (to.meta.guestOnly || to.name === 'localized-home')) {
      return { path: `/${routeLocale}/dashboard` }
    }

    return true
  })

  appRouter.afterEach((to) => {
    const routeLocale = typeof to.params.locale === 'string' ? to.params.locale : 'en'
    const locale = isSupportedWebLocale(routeLocale) ? routeLocale : 'en'
    document.documentElement.lang = locale
    document.documentElement.dir = webLocaleDirection(locale)
  })

  return appRouter
}

const router = createAppRouter()

export default router