import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import type { ReportSeverity } from '../api/scan-report-types'
import { scanReportPath } from '../services/dashboard-routes'
import type { WebLocale } from '../services/locale'
import { defaultReportFilters, type ReportViewFilters } from '../services/scan-report-filters'
import type { ReportTabId } from '../services/scan-report-messages'
import {
  mergeReportLocationQuery,
  parseReportFiltersFromQuery,
  parseReportNodeQuery,
  parseReportTabParam,
  reportFiltersToQuery,
  reportTabPathSegment
} from '../services/scan-report-url-state'

export interface ReportRouteIds {
  locale: WebLocale
  workspaceId: string
  projectId: string
  scanId: string
}

export interface ReportRouteState {
  activeTab: ComputedRef<ReportTabId>
  filters: Ref<ReportViewFilters>
  setTab: (tab: ReportTabId) => void
  setFilters: (filters: ReportViewFilters) => void
  tabHref: (tab: ReportTabId, filters?: ReportViewFilters, nodePath?: string | null) => RouteLocationRaw
  /** Findings list, optionally narrowed to one severity (used by Summary links). */
  findingsHref: (severity?: ReportSeverity) => RouteLocationRaw
  /** Graph tab, optionally focused on a file or folder. */
  graphHref: (path?: string) => RouteLocationRaw
}

/**
 * useReportRouteState - the URL is the source of truth for the active report tab and its filters,
 * so a reload (or a shared link) restores exactly what the person was looking at.
 *
 *   /…/scans/:scanId[/:tab]?sev=critical,high&sec=security&path=src/api
 *
 * Tab changes push a history entry; filter edits replace it so Back does not step through keystrokes.
 */
export function useReportRouteState(ids: () => ReportRouteIds): ReportRouteState {
  const route = useRoute()
  const router = useRouter()

  const activeTab = computed<ReportTabId>(() => {
    // A graph focus link (?node= / ?focus=) always lands on the Graph tab.
    if (parseReportNodeQuery(route.query)) return 'graph'
    const tab = typeof route.params.tab === 'string' ? route.params.tab : undefined
    return parseReportTabParam(tab)
  })

  const filters = ref<ReportViewFilters>(parseReportFiltersFromQuery(route.query))

  const serialise = (value: ReportViewFilters) => JSON.stringify(reportFiltersToQuery(value))

  watch(
    () => [route.query.sev, route.query.sec, route.query.path],
    () => {
      const fromRoute = parseReportFiltersFromQuery(route.query)
      if (serialise(fromRoute) !== serialise(filters.value)) filters.value = fromRoute
    }
  )

  function tabHref(
    tab: ReportTabId,
    withFilters: ReportViewFilters = filters.value,
    nodePath: string | null = null
  ): RouteLocationRaw {
    const { locale, workspaceId, projectId, scanId } = ids()
    return {
      path: scanReportPath(locale, workspaceId, projectId, scanId, reportTabPathSegment(tab)),
      query: mergeReportLocationQuery(withFilters, nodePath, route.query)
    }
  }

  function setTab(tab: ReportTabId) {
    if (tab === activeTab.value) return
    void router.push(tabHref(tab))
  }

  function setFilters(next: ReportViewFilters) {
    filters.value = next
    void router.replace(tabHref(activeTab.value, next, parseReportNodeQuery(route.query)))
  }

  function findingsHref(severity?: ReportSeverity): RouteLocationRaw {
    const next = defaultReportFilters()
    if (severity) next.severities = new Set([severity])
    return tabHref('findings', next)
  }

  function graphHref(path?: string): RouteLocationRaw {
    return tabHref('graph', filters.value, path ?? null)
  }

  return { activeTab, filters, setTab, setFilters, tabHref, findingsHref, graphHref }
}
