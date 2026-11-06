import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { hostedAppEnabled } from '../hosted-app'
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

function localizedDashboardRedirect(
  pathSuffix: string,
  query: import('vue-router').LocationQueryRaw,
  hash: string
) {
  const preferredLocale = resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
  return {
    path: `/${preferredLocale}${pathSuffix}`,
    query,
    hash,
    replace: true
  }
}

export function createAppRouter(history: RouterHistory = createWebHistory(import.meta.env.BASE_URL)) {
  const localePath = `/:locale(${localePattern})`
  const dashboardView = () => import('../views/DashboardView.vue')
  const appRouter = createRouter({
    history,
    routes: [
      {
        path: '/',
        name: 'home',
        component: () => import('../views/HomeView.vue')
      },
      {
        path: '/viewer',
        name: 'viewer',
        component: () => import('../views/ViewerRouteView.vue')
      },
      {
        path: '/dashboard',
        redirect: to =>
          localizedDashboardRedirect('/w/pending', to.query, to.hash ?? '')
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
        path: `${localePath}/viewer`,
        name: 'localized-viewer',
        component: () => import('../views/ViewerRouteView.vue')
      },
      {
        path: `${localePath}/dashboard`,
        redirect: to => ({
          path: `/${String(to.params.locale)}/w/pending`,
          query: to.query,
          hash: to.hash,
          replace: true
        })
      },
      {
        path: `${localePath}/w/:workspace`,
        component: () => import('../views/dashboard/DashboardLayout.vue'),
        meta: { requiresAuth: true },
        children: [
          {
            path: '',
            name: 'workspace-projects',
            component: dashboardView,
            meta: { dashboardSection: 'projects' }
          },
          {
            path: 'new',
            name: 'open-project',
            component: dashboardView,
            meta: { dashboardSection: 'open-project' }
          },
          {
            path: 'scans',
            name: 'workspace-scans',
            component: dashboardView,
            meta: { dashboardSection: 'workspace-scans' }
          },
          {
            path: 'settings',
            name: 'workspace-settings',
            component: dashboardView,
            meta: { dashboardSection: 'settings' }
          },
          {
            path: 'projects/:projectId',
            name: 'workspace-project',
            redirect: to => ({
              name: 'project-graph',
              params: {
                locale: to.params.locale,
                workspace: to.params.workspace,
                projectId: to.params.projectId
              },
              query: to.query,
              hash: to.hash
            })
          },
          {
            path: 'projects/:projectId/scans',
            name: 'project-scans',
            component: dashboardView,
            meta: { dashboardSection: 'scans' }
          },
          {
            path: 'projects/:projectId/graph',
            name: 'project-graph',
            component: () => import('../views/dashboard/ScanGraphView.vue'),
            meta: { dashboardSection: 'project-graph' },
            props: route => ({
              workspaceId: String(route.params.workspace),
              projectId: String(route.params.projectId),
              scanId: null
            })
          },
          {
            path: 'projects/:projectId/scans/:scanId/:tab?',
            name: 'scan-report',
            component: dashboardView,
            meta: { dashboardSection: 'scan-report' }
          }
        ]
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

    if (!hostedAppEnabled && (to.meta.requiresAuth || to.meta.guestOnly)) {
      return { path: `/${routeLocale}`, replace: true }
    }

    const session = getCurrentSession()
    if (to.meta.requiresAuth && !session) {
      return { path: `/${routeLocale}/auth/login`, query: to.query, hash: to.hash }
    }

    if (hostedAppEnabled && session && (to.meta.guestOnly || to.name === 'localized-home')) {
      return { path: `/${routeLocale}/w/pending`, replace: true }
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
