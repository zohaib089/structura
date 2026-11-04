import type { WebLocale } from './locale'
import { storageKey } from '../../../../packages/brand/src/brand'

const LAST_WORKSPACE_KEY = 'last-workspace-id'

export type DashboardShellSection =
  | 'projects'
  | 'open-project'
  | 'project'
  | 'scans'
  | 'scan-report'
  | 'workspace-scans'
  | 'settings'

export function rememberLastWorkspaceId(workspaceId: string) {
  if (!workspaceId.trim()) return
  localStorage.setItem(storageKey(LAST_WORKSPACE_KEY), workspaceId)
}

export function readLastWorkspaceId(): string | null {
  return localStorage.getItem(storageKey(LAST_WORKSPACE_KEY))
}

export function workspaceRootPath(locale: WebLocale, workspaceId: string) {
  return `/${locale}/w/${encodeURIComponent(workspaceId)}`
}

export function openProjectPath(locale: WebLocale, workspaceId: string) {
  return `${workspaceRootPath(locale, workspaceId)}/new`
}

export function projectPath(locale: WebLocale, workspaceId: string, projectId: string) {
  return `${workspaceRootPath(locale, workspaceId)}/projects/${encodeURIComponent(projectId)}`
}

export function projectScansPath(locale: WebLocale, workspaceId: string, projectId: string) {
  return `${projectPath(locale, workspaceId, projectId)}/scans`
}

export function scanReportPath(
  locale: WebLocale,
  workspaceId: string,
  projectId: string,
  scanId: string,
  tab?: string
) {
  const base = `${projectPath(locale, workspaceId, projectId)}/scans/${encodeURIComponent(scanId)}`
  return tab ? `${base}/${encodeURIComponent(tab)}` : base
}

export function workspaceScansPath(locale: WebLocale, workspaceId: string) {
  return `${workspaceRootPath(locale, workspaceId)}/scans`
}

export function workspaceSettingsPath(locale: WebLocale, workspaceId: string) {
  return `${workspaceRootPath(locale, workspaceId)}/settings`
}

export function resolveDashboardEntryPath(locale: WebLocale, workspaceIds: string[]): string {
  const remembered = readLastWorkspaceId()
  const workspaceId =
    (remembered && workspaceIds.includes(remembered) ? remembered : workspaceIds[0]) ?? ''
  if (!workspaceId) return workspaceRootPath(locale, 'pending')
  return workspaceRootPath(locale, workspaceId)
}
