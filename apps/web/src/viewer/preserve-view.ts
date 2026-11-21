/**
 * Scan again / auto-refresh: keep the current file, selection, expanded groups, filters and zoom
 * when a host replaces the graph with a new scan of the same project.
 */
import { isLinearControlId } from './linear'
import type { FocusQuery, GraphIndex, ViewFilters, ViewState } from './overview'

export type GraphSelection = { kind: 'node' | 'edge'; id: string } | null

export type Viewport = { x: number; y: number; zoom: number }

export interface PreservedView {
  viewState: ViewState
  filters: ViewFilters
  selection: GraphSelection
  focus: FocusQuery | null
  viewport: Viewport | null
}

export interface RestoredView {
  viewState: ViewState
  filters: ViewFilters
  selection: GraphSelection
  focus: FocusQuery | null
  viewport: Viewport | null
}

export function restorePreservedView(preserved: PreservedView, indexed: GraphIndex, base: ViewState): RestoredView {
  const hasNode = (id: string) => indexed.nodesById.has(id) || isLinearControlId(id)
  const prev = preserved.viewState
  const nucleusId = prev.nucleusId && indexed.nodesById.has(prev.nucleusId) ? prev.nucleusId : base.nucleusId
  const viewState: ViewState = {
    ...base,
    layout: prev.layout ?? base.layout,
    nucleusId,
    expanded: prev.expanded.filter(hasNode),
    revealed: { ...prev.revealed },
    pinned: prev.pinned.filter(hasNode),
    maxRadialRing: prev.maxRadialRing ?? base.maxRadialRing,
    ringWalk: prev.ringWalk ?? base.ringWalk,
    fileSplit: prev.fileSplit ?? base.fileSplit
  }
  let selection: GraphSelection = null
  if (preserved.selection?.kind === 'node' && hasNode(preserved.selection.id)) selection = preserved.selection
  else if (preserved.selection?.kind === 'edge') selection = preserved.selection
  return {
    viewState,
    filters: preserved.filters,
    selection,
    focus: preserved.focus && hasNode(preserved.focus.nodeId) ? preserved.focus : null,
    viewport: preserved.viewport
  }
}
