const HANDOFF_KEY = 'structura-viewer-pending-graph-v1'

export interface StagedViewerGraph {
  label: string
  text: string
}

export function stageGraphForViewer(label: string, graphText: string): void {
  const payload: StagedViewerGraph = { label, text: graphText }
  sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload))
}

export function consumeStagedViewerGraph(): StagedViewerGraph | null {
  const raw = sessionStorage.getItem(HANDOFF_KEY)
  if (!raw) return null
  sessionStorage.removeItem(HANDOFF_KEY)
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as StagedViewerGraph).label === 'string' &&
      typeof (parsed as StagedViewerGraph).text === 'string'
    ) {
      return parsed as StagedViewerGraph
    }
  } catch {
    return null
  }
  return null
}

export function openViewerWithStagedGraph(viewerUrl: string): void {
  window.open(viewerUrl, '_blank', 'noopener,noreferrer')
}
