/**
 * Helpers for the scan-report "Duplicated code" section. Sorting, caps,
 * visibility and path labels live here so the Vue view and the tests share
 * one source.
 */
import type { DuplicateGroup, GraphDuplicates } from './graph-types'
import { formatDuplicateGroupText } from './graph-message-codes'
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


export interface DuplicateDescriptionMessages {
  duplicatesDescriptionTwoPaths: (lines: number, pathA: string, pathB: string) => string
  duplicatesDescriptionOnePath: (lines: number, count: number, path: string) => string
  duplicatesDescriptionManyPaths: (lines: number, fileCount: number) => string
}

/** Build a description from lineCount + occurrences; fall back to the engine string. */
export function duplicateGroupDescription(
  group: Pick<DuplicateGroup, 'lineCount' | 'occurrences' | 'description' | 'code' | 'params'>,
  messages: DuplicateDescriptionMessages
): string {
  const fromCode = formatDuplicateGroupText(group, messages)
  if (fromCode) return fromCode
  const paths: string[] = []
  for (const item of group.occurrences) {
    if (!paths.includes(item.path)) paths.push(item.path)
  }
  if (paths.length === 1 && paths[0]) {
    return messages.duplicatesDescriptionOnePath(group.lineCount, group.occurrences.length, paths[0])
  }
  if (paths.length === 2 && group.occurrences.length === 2 && paths[0] && paths[1]) {
    return messages.duplicatesDescriptionTwoPaths(group.lineCount, paths[0], paths[1])
  }
  if (paths.length > 0) {
    return messages.duplicatesDescriptionManyPaths(group.lineCount, paths.length)
  }
  return group.description
}
