import type { WebLocale } from '../services/locale'

export interface ViewerMessages {
  title: string
  samplePill: string
  sampleFooter: string
  skip: string
  filters: string
  inspector: string
  graphLabel: string
  expandedPath: string
  search: string
  theme: string
  themeToLight: string
  themeToDark: string
  openFile: string
  choose: string
  sample: string
  close: string
  emptyTitle: string
  emptyPrivate: string
  emptyDrop: string
  emptyNoFile: string
  dropOverlay: string
  dropMultiple: string
  loadingReading: string
  loadingBuilding: string
  loadingSr: string
  loadingCancel: string
  errorNotJson: string
  errorSchema: string
  errorMore: string
  errorAnother: string
  errorCopy: string
  errorTooLarge: string
  versionTitle: string
  versionBody: string
  versionMissing: string
  budgetMeter: string
  budgetNear: string
  budgetFull: string
  budgetHidden: string
  budgetEdgesHeld: string
  moreNode: string
  moreNext: string
  expand: string
  collapse: string
  expandAll: string
  expandAllDisabled: string
  announceExpanded: string
  announceCollapsed: string
  announceSelected: string
  crumbRoot: string
  searchPlaceholder: string
  searchNone: string
  searchHint: string
  searchMore: string
  searchFooter: string
  filterProvenance: string
  filterLanguage: string
  filterNodeKind: string
  filterReset: string
  filterDriftOnly: string
  filterEmpty: string
  filterOpen: string
  provExtracted: string
  provExtractedDesc: string
  provInferred: string
  provInferredDesc: string
  provUnresolved: string
  provUnresolvedDesc: string
  provMixed: string
  provMixedDesc: string
  legendTitle: string
  legendCount: string
  focusBar: string
  focusEnter: string
  focusExit: string
  focusDependencies: string
  focusDependents: string
  focusBoth: string
  focusDepth: string
  focusConfirmedOnly: string
  focusConfirmed: string
  focusPossible: string
  focusUnresolvedLeave: string
  focusNone: string
  tabDetails: string
  tabCoverage: string
  tabDrift: string
  detailsEmpty: string
  detailsKind: string
  detailsPath: string
  detailsIncoming: string
  detailsOutgoing: string
  detailsProvenance: string
  detailsConfidence: string
  detailsReason: string
  detailsSpan: string
  detailsInternal: string
  detailsWeight: string
  coverageBar: string
  coverageBanner: string
  coverageFull: string
  coverageHonesty: string
  coverageNone: string
  coverageColLanguage: string
  coverageColParsed: string
  coverageColPartial: string
  coverageColFailed: string
  coverageColSkipped: string
  coverageExport: string
  driftNoConfigTitle: string
  driftNoConfigBody: string
  driftNotConfigured: string
  driftSnippetLabel: string
  driftCopy: string
  statusCoverage: string
  zoomIn: string
  zoomOut: string
  zoomFit: string
  shortcutsTitle: string
  shortcutsClose: string
  toastCopied: string
  toastLayout: string
  fileChip: string
  unknownKinds: string
  railToggle: string
  inspectorToggle: string
  emptyFilters: string
}

