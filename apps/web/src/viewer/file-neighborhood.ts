import type { GraphIndex } from './overview'

export const FILE_NEIGHBORHOOD_GROUP_THRESHOLD = 12
/** Angular gap left open at the top and bottom poles so the halves do not collide. */
export const FILE_SPLIT_POLE_GAP = (20 * Math.PI) / 180
/** Wider than the bottom gap so the first use / last used-by sit clear of a top toolbar. */
export const FILE_SPLIT_TOP_GAP = (32 * Math.PI) / 180
export const NBH_GROUP_PREFIX = 'nbh-group:'

export type NeighborhoodRole = 'uses' | 'usedBy'

export interface NeighborhoodGroup {
  id: string
  role: NeighborhoodRole
  folder: string
  folderLabel: string
  label: string
  memberIds: string[]
}

export interface PackedNeighborhoodSide {
  role: NeighborhoodRole
  ring1: string[]
  groups: Map<string, NeighborhoodGroup>
}

export interface HalfRingCaption {
  side: NeighborhoodRole
  title: string
  count: number
  /** Radians; 0 is right, π is left. */
  angle: number
}

export function isNeighborhoodGroupId(id: string): boolean {
  return id.startsWith(NBH_GROUP_PREFIX)
}

export function neighborhoodGroupId(role: NeighborhoodRole, folder: string): string {
  return `${NBH_GROUP_PREFIX}${role}:${folder || 'root'}`
}

export function folderLabel(folder: string): string {
  if (!folder || folder === 'root') return 'root'
  if (folder === 'external') return 'external'
  const parts = folder.split('/')
  return parts[parts.length - 1] || folder
}

function compareUtf16(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function nodeFolder(index: GraphIndex, id: string): string {
  if (id.startsWith('ext:') || index.nodesById.get(id)?.kind === 'external') return 'external'
  const node = index.nodesById.get(id)
  const path =
    node && (node.kind === 'directory' || node.kind === 'file') && 'path' in node
      ? node.path
      : node && node.kind === 'symbol' && 'file' in node
        ? node.file
        : ''
  if (!path) return ''
  const slash = path.lastIndexOf('/')
  return slash === -1 ? '' : path.slice(0, slash)
}

function parentFolder(folder: string): string | null {
  if (!folder || folder === 'external') return null
  const slash = folder.lastIndexOf('/')
  if (slash <= 0) return null
  return folder.slice(0, slash)
}

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids)].sort(compareUtf16)
}

/** Direct import / importer neighbours of a file, excluding the file itself. */
export function collectNeighborhoodSides(
  index: GraphIndex,
  nucleusId: string
): { uses: string[]; usedBy: string[] } {
  const uses: string[] = []
  const usedBy: string[] = []
  for (const link of index.outgoing.get(nucleusId) ?? []) {
    if (link.other === nucleusId) continue
    uses.push(link.other)
  }
  for (const link of index.incoming.get(nucleusId) ?? []) {
    if (link.other === nucleusId) continue
    usedBy.push(link.other)
  }
  return { uses: uniqueSorted(uses), usedBy: uniqueSorted(usedBy) }
}

function bucketByFolder(index: GraphIndex, ids: string[], keyOf: (id: string) => string): Map<string, string[]> {
  const buckets = new Map<string, string[]>()
  for (const id of ids) {
    const key = keyOf(id)
    const list = buckets.get(key) ?? []
    list.push(id)
    buckets.set(key, list)
  }
  for (const list of buckets.values()) list.sort(compareUtf16)
  return buckets
}

/**
 * If a side has more than `threshold` neighbours, group files by folder
 * (coarsening toward the repo root until the ring-1 count fits).
 * Single-file folders stay as the file itself. Groups are labelled "N files".
 */
