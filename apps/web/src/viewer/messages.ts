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
  budgetCapped: string
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
  focusOptions: string
  focusDirection: string
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
  /** Row label for links that start and end inside the selected folder / group. */
  detailsInternal: string
  detailsInternalNone: string
  detailsInternalOne: string
  /** "{n} links between files inside" */
  detailsInternalMany: string
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
  backLabel: string
  layoutLabel: string
  layoutRadial: string
  layoutLinear: string
  linearGroupFiles: string
  statusLinear: string
  ringOne: string
  ringMany: string
  backTooltip: string
  announceBack: string
  shortcutsTitle: string
  shortcutsClose: string
  toastCopied: string
  toastLayout: string
  fileChip: string
  unknownKinds: string
  railToggle: string
  inspectorToggle: string
  panelCollapse: string
  panelExpand: string
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
  /** Toolbar toggle: reveal non-tree cross-links (count is substituted). */
  showAllConnections: string
  hideExtraConnections: string
  /** Small caps tag under the nucleus label (landing parity). */
  entryPointTag: string
  thisFileTag: string
  repositoryTag: string
  usesCaption: string
  usedByCaption: string
  searchShort: string
  insideOpenCaption: string
  insideCloseCaption: string
  coachOpenLabel: string
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
  symbolExportTooltip: string
  /** One-line hint under the symbols heading; the open variant is used where files can be opened (editor). */
  symbolsHint: string
  symbolsHintOpen: string
  /** "line {line}" next to each symbol. */
  symbolLine: string
  /** "Show all {count}" under a long symbol list. */
  showAllSymbols: string
  /** Tooltip / accessible name for a symbol row that opens the file: "Open {name} at line {line}". */
  symbolOpenTooltip: string
  /** Singular kind tag on each row. */
  symbolKindLabels: Record<'function' | 'class' | 'interface' | 'type' | 'enum' | 'namespace' | 'variable' | 'default' | 'other', string>
  /** Plural kind names for the counts line: "{count} {label}". */
  symbolKindCountLabels: Record<'function' | 'class' | 'interface' | 'type' | 'enum' | 'namespace' | 'variable' | 'default' | 'other', { one: string; other: string }>
  /** File insights (graph.json 1.1). */
  functionsLabel: string
  functionsHint: string
  paramsNone: string
  paramsOne: string
  paramsMany: string
  callsLabel: string
  calledByLabel: string
  emptyCalls: string
  emptyCalledBy: string
  callLikely: string
  callSameFile: string
  callTimes: string
  stateLabel: string
  stateHint: string
  stateLocalLabel: string
  stateModuleLabel: string
  stateGlobalLabel: string
  stateMutable: string
  stateFixed: string
  stateEmpty: string
  stateKindLabels: Record<'binding' | 'ref' | 'reactive' | 'computed' | 'prop' | 'store' | 'provide' | 'inject', string>
  openCallTooltip: string
  methodOf: string
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
  choose: 'Choose file…',
  sample: 'Try the sample graph',
  close: 'Close',
  emptyTitle: 'Open your architecture map.',
  emptyPrivate: 'Read in your browser. Never uploaded.',
  emptyDrop: 'Drag and drop, or',
  emptyNoFile: 'No file yet? Create one:',
  dropOverlay: 'Release to open',
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
  budgetMeter: '{nodes} on the map · {edges} links',
  budgetCapped: 'Showing {nodeBudget} (limit reached). Collapse a group to see more.',
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
  searchPlaceholder: 'Search files and symbols',
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
  provExtracted: 'Found in the code',
  provExtractedDesc: 'Seen directly in the code',
  provInferred: 'Likely',
  provInferredDesc: 'Not proven in source',
  provUnresolved: "Couldn't confirm",
  provUnresolvedDesc: 'Target not found',
  provMixed: 'Mixed',
  provMixedDesc: 'Bundle contains more than one provenance',
  legendTitle: 'Legend',
  legendCount: '{n} in this graph',
  focusBar: 'Focus mode',
  focusEnter: 'Show only connections',
  focusExit: 'Exit focus',
  focusOptions: 'Options',
  focusDirection: 'Show',
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
  detailsInternal: 'Links inside',
  detailsInternalNone: 'None',
  detailsInternalOne: '1 link between files inside',
  detailsInternalMany: '{n} links between files inside',
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
  backLabel: 'Back',
  layoutLabel: 'Layout',
  layoutRadial: 'Radial',
  layoutLinear: 'Linear',
  linearGroupFiles: '{n} files',
  statusLinear: 'Linear · used by on the left, uses on the right · centre {name}',
  backTooltip: 'Back to the previous graph view',
  announceBack: 'Back to the previous graph view',
  shortcutsTitle: 'Keyboard shortcuts',
  shortcutsClose: 'Close shortcuts',
  toastCopied: 'Copied',
  toastLayout: 'Layout updated',
  fileChip: 'Opened file',
  unknownKinds: '{n} kinds this viewer does not know',
  railToggle: 'Show or hide filters',
  inspectorToggle: 'Show or hide the details panel',
  panelCollapse: 'Collapse the panel',
  panelExpand: 'Expand the panel',
  entryLabel: 'Start from file',
  recentreLabel: 'Centre graph here',
  statusRadial: 'Radial · {rings} · {name}',
  ringOne: '1 ring',
  ringMany: '{n} rings',
  statusPanZoom: '{nodes} nodes · pan/zoom',
  depsOutLabel: 'Uses',
  depsInLabel: 'Used by',
  depthLabel: 'Levels from centre',
  findingsLabel: 'Findings',
  purposeLabel: 'What this file does',
  symbolsLabel: 'Defined in this file',
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
  showAllConnections: 'Show all connections ({n})',
  hideExtraConnections: 'Hide extra connections ({n})',
  entryPointTag: 'ENTRY POINT',
  thisFileTag: 'This file',
  repositoryTag: 'Repository',
  usesCaption: 'uses',
  usedByCaption: 'used by',
  searchShort: 'Search',
  insideOpenCaption: '{n} inside',
  insideCloseCaption: 'Hide inside',
  coachOpenLabel: 'Tips',
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
  emptySymbols: 'We found no functions, classes or values defined in this file.',
  emptyContents: 'This folder looks empty in the graph.',
  noIssuesStat: 'None',
  findingsSectionLabel: 'Findings',
  openDetailsLabel: 'Open details',
  depthTooltip: 'How many steps this item is from the centre of the map',
  kindTagFolder: 'Folder',
  kindTagFile: 'File',
  symbolExportTag: 'Exported',
  symbolExportTooltip: 'Other files can use this',
  symbolsHint: 'The functions, classes and values this file defines, in the order they appear. Line numbers show where each starts.',
  symbolsHintOpen: 'The functions, classes and values this file defines, in the order they appear. Click one to open the file at that line.',
  symbolLine: 'line {line}',
  showAllSymbols: 'Show all {count}',
  symbolOpenTooltip: 'Open {name} at line {line}',
  symbolKindLabels: {
    function: 'Function',
    class: 'Class',
    interface: 'Interface',
    type: 'Type',
    enum: 'Enum',
    namespace: 'Namespace',
    variable: 'Variable',
    default: 'Default export',
    other: 'Other'
  },
  symbolKindCountLabels: {
    function: { one: 'function', other: 'functions' },
    class: { one: 'class', other: 'classes' },
    interface: { one: 'interface', other: 'interfaces' },
    type: { one: 'type', other: 'types' },
    enum: { one: 'enum', other: 'enums' },
    namespace: { one: 'namespace', other: 'namespaces' },
    variable: { one: 'variable', other: 'variables' },
    default: { one: 'default export', other: 'default exports' },
    other: { one: 'other', other: 'other' }
  },
  budgetDetail: 'Detail reduced',
  budgetLimit: 'Limit reached: collapse or filter to see more',
  focusChip: 'Focused: {path} · depth {n}',
  focusEsc: 'Esc',
  readingFile: 'Reading {graphFile}, {size}',
  coverageSkippedNote: 'Skipped files are listed, never hidden',
  driftFailing: 'Failing · {n} violations',
  driftPassing: 'Passing',
  searchClusters: 'Clusters',
  searchFiles: 'Files',
  searchSymbols: 'Symbols',
  chipCount: '{n}',
  functionsLabel: 'Functions in this file',
  functionsHint: 'What this file does, one function at a time. Click a name to open that line.',
  paramsNone: 'No parameters',
  paramsOne: 'Takes 1 parameter',
  paramsMany: 'Takes {n} parameters',
  callsLabel: 'Calls',
  calledByLabel: 'Called by',
  emptyCalls: 'Does not call other functions we know about.',
  emptyCalledBy: 'Nothing we know about calls this yet.',
  callLikely: 'likely',
  callSameFile: 'same file',
  callTimes: '{n}×',
  stateLabel: 'State this file keeps',
  stateHint: 'Values the code remembers. "Mutable" means they can change; "fixed" means the binding stays the same.',
  stateLocalLabel: 'On each object (or class)',
  stateModuleLabel: 'Shared by this file',
  stateGlobalLabel: 'Shared by the whole program',
  stateMutable: 'can change',
  stateFixed: 'fixed',
  stateEmpty: 'No remembered values in this file.',
  stateKindLabels: {
    binding: 'ordinary value',
    ref: 'reactive value (ref)',
    reactive: 'reactive object',
    computed: 'derived value',
    prop: 'input from a parent',
    store: 'shared store',
    provide: 'shared down to children',
    inject: 'received from a parent'
  },
  openCallTooltip: 'Open {name} at line {line}',
  methodOf: 'on {parent}'

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