const en: ViewerMessages = {
  title: 'Architecture viewer',
  samplePill: 'Sample data',
  sampleFooter: 'Showing bundled sample data, not your repository',
  skip: 'Skip to graph',
  filters: 'Filters',
  inspector: 'Inspector',
  graphLabel: 'Architecture graph. Arrow keys move between nodes, Enter expands or collapses, Space selects, F focuses.',
  expandedPath: 'Expanded path',
  search: 'Search files, symbols and layers',
  theme: 'Toggle theme',
  themeToLight: 'Switch to light theme',
  themeToDark: 'Switch to dark theme',
  openFile: 'Open another file',
  choose: 'Choose file',
  sample: 'Open the sample graph',
  close: 'Close',
  emptyTitle: 'Open a {graphFile}',
  emptyPrivate: 'Read in your browser. Never uploaded.',
  emptyDrop: 'Drag and drop, or',
  emptyNoFile: 'No file yet? Create one:',
  dropOverlay: 'Drop {graphFile} to open',
  dropMultiple: 'Only one file at a time. Opened {file}.',
  loadingReading: 'Reading… {percent}%',
  loadingBuilding: 'Building overview…',
  loadingSr: 'Loading graph…',
  loadingCancel: 'Cancel',
  errorNotJson: 'This file is not valid JSON ({where})',
  errorSchema: 'Missing or invalid field {path}',
  errorMore: '…and {n} more',
  errorAnother: 'Choose another file',
  errorCopy: 'Copy error details',
  errorTooLarge: 'This file is {size} bytes. The limit is {limit} bytes.',
  versionTitle: 'Unsupported graph version {found}',
  versionBody: 'This viewer reads versions {supported}.',
  versionMissing: 'missing',
  budgetMeter: 'Showing {nodes} of {nodeBudget} nodes · {edges} of {edgeBudget} edges',
  budgetNear: 'Near the limit. Collapse something to expand more.',
  budgetFull: 'Limit reached. Collapse a group first.',
  budgetHidden: '{n} hidden by filters',
  budgetEdgesHeld: '{n} edges are above the limit and stay listed in the meter.',
  moreNode: '+{n} more',
  moreNext: 'Show next {n}',
  expand: 'Expand',
  collapse: 'Collapse',
  expandAll: 'Expand all',
  expandAllDisabled: 'Would show {n} nodes (limit {budget})',
  announceExpanded: '{name} expanded, {n} children',
  announceCollapsed: '{name} collapsed',
  announceSelected: '{name} selected, in {path}',
  crumbRoot: 'All',
  searchPlaceholder: 'Search files, symbols, layers…',
  searchNone: 'No matches for “{q}”',
  searchHint: 'Try a file name or layer id',
  searchMore: '{n} more matches. Keep typing.',
  searchFooter: '↑↓ navigate · Enter jump (expands parents) · Esc close',
  filterProvenance: 'Edge provenance',
  filterLanguage: 'Language',
  filterNodeKind: 'Node kind',
  filterReset: 'Reset filters',
  filterDriftOnly: 'Drift and unresolved only',
  filterEmpty: 'Nothing matches these filters.',
  filterOpen: 'Open a file to filter',
  provExtracted: 'Extracted',
  provExtractedDesc: 'Found in source',
  provInferred: 'Inferred',
  provInferredDesc: 'Heuristic, not proven',
  provUnresolved: 'Unresolved',
  provUnresolvedDesc: 'Target not found',
  provMixed: 'Mixed',
  provMixedDesc: 'Bundle contains more than one provenance',
  legendTitle: 'Legend',
  legendCount: '{n} in this graph',
  focusBar: 'Focus mode',
  focusEnter: 'Focus',
  focusExit: 'Exit focus',
  focusDependencies: 'Dependencies',
  focusDependents: 'Dependents',
  focusBoth: 'Both',
  focusDepth: 'Depth {n}',
  focusConfirmedOnly: 'Confirmed only',
  focusConfirmed: 'Confirmed: {n}',
  focusPossible: 'Possible: +{n}',
  focusUnresolvedLeave: '{n} unresolved edges leave this node. Impact may be incomplete.',
  focusNone: 'No dependents within depth {n}',
  tabDetails: 'Details',
  tabCoverage: 'Coverage',
  tabDrift: 'Drift',
  detailsEmpty: 'Select a node or edge to see details',
  detailsKind: 'Kind',
  detailsPath: 'Path',
  detailsIncoming: 'Incoming',
  detailsOutgoing: 'Outgoing',
  detailsProvenance: '{ext} extracted · {inf} inferred · {unres} unresolved',
  detailsConfidence: 'Confidence',
  detailsReason: 'Reason',
  detailsSpan: 'Span',
  detailsInternal: 'Internal edges: {n}',
  detailsWeight: 'Weight',
  coverageBar: '{parsed} parsed · {partial} partial · {skipped} skipped of {total} discovered',
  coverageBanner: '{n} files were not analysed. They are listed below. Edges involving them may be missing.',
  coverageFull: 'All {n} discovered files were parsed.',
  coverageHonesty: 'Coverage describes the scan, not the quality of your code.',
  coverageNone: 'No coverage data in this file. Re-scan with a newer {cli}.',
  coverageColLanguage: 'Language',
  coverageColParsed: 'Parsed',
  coverageColPartial: 'Partial',
  coverageColFailed: 'Failed',
  coverageColSkipped: 'Skipped',
  coverageExport: 'Export {n} rows',
  driftNoConfigTitle: 'No architecture file found',
  driftNoConfigBody: 'Drift checks need a {config} in the scanned repository. This graph does not include drift findings.',
  driftNotConfigured: 'Drift: not configured',
  driftSnippetLabel: 'Illustrative. Field names may differ; see the docs.',
  driftCopy: 'Copy snippet',
  statusCoverage: '{pct}% parsed',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomFit: 'Fit to view',
  shortcutsTitle: 'Keyboard shortcuts',
  shortcutsClose: 'Close shortcuts',
  toastCopied: 'Copied',
  toastLayout: 'Layout updated',
  fileChip: 'Opened file',
  unknownKinds: '{n} kinds this viewer does not know',
  railToggle: 'Filters',
  inspectorToggle: 'Inspector',
  emptyFilters: 'Open a file to filter'
}

export function viewerMessages(_locale: WebLocale): ViewerMessages {
  return en
}

export function formatMessage(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (match, key: string) => {
    const value = values[key]
    return value === undefined ? match : String(value)
  })
}