export function packNeighborhoodSide(
  index: GraphIndex,
  ids: string[],
  role: NeighborhoodRole,
  threshold = FILE_NEIGHBORHOOD_GROUP_THRESHOLD
): PackedNeighborhoodSide {
  const sorted = uniqueSorted(ids)
  if (sorted.length <= threshold) {
    return { role, ring1: sorted, groups: new Map() }
  }

  let folders = new Map<string, string>()
  for (const id of sorted) folders.set(id, nodeFolder(index, id))

  const bucketsOf = () => bucketByFolder(index, sorted, (id) => folders.get(id) ?? '')

  let buckets = bucketsOf()
  while (buckets.size > threshold) {
    let coarsened = false
    const next = new Map<string, string>()
    for (const id of sorted) {
      const folder = folders.get(id) ?? ''
      const up = parentFolder(folder)
      if (up) {
        next.set(id, up)
        coarsened = true
      } else {
        next.set(id, folder)
      }
    }
    if (!coarsened) break
    folders = next
    buckets = bucketsOf()
  }

  if (buckets.size > threshold) {
    const entries = [...buckets.entries()].sort((a, b) => a[1].length - b[1].length || compareUtf16(a[0], b[0]))
    const overflow = entries.slice(0, entries.length - threshold + 1)
    const keep = new Map(entries.slice(overflow.length))
    const other = overflow.flatMap(([, members]) => members).sort(compareUtf16)
    keep.set('other', other)
    buckets = keep
  }

  const ring1: string[] = []
  const groups = new Map<string, NeighborhoodGroup>()
  for (const [folder, members] of [...buckets.entries()].sort((a, b) => compareUtf16(a[0], b[0]))) {
    if (members.length === 1) {
      ring1.push(members[0]!)
      continue
    }
    const id = neighborhoodGroupId(role, folder)
    ring1.push(id)
    groups.set(id, {
      id,
      role,
      folder,
      folderLabel: folderLabel(folder),
      label: `${members.length} files`,
      memberIds: members
    })
  }
  ring1.sort(compareUtf16)
  return { role, ring1, groups }
}

export function fileNeighborhoodTree(
  index: GraphIndex,
  nucleusId: string,
  expanded: ReadonlySet<string>,
  threshold = FILE_NEIGHBORHOOD_GROUP_THRESHOLD
): {
  uses: string[]
  usedBy: string[]
  packedUses: PackedNeighborhoodSide
  packedUsedBy: PackedNeighborhoodSide
  depths: Map<string, number>
  parentOf: Map<string, string>
  memberToGroup: Map<string, string>
  halfCaptions: HalfRingCaption[]
} {
  const { uses, usedBy } = collectNeighborhoodSides(index, nucleusId)
  const usedByOnly = usedBy.filter((id) => !uses.includes(id))
  const packedUses = packNeighborhoodSide(index, uses, 'uses', threshold)
  const packedUsedBy = packNeighborhoodSide(index, usedByOnly, 'usedBy', threshold)

  const depths = new Map<string, number>()
  const parentOf = new Map<string, string>()
  const memberToGroup = new Map<string, string>()
  depths.set(nucleusId, 0)

  const placeRing1 = (packed: PackedNeighborhoodSide) => {
    for (const id of packed.ring1) {
      depths.set(id, 1)
      parentOf.set(id, nucleusId)
    }
    for (const group of packed.groups.values()) {
      for (const member of group.memberIds) {
        memberToGroup.set(member, group.id)
        if (!expanded.has(group.id)) continue
        depths.set(member, 2)
        parentOf.set(member, group.id)
      }
    }
  }
  placeRing1(packedUses)
  placeRing1(packedUsedBy)

  const halfCaptions: HalfRingCaption[] = []
  if (uses.length > 0) halfCaptions.push({ side: 'uses', title: 'Uses', count: uses.length, angle: 0 })
  if (usedBy.length > 0) {
    halfCaptions.push({ side: 'usedBy', title: 'Used by', count: usedBy.length, angle: Math.PI })
  }

  return {
    uses,
    usedBy,
    packedUses,
    packedUsedBy,
    depths,
    parentOf,
    memberToGroup,
    halfCaptions
  }
}

/** Evenly space ring-1 ids inside [start, end). */
export function spreadAngles(ids: string[], start: number, end: number): Map<string, { start: number; end: number; angle: number }> {
  const out = new Map<string, { start: number; end: number; angle: number }>()
  if (ids.length === 0) return out
  const span = (end - start) / ids.length
  ids.forEach((id, index) => {
    const a0 = start + index * span
    const a1 = a0 + span
    out.set(id, { start: a0, end: a1, angle: (a0 + a1) / 2 })
  })
  return out
}
