/**
 * Render quality factor details from structured graph.json fields
 * (category, penalty) plus the engine's closed English label patterns when
 * they carry counts. Falls back to the engine's English `label`.
 */
import type { QualityBreakdownItem, QualityCategory, QualityScore } from './graph-types'
import { andJoin, qualityCategoryTitle } from './quality-score'

export interface QualityBreakdownMessages {
  qualityCategoryTitle: (category: QualityCategory) => string
  qualityLabelArchitectureNone: string
  qualityLabelCyclesNone: string
  qualityLabelCycles: (count: number) => string
  qualityLabelHotspotsNone: string
  qualityLabelHotspots: (count: number) => string
  qualityLabelHotspotsWithMax: (count: number, maxCount: number) => string
  qualityLabelImportsNone: string
  qualityLabelImportsUnresolved: (percent: number) => string
  qualityLabelImportsExternal: (percent: number) => string
  qualityLabelSizeNone: string
  qualityLabelSizeFiles: (count: number) => string
  qualityLabelSizeFunctions: (count: number) => string
  qualityLabelForbiddenDeps: (count: number) => string
  qualityLabelUndeclaredImports: (count: number) => string
  qualityListAnd: (parts: string[]) => string
  qualitySmallPenalty: (categoryTitle: string) => string
}

const CLEAN_QUALITY_LABELS = new Set([
  'No architecture rule breaks',
  'No import cycles',
  'No highly connected hotspots',
  'Imports resolve cleanly',
  'No unusually large files or functions'
])

const PLURAL_NOUN = (noun: string) => `${noun}s`

function parsePlural(text: string, noun: string): number | null {
  if (text === `1 ${noun}`) return 1
  const match = text.match(new RegExp(`^(\\d+) ${PLURAL_NOUN(noun)}$`))
  return match ? Number(match[1]) : null
}

function parseAndJoin(text: string): string[] | null {
  if (text.includes(', and ')) {
    const [head, last] = text.split(', and ')
    if (!last || head === undefined) return null
    return [...head.split(', ').filter(Boolean), last]
  }
  if (text.includes(' and ')) {
    const parts = text.split(' and ')
    return parts.length === 2 ? parts : null
  }
  return [text]
}

/** Pull counts out of the engine's fixed English label patterns. */
export function parseQualityBreakdownLabel(item: QualityBreakdownItem): {
  kind: string
  values: Record<string, number>
} | null {
  const label = item.label.trim()
  if (item.category === 'architecture') {
    if (label === 'No architecture rule breaks') return { kind: 'architecture-none', values: {} }
    const parts = parseAndJoin(label)
    if (!parts) return null
    const values: Record<string, number> = {}
    for (const part of parts) {
      const forbidden = parsePlural(part, 'forbidden dependency')
      const undeclared = parsePlural(part, 'undeclared import')
      if (forbidden !== null) values.forbidden = forbidden
      else if (undeclared !== null) values.undeclared = undeclared
      else return null
    }
    if (values.forbidden === undefined && values.undeclared === undefined) return null
    return { kind: 'architecture', values }
  }
  if (item.category === 'cycles') {
    if (label === 'No import cycles') return { kind: 'cycles-none', values: {} }
    const count = parsePlural(label, 'import cycle')
    return count === null ? null : { kind: 'cycles', values: { count } }
  }
  if (item.category === 'hotspots') {
    if (label === 'No highly connected hotspots') return { kind: 'hotspots-none', values: {} }
    const withMax = label.match(
      /^(\d+) files? (?:is a|are) heavy hotspots?(?:, including (\d+) files? at the maximum score)?$/
    )
    if (!withMax) return null
    const count = Number(withMax[1])
    const maxCount = withMax[2] ? Number(withMax[2]) : 0
    return { kind: maxCount > 0 ? 'hotspots-max' : 'hotspots', values: { count, maxCount } }
  }
  if (item.category === 'imports') {
    if (label === 'Imports resolve cleanly') return { kind: 'imports-none', values: {} }
    const parts = parseAndJoin(label)
    if (!parts) return null
    const values: Record<string, number> = {}
    for (const part of parts) {
      const unresolved = part.match(/^(\d+)% of imports could not be resolved$/)
      const external = part.match(/^(\d+)% of imports come from third-party packages$/)
      if (unresolved) values.unresolved = Number(unresolved[1])
      else if (external) values.external = Number(external[1])
      else return null
    }
    if (values.unresolved === undefined && values.external === undefined) return null
    return { kind: 'imports', values }
  }
  if (item.category === 'size') {
    if (label === 'No unusually large files or functions') return { kind: 'size-none', values: {} }
    const parts = parseAndJoin(label)
    if (!parts) return null
    const values: Record<string, number> = {}
    for (const part of parts) {
      const files = parsePlural(part, 'very large file')
      const functions = parsePlural(part, 'very large function')
      if (files !== null) values.files = files
      else if (functions !== null) values.functions = functions
      else return null
    }
    if (values.files === undefined && values.functions === undefined) return null
    return { kind: 'size', values }
  }
  return null
}

