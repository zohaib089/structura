import type { WebLocale } from '../services/locale'

export interface ViewerMessages {
  title: string
  samplePill: string
  sampleFooter: string
  skip: string
  filters: string
  inspector: string
  graphLabel: string
  emptyGraph: string
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
  expandContentsLabel: string
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
  detailsImportKind: string
  detailsTypeOnly: string
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
  entryLabel: string
  recentreLabel: string
  statusRadial: string
  statusPanZoom: string
  depsOutLabel: string
  depsInLabel: string
  depthLabel: string
  findingsLabel: string
  purposeLabel: string
  symbolsLabel: string
  importsLabel: string
  importersLabel: string
  contentsLabel: string
  noFindingsLabel: string
  nodeProvenanceLabel: string
  emptyFilters: string
  emptyBody: string
  copyCommand: string
  coachExpand: string
  coachFocus: string
  coachCoverage: string
  coachSkip: string
  coachNext: string
  budgetDetail: string
  budgetLimit: string
  focusChip: string
  focusEsc: string
  readingFile: string
  coverageSkippedNote: string
  driftFailing: string
  driftPassing: string
  searchClusters: string
  searchFiles: string
  searchSymbols: string
  chipCount: string
  graphOverviewHint: string
  panelSelectedHint: string
  graphGuideStep1: string
  graphGuideStep2: string
  graphGuideStep3: string
  filtersTooltip: string
  searchTooltip: string
  fitTooltip: string
  entryTooltip: string
  expandTooltip: string
  recentreTooltip: string
  focusTooltip: string
  summaryLoading: string
  summaryError: string
  summaryEmpty: string
  emptyImports: string
  emptyImporters: string
  emptySymbols: string
  emptyContents: string
  noIssuesStat: string
  findingsSectionLabel: string
  summaryRetry: string
  openDetailsLabel: string
  noFindingsNeedScan: string
  depthTooltip: string
  kindTagFolder: string
  kindTagFile: string
  symbolExportTag: string
}

const en: ViewerMessages = {
  title: 'Architecture viewer',
  samplePill: 'Sample data',
  sampleFooter: 'Showing bundled sample data, not your repository',
  skip: 'Skip to graph',
  filters: 'Filters',
  inspector: 'Inspector',
  graphLabel: 'Architecture graph. Click selects a node. Enter or double-click expands or collapses. Arrow keys move. Space selects. F focuses.',
  emptyGraph: 'This graph has no nodes.',
  expandedPath: 'Expanded path',
  search: 'Search files, symbols and layers',
  theme: 'Toggle theme',
  themeToLight: 'Switch to light theme',
  themeToDark: 'Switch to dark theme',
  openFile: 'Open another file',
  choose: 'Choose fileâ¦',
  sample: 'Try the sample graph',
  close: 'Close',
  emptyTitle: 'Open your architecture map.',
  emptyPrivate: 'Read in your browser. Never uploaded.',
  emptyDrop: 'Drag and drop, or',
  emptyNoFile: 'No file yet? Create one:',
  dropOverlay: 'Release to open',
  dropMultiple: 'Only one file at a time. Opened {file}.',
  loadingReading: 'Readingâ¦ {percent}%',
  loadingBuilding: 'Building overviewâ¦',
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
  expand: 'Show in graph',
  expandContentsLabel: 'Show inside on map',
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
  provExtracted: 'Found in source',
  provExtractedDesc: 'Seen directly in the code',
  provInferred: 'Guessed from context',
  provInferredDesc: 'Not proven in source',
  provUnresolved: 'Unresolved',
  provUnresolvedDesc: 'Target not found',
  provMixed: 'Mixed',
  provMixedDesc: 'Bundle contains more than one provenance',
  legendTitle: 'Legend',
  legendCount: '{n} in this graph',
  focusBar: 'Focus mode',
  focusEnter: 'Show only connections',
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
  detailsImportKind: 'Import kind',
  detailsTypeOnly: 'Type only',
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
  driftNoConfigBody: 'This graph does not include drift findings. A declared architecture file is not in the scan.',
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
  railToggle: 'Show or hide filters',
  inspectorToggle: 'Show or hide the details panel',
  entryLabel: 'Start from file',
  recentreLabel: 'Centre graph here',
  statusRadial: 'Radial · {rings} rings · nucleus {name}',
  statusPanZoom: '{nodes} nodes · pan/zoom',
  depsOutLabel: 'Uses',
  depsInLabel: 'Used by',
  depthLabel: 'Levels from centre',
  findingsLabel: 'Findings',
  purposeLabel: 'What this file does',
  symbolsLabel: 'Functions and classes',
  importsLabel: 'This file uses',
  importersLabel: 'Used by',
  contentsLabel: 'Files & folders inside',
  noFindingsLabel: 'No issues on this file.',
  noFindingsNeedScan: 'Issue list needs a scan report — open Graph from a report.',
  nodeProvenanceLabel: 'How we know',
  emptyFilters: 'Open a file to filter',
  emptyBody: 'Drop a {graphFile} here, or create one by running the command below in your repo. Nothing leaves your machine.',
  copyCommand: 'Copy',
  coachExpand: 'Click a node to open its details.',
  coachFocus: 'On a folder, use “Show inside on map” to reveal more files.',
  coachCoverage: 'Use “Centre graph here” to redraw the graph around that file.',
  coachSkip: 'Dismiss guide',
  coachNext: 'Next tip',
  graphOverviewHint:
    'You’re looking at how files depend on each other. Click a node for details; drag to pan and scroll to zoom.',
  panelSelectedHint: 'Details for your selection. Use the links below to jump to related files.',
  graphGuideStep1: 'Click any node to open its details.',
  graphGuideStep2: 'On a folder, choose “Show inside on map” to reveal more on the ring.',
  graphGuideStep3: 'Choose “Centre graph here” to redraw the map around that file.',
  filtersTooltip: 'Open filters to hide file types or link types',
  searchTooltip: 'Find a file or symbol by name',
  fitTooltip: 'Zoom so the whole graph fits on screen',
  entryTooltip: 'Choose which file sits in the middle of the graph',
  expandTooltip: 'Show this folder’s contents on the map ring',
  recentreTooltip: 'Redraw the graph with this file or folder in the middle',
  focusTooltip: 'Temporarily show only files connected to this one',
  summaryLoading: 'Loading what this file does…',
  summaryError: 'Couldn’t load the summary.',
  summaryRetry: 'Retry',
  summaryEmpty:
    'No summary for this file yet. Open a scan report graph, or check exported names below.',
  emptyImports: 'Nothing linked yet — try another file.',
  emptyImporters: 'Nothing uses this file yet — it may be an entry point.',
  emptySymbols: 'No functions or classes were found in this file.',
  emptyContents: 'This folder looks empty in the graph.',
  noIssuesStat: 'None',
  findingsSectionLabel: 'Findings',
  openDetailsLabel: 'Open details',
  depthTooltip: 'How many steps this item is from the centre of the map',
  kindTagFolder: 'Folder',
  kindTagFile: 'File',
  symbolExportTag: 'Export',
  budgetDetail: 'Detail reduced',
  budgetLimit: 'Limit reached: collapse or filter to see more',
  focusChip: 'Focused: {path} Â· depth {n}',
  focusEsc: 'Esc',
  readingFile: 'Reading {graphFile}, {size}',
  coverageSkippedNote: 'Skipped files are listed, never hidden',
  driftFailing: 'Failing Â· {n} violations',
  driftPassing: 'Passing',
  searchClusters: 'Clusters',
  searchFiles: 'Files',
  searchSymbols: 'Symbols',
  chipCount: '{n}'
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





