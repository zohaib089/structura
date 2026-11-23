/**
 * Helpers for the scan-report quality score card. Grades, category titles,
 * tip caps and folder order live here so the Vue view and the tests share one source.
 */
import type {
  FolderQualityScore,
  GraphQuality,
  QualityCategory,
  QualityGrade,
  QualityScore,
  QualityTip
} from './graph-types'
import { QUALITY_CATEGORIES, QUALITY_GRADES } from './graph-types'

export const QUALITY_TIPS_LIMIT = 3
/** Summary tab shows the worst folders first; cap keeps the list readable. */
export const QUALITY_FOLDERS_LIMIT = 10

const GRADE_MIN: Record<QualityGrade, number> = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
  F: 0
}

const CATEGORY_TITLES: Record<QualityCategory, string> = {
  architecture: 'Structure rules',
  cycles: 'Circular imports',
  hotspots: 'Riskiest files',
  imports: 'Imports',
  size: 'File and function size'
}

export function isQualityGrade(value: string): value is QualityGrade {
  return (QUALITY_GRADES as readonly string[]).includes(value)
}

/** Letter grade for a 0–100 score (A 90–100, B 80–89, C 70–79, D 60–69, F 0–59). */
export function qualityGradeFromScore(score: number): QualityGrade {
  if (score >= GRADE_MIN.A) return 'A'
  if (score >= GRADE_MIN.B) return 'B'
  if (score >= GRADE_MIN.C) return 'C'
  if (score >= GRADE_MIN.D) return 'D'
  return 'F'
}

export function qualityCategoryTitle(category: QualityCategory): string {
  return CATEGORY_TITLES[category]
}

export function hasGraphQuality(
  quality: GraphQuality | null | undefined
): quality is GraphQuality {
  return Boolean(quality && quality.project && Number.isFinite(quality.project.score))
}

/** Keep at most the first N tips (engine already sends the three highest gains). */
export function cappedQualityTips(tips: readonly QualityTip[], limit = QUALITY_TIPS_LIMIT): QualityTip[] {
  return tips.slice(0, Math.max(0, limit))
}

/** Worst score first, then by path, so a shuffled list still matches the published order. */
export function sortedFolderQuality(folders: readonly FolderQualityScore[]): FolderQualityScore[] {
  return [...folders].sort((left, right) => left.score - right.score || left.path.localeCompare(right.path))
}

export function cappedFolderQuality(
  folders: readonly FolderQualityScore[],
  limit = QUALITY_FOLDERS_LIMIT
): FolderQualityScore[] {
  return sortedFolderQuality(folders).slice(0, Math.max(0, limit))
}

export function andJoin(parts: string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0] ?? ''
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`
}

const CLEAN_QUALITY_LABELS = new Set([
  'No architecture rule breaks',
  'No import cycles',
  'No highly connected hotspots',
  'Imports resolve cleanly',
  'No unusually large files or functions'
])

function summaryPart(item: QualityScore['breakdown'][number]): string | null {
  if (item.penalty <= 0) return null
  // The engine can apply a small penalty while still using an "all clear" label
  // (for example a modest third-party import share). Don't repeat that wording.
  if (CLEAN_QUALITY_LABELS.has(item.label)) {
    return `a small ${qualityCategoryTitle(item.category).toLowerCase()} penalty`
  }
  return item.label
}

/** Plain-English summary of what pulled a folder score down. */
export function folderQualitySummary(score: QualityScore, emptyLabel = 'No issues in this folder.'): string {
  const parts = score.breakdown.map(summaryPart).filter((part): part is string => Boolean(part))
  if (parts.length === 0) return emptyLabel
  return andJoin(parts)
}

export function qualityFolderName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts.at(-1) ?? path
}

/** Parent folder, shortened when it would be long to read. */
export function qualityFolderShortPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return ''
  const dir = parts.slice(0, -1)
  const joined = dir.join('/')
  if (dir.length <= 3 || joined.length <= 32) return joined
  return `${dir[0]}/…/${dir[dir.length - 1]}`
}

const GAIN_SUFFIX = /\s+to gain about (\d+) points?$/

/** Tip wording without the trailing "to gain about N points" when the gain chip already shows it. */
export function tipActionText(tip: QualityTip): string {
  const match = tip.text.match(GAIN_SUFFIX)
  if (match && Number(match[1]) === tip.gain) {
    return tip.text.slice(0, match.index).trim()
  }
  return tip.text
}

export function orderedBreakdown(score: QualityScore): QualityScore['breakdown'] {
  const byCategory = new Map(score.breakdown.map((item) => [item.category, item]))
  return QUALITY_CATEGORIES.map((category) => byCategory.get(category)).filter(
    (item): item is QualityScore['breakdown'][number] => Boolean(item)
  )
}
