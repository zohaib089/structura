import type { WebLocale } from './locale'

export interface DashboardGraphMessages {
  panelEyebrow: string
  panelTitle: string
  panelDescription: string
  openViewer: string
  dropZoneLabel: string
  dropHint: string
  chooseFile: string
  loadSample: string
  loadingGraph: string
  emptyGraph: string
  loadedGraph: string
  sampleLabel: string
  metricFiles: string
  metricModules: string
  metricEdges: string
  metricExtracted: string
  metricInferred: string
  topFanIn: string
  topFanOut: string
  noModuleRanks: string
  languagesTitle: string
  noLanguages: string
  unknownLanguage: string
  entryPointsTitle: string
  parseInvalidJson: string
  parseTooLarge: string
  parseUnsupportedVersion: string
  parseInvalidGraph: string
  languageCounts: (parsed: number, partial: number, failed: number, skipped: number) => string
}

const en: DashboardGraphMessages = {
  panelEyebrow: 'Architecture map',
  panelTitle: 'Graph insights',
  panelDescription: 'Load a graph.json from your scan to review structure before opening the viewer.',
  openViewer: 'Open viewer',
  dropZoneLabel: 'Load graph.json by dropping a file or choosing one from disk',
  dropHint: 'Drop graph.json here or choose a file.',
  chooseFile: 'Choose graph.json',
  loadSample: 'Load bundled sample',
  loadingGraph: 'Loading graph…',
  emptyGraph: 'No graph loaded yet.',
  loadedGraph: 'Loaded graph:',
  sampleLabel: 'Bundled sample graph',
  metricFiles: 'Files',
  metricModules: 'Modules',
  metricEdges: 'Dependency edges',
  metricExtracted: 'Extracted edges',
  metricInferred: 'Inferred edges',
  topFanIn: 'Top fan-in modules',
  topFanOut: 'Top fan-out modules',
  noModuleRanks: 'No cross-module dependency edges to rank.',
  languagesTitle: 'Languages',
  noLanguages: 'No language coverage rows in this graph.',
  unknownLanguage: 'Unknown',
  entryPointsTitle: 'Entry points',
  parseInvalidJson: 'Could not parse JSON.',
  parseTooLarge: 'Graph file is too large.',
  parseUnsupportedVersion: 'Unsupported graph schema version.',
  parseInvalidGraph: 'Graph JSON failed validation.',
  languageCounts(parsed, partial, failed, skipped) {
    return `${parsed} parsed · ${partial} partial · ${failed} failed · ${skipped} skipped`
  }
}

export function dashboardGraphMessages(locale: WebLocale): DashboardGraphMessages {
  void locale
  return en
}
