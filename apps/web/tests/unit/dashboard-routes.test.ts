import { describe, expect, it } from 'vitest'
import {
  openProjectPath,
  projectScansPath,
  readLastWorkspaceId,
  rememberLastWorkspaceId,
  resolveDashboardEntryPath,
  scanGraphPath,
  scanReportPath,
  workspaceRootPath
} from '../../src/services/dashboard-routes'

describe('dashboard routes', () => {
  it('builds localized workspace paths', () => {
    expect(workspaceRootPath('en', 'ws-1')).toBe('/en/w/ws-1')
    expect(openProjectPath('pt', 'ws-1')).toBe('/pt/w/ws-1/new')
    expect(projectScansPath('en', 'ws-1', 'proj-1')).toBe('/en/w/ws-1/projects/proj-1/scans')
    expect(scanReportPath('en', 'ws-1', 'proj-1', 'scan-9', 'violations')).toBe(
      '/en/w/ws-1/projects/proj-1/scans/scan-9/violations'
    )
    expect(scanGraphPath('en', 'ws-1', 'proj-1', 'scan-9')).toBe(
      '/en/w/ws-1/projects/proj-1/scans/scan-9/graph'
    )
    expect(scanGraphPath('en', 'ws-1', 'proj-1', 'scan-9', 'src/app.ts')).toBe(
      '/en/w/ws-1/projects/proj-1/scans/scan-9/graph?node=src%2Fapp.ts'
    )
  })

  it('remembers and resolves the last workspace for dashboard entry', () => {
    localStorage.clear()
    rememberLastWorkspaceId('ws-remembered')
    expect(readLastWorkspaceId()).toBe('ws-remembered')
    expect(resolveDashboardEntryPath('en', ['ws-other', 'ws-remembered'])).toBe('/en/w/ws-remembered')
    expect(resolveDashboardEntryPath('en', ['ws-only'])).toBe('/en/w/ws-only')
    expect(resolveDashboardEntryPath('en', [])).toBe('/en/w/pending')
  })
})
