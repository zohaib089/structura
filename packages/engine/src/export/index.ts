import type { Graph } from '../graph/types.js'
import { buildExportView } from './model.js'
import { graphToLikeC4 } from './likec4.js'
import { graphToMermaid } from './mermaid.js'
import { graphToObsidian, type ObsidianNote } from './obsidian.js'
import { graphToStructurizr } from './structurizr.js'
import { graphToSvg } from './svg.js'

export const EXPORT_FORMATS = ['mermaid', 'structurizr', 'likec4', 'obsidian', 'svg'] as const
export type ExportFormat = typeof EXPORT_FORMATS[number]

export class ExportFormatError extends Error {
  readonly exitCode = 2
  constructor(format: string) {
    super(`unsupported export format "${format}" (expected: ${EXPORT_FORMATS.join(', ')})`)
    this.name = 'ExportFormatError'
  }
}

export type ExportResult =
  | { format: Exclude<ExportFormat, 'obsidian'>; text: string }
  | { format: 'obsidian'; notes: ObsidianNote[] }

export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value)
}

export function exportGraph(graph: Graph, format: 'obsidian'): { format: 'obsidian'; notes: ObsidianNote[] }
export function exportGraph(
  graph: Graph,
  format: Exclude<ExportFormat, 'obsidian'>
): { format: Exclude<ExportFormat, 'obsidian'>; text: string }
export function exportGraph(graph: Graph, format: ExportFormat): ExportResult {
  const view = buildExportView(graph)
  switch (format) {
    case 'mermaid':
      return { format, text: graphToMermaid(view) }
    case 'structurizr':
      return { format, text: graphToStructurizr(view) }
    case 'likec4':
      return { format, text: graphToLikeC4(view) }
    case 'svg':
      return { format, text: graphToSvg(view) }
    case 'obsidian':
      return { format: 'obsidian', notes: graphToObsidian(graph) }
    default:
      throw new ExportFormatError(format)
  }
}

export { buildExportView, EXTERNAL_MODULE, ROOT_MODULE, UNASSIGNED_MODULE } from './model.js'
export type { ExportFileEdge, ExportModule, ExportModuleEdge, ExportView } from './model.js'
export type { ObsidianNote } from './obsidian.js'