export function qualityBreakdownLabel(item: QualityBreakdownItem, messages: QualityBreakdownMessages): string {
  const parsed = parseQualityBreakdownLabel(item)
  if (!parsed) return item.label
  switch (parsed.kind) {
    case 'architecture-none':
      return messages.qualityLabelArchitectureNone
    case 'architecture': {
      const parts: string[] = []
      if (parsed.values.forbidden) parts.push(messages.qualityLabelForbiddenDeps(parsed.values.forbidden))
      if (parsed.values.undeclared) parts.push(messages.qualityLabelUndeclaredImports(parsed.values.undeclared))
      return parts.length ? messages.qualityListAnd(parts) : item.label
    }
    case 'cycles-none':
      return messages.qualityLabelCyclesNone
    case 'cycles':
      return messages.qualityLabelCycles(parsed.values.count ?? 0)
    case 'hotspots-none':
      return messages.qualityLabelHotspotsNone
    case 'hotspots':
      return messages.qualityLabelHotspots(parsed.values.count ?? 0)
    case 'hotspots-max':
      return messages.qualityLabelHotspotsWithMax(parsed.values.count ?? 0, parsed.values.maxCount ?? 0)
    case 'imports-none':
      return messages.qualityLabelImportsNone
    case 'imports': {
      const parts: string[] = []
      if (parsed.values.unresolved !== undefined) {
        parts.push(messages.qualityLabelImportsUnresolved(parsed.values.unresolved))
      }
      if (parsed.values.external !== undefined) {
        parts.push(messages.qualityLabelImportsExternal(parsed.values.external))
      }
      return parts.length ? messages.qualityListAnd(parts) : item.label
    }
    case 'size-none':
      return messages.qualityLabelSizeNone
    case 'size': {
      const parts: string[] = []
      if (parsed.values.files) parts.push(messages.qualityLabelSizeFiles(parsed.values.files))
      if (parsed.values.functions) parts.push(messages.qualityLabelSizeFunctions(parsed.values.functions))
      return parts.length ? messages.qualityListAnd(parts) : item.label
    }
    default:
      return item.label
  }
}

export function localizedFolderQualitySummary(
  score: QualityScore,
  messages: QualityBreakdownMessages,
  emptyLabel: string
): string {
  const parts: string[] = []
  for (const item of score.breakdown) {
    if (item.penalty <= 0) continue
    if (CLEAN_QUALITY_LABELS.has(item.label)) {
      parts.push(messages.qualitySmallPenalty(messages.qualityCategoryTitle(item.category)))
      continue
    }
    parts.push(qualityBreakdownLabel(item, messages))
  }
  if (parts.length === 0) return emptyLabel
  return messages.qualityListAnd(parts)
}

/** English list joiner, kept for tests that do not pass a locale catalog. */
export function englishListAnd(parts: string[]): string {
  return andJoin(parts)
}

export function englishSmallPenalty(categoryTitle: string): string {
  return `a small ${categoryTitle.toLowerCase()} penalty`
}

/** Convenience: English category titles from the shared helper. */
export { qualityCategoryTitle }
