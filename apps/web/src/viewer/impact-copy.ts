/**
 * Plain-English copy and ids for the change-impact alert shown in the graph panel.
 * The host computes the dependents (engine walkFileImpact / impact_lite); this only presents them.
 */

export interface ViewerImpactDependent {
  path: string
  fileId: string
  depth: number
}

export interface ViewerImpactAlert {
  targetPath: string
  targetFileId: string
  dependents: ViewerImpactDependent[]
  truncated: boolean
  depthLimit: number
}

export interface ImpactCopy {
  impactNone: string
  impactOne: string
  impactMany: string
}

export function impactHeadline(
  alert: ViewerImpactAlert,
  messages: ImpactCopy,
  format: (template: string, values: Record<string, string | number>) => string
): string {
  const n = alert.dependents.length
  if (n === 0) return messages.impactNone
  if (n === 1) return messages.impactOne
  return format(messages.impactMany, { n })
}

/** The target file plus every listed dependent, for highlighting on the graph. */
export function impactNodeIds(alert: ViewerImpactAlert | null | undefined): string[] {
  if (!alert) return []
  const ids = [alert.targetFileId]
  for (const row of alert.dependents) {
    if (!ids.includes(row.fileId)) ids.push(row.fileId)
  }
  return ids
}

/** Basename for a compact chip; the full path stays on the tooltip. */
export function impactFileLabel(path: string): string {
  const trimmed = path.replace(/\\/g, '/').replace(/\/+$/, '')
  const slash = trimmed.lastIndexOf('/')
  return slash === -1 ? trimmed : trimmed.slice(slash + 1)
}
