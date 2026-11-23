/**
 * Helpers for the scan-report "Duplicated code" section. Sorting, caps,
 * visibility and path labels live here so the Vue view and the tests share
 * one source.
 */
import type { DuplicateGroup, GraphDuplicates } from './graph-types'
import { hotspotFileName, hotspotShortPath } from './hotspot-band'

/** Engine lists at most 20 groups; the Summary tab keeps the same cap. */
export const DUPLICATES_GROUPS_LIMIT = 20

export function hasGraphDuplicates(duplicates?: GraphDuplicates | null): boolean {
  return (duplicates?.groups.length ?? 0) > 0
}

/** Longest blocks first, then most occurrences, then id. */
export function sortedDuplicateGroups(groups: readonly DuplicateGroup[]): DuplicateGroup[] {
  return [...groups].sort((left, right) => {
    return (
      right.lineCount - left.lineCount ||
      right.occurrences.length - left.occurrences.length ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
    )
  })
}

export function cappedDuplicateGroups(
  groups: readonly DuplicateGroup[],
  limit = DUPLICATES_GROUPS_LIMIT
): DuplicateGroup[] {
  return sortedDuplicateGroups(groups).slice(0, limit)
}

export function duplicateFileName(path: string): string {
  return hotspotFileName(path)
}

export function duplicateShortPath(path: string): string {
  return hotspotShortPath(path)
}

/** Split so a long path in a description can wrap at each slash, not mid-name. */
export function descriptionSegments(text: string): string[] {
  if (!text.includes('/')) return [text]
  return text.split(/(?=\/)/)
}
