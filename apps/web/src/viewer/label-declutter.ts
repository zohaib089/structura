/**
 * Decide which node labels to hide so the graph stays readable.
 * Priority: nucleus → selected → files with findings → closer to centre.
 * Hidden names stay in aria-label/title and reappear on hover/focus/selection.
 */

export interface DeclutterBox {
  id: string
  label: { left: number; right: number; top: number; bottom: number }
  disc: { left: number; right: number; top: number; bottom: number }
  nucleus?: boolean
  selected?: boolean
  hasFindings?: boolean
  /** Distance from ring centre (smaller = higher priority among peers). */
  distance: number
}

export interface DeclutterBounds {
  left: number
  right: number
  top: number
  bottom: number
}

function hit(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
  pad = 4
): boolean {
  return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad
}

function outside(
  r: { left: number; right: number; top: number; bottom: number },
  bounds: DeclutterBounds,
  pad = 4
): boolean {
  return r.left < bounds.left + pad || r.right > bounds.right - pad || r.top < bounds.top || r.bottom > bounds.bottom
}

function rank(box: DeclutterBox): number {
  if (box.nucleus) return -2
  if (box.selected) return -1
  return (box.hasFindings ? 0 : 1e5) + box.distance
}

/** Returns the set of node ids whose labels should be hidden. */
export function labelsToHide(boxes: DeclutterBox[], bounds: DeclutterBounds): Set<string> {
  const hidden = new Set<string>()
  const placed: DeclutterBox['label'][] = []
  const ordered = [...boxes].sort((a, b) => rank(a) - rank(b))
  for (const box of ordered) {
    const must = Boolean(box.nucleus || box.selected)
    const clash =
      outside(box.label, bounds) ||
      placed.some((p) => hit(box.label, p)) ||
      boxes.some((other) => other.id !== box.id && hit(box.label, other.disc))
    if (clash && !must) hidden.add(box.id)
    else placed.push(box.label)
  }
  return hidden
}
