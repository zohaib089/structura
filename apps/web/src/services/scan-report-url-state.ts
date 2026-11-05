import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { ReportSection, ReportSeverity } from '../api/scan-report-types'
import {
  ALL_FINDING_SECTIONS,
  ALL_REPORT_SEVERITIES,
  defaultReportFilters,
  type ReportViewFilters
} from './scan-report-filters'
import type { ReportTabId } from './scan-report-messages'
import { resolveGraphFocusQuery } from './graph-node-focus'

/** Tab order as shown in the UI. Summary is always first and is the default. */
export const REPORT_TAB_IDS: ReportTabId[] = [
  'summary',
  'findings',
  'violations',
  'security',
  'badPractices',
  'improvements',
  'removals',
  'architecture',
  'graph',
  'history'
]

export const DEFAULT_REPORT_TAB: ReportTabId = 'summary'

function isReportSeverity(value: string): value is ReportSeverity {
  return (ALL_REPORT_SEVERITIES as readonly string[]).includes(value)
}

function isReportSection(value: string): value is ReportSection {
  return (ALL_FINDING_SECTIONS as readonly string[]).includes(value)
}

function readQueryString(query: LocationQuery, key: string): string {
  const raw = query[key]
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0]
  return ''
}

function parseCsvQuery(query: LocationQuery, key: string): string[] {
  const value = readQueryString(query, key).trim()
  if (!value) return []
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
}

export function parseReportTabParam(tab: string | undefined): ReportTabId {
  if (tab && (REPORT_TAB_IDS as readonly string[]).includes(tab)) return tab as ReportTabId
  return DEFAULT_REPORT_TAB
}

export function reportTabPathSegment(tab: ReportTabId): string | undefined {
  return tab === DEFAULT_REPORT_TAB ? undefined : tab
}

export function parseReportFiltersFromQuery(query: LocationQuery): ReportViewFilters {
  const defaults = defaultReportFilters()
  const severityParts = parseCsvQuery(query, 'sev').filter(isReportSeverity)
  const sectionParts = parseCsvQuery(query, 'sec').filter(isReportSection)
  const pathQuery = readQueryString(query, 'path')

  return {
    severities: severityParts.length > 0 ? new Set(severityParts) : defaults.severities,
    sections: sectionParts.length > 0 ? new Set(sectionParts) : defaults.sections,
    pathQuery
  }
}

export function reportFiltersToQuery(filters: ReportViewFilters): LocationQueryRaw {
  const defaults = defaultReportFilters()
  const query: LocationQueryRaw = {}

  const severities = [...filters.severities].sort()
  const defaultSeverities = [...defaults.severities].sort()
  if (severities.join(',') !== defaultSeverities.join(',')) {
    query.sev = severities.join(',')
  }

  const sections = [...filters.sections].sort()
  const defaultSections = [...defaults.sections].sort()
  if (sections.join(',') !== defaultSections.join(',')) {
    query.sec = sections.join(',')
  }

  const path = filters.pathQuery.trim()
  if (path) query.path = path

  return query
}

export function parseReportNodeQuery(query: LocationQuery): string | null {
  return resolveGraphFocusQuery(query)
}

export function mergeReportLocationQuery(
  filters: ReportViewFilters,
  nodePath: string | null,
  existing: LocationQuery
): LocationQueryRaw {
  const next = reportFiltersToQuery(filters)
  const node = nodePath?.trim()
  if (node) next.node = node.replace(/^\/+/, '')
  else if (typeof existing.node === 'string') {
    // omit cleared node
  }
  return next
}
