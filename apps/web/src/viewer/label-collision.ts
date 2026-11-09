/**
 * Desktop label placement: measure real text widths, then resolve label↔label and
 * label↔disc overlaps by flipping side, nudging along the ring, then ellipsizing.
 */

/** Half of the 1.5rem disc in flow px (matches overview.COLLISION_DISC_OFFSET). */
export const COLLISION_DISC_OFFSET = 12

export type LabelSide = 'start' | 'end'

export interface LabelBox {
  left: number
  right: number
  top: number
  bottom: number
}

export interface LabelPlacement {
  id: string
  angle: number
  side: LabelSide
  displayLabel: string
  width: number
  height: number
  box: LabelBox
}

export interface CollisionNode {
  id: string
  label: string
  depth: number
  /** Layout angle (radians). */
  angle: number
  /** Disc-centre radius for this node's ring. */
  radius: number
  nucleus?: boolean
}

/** Monospace metrics matching OverviewNode label style (11px / font-size-xs). */
export const LABEL_FONT =
  '600 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
export const LABEL_HEIGHT = 14
/**
 * Horizontal gap from disc centre to label edge.
 * Matches OverviewNode: aside at `100% + --space-3` of a 1.5rem disc → centre + 12 + 12.
 */
export const LABEL_GAP = 24
/** Approx advance when canvas measureText is unavailable (jsdom / SSR). */
const FALLBACK_ADVANCE = 6.6
/**
 * FitFrame grows --graph-mark-scale as zoom drops so labels stay ~11.5px on screen.
 * Collision runs in flow units, so widths must be inflated by the expected mark scale.
 */
export const LABEL_FLOW_SCALE = 3.4
/** FitFrame also grows discs via --graph-disc-scale; inflate obstacle discs. */
export const DISC_FLOW_SCALE = 2.4

let canvasCtx: CanvasRenderingContext2D | null | undefined

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (canvasCtx !== undefined) return canvasCtx
  if (typeof document === 'undefined') {
    canvasCtx = null
    return null
  }
  try {
    const c = document.createElement('canvas')
    canvasCtx = c.getContext('2d')
  } catch {
    canvasCtx = null
  }
  return canvasCtx
}

/** Measured label width in unscaled CSS px (canvas measureText when available). */
export function measureLabelWidthCss(text: string, font: string = LABEL_FONT): number {
  const ctx = getMeasureCtx()
  if (ctx) {
    ctx.font = font
    const w = ctx.measureText(text).width
    if (w > 0) return w + 4
  }
  return text.length * FALLBACK_ADVANCE + 4
}

/** Flow-unit label width after FitFrame mark-scale inflation. */
export function measureLabelWidth(text: string, font: string = LABEL_FONT, flowScale = LABEL_FLOW_SCALE): number {
  return measureLabelWidthCss(text, font) * flowScale
}

export function ellipsizeLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  if (maxChars <= 1) return '…'
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`
}

export function hit(a: LabelBox, b: LabelBox, pad = 4): boolean {
  return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad
}

export function discBox(cx: number, cy: number, half = COLLISION_DISC_OFFSET * DISC_FLOW_SCALE): LabelBox {
  return { left: cx - half, right: cx + half, top: cy - half, bottom: cy + half }
}

/** Nucleus name + ENTRY POINT stack below the hexagon. */
export function nucleusLabelBox(cx: number, cy: number, name: string): LabelBox {
  const w = Math.max(measureLabelWidth(name), measureLabelWidth('ENTRY POINT'))
  const top = cy + COLLISION_DISC_OFFSET + 14
  const h = LABEL_HEIGHT * 2 * LABEL_FLOW_SCALE
  return { left: cx - w / 2, right: cx + w / 2, top, bottom: top + h }
}

export function labelBoxAt(
  cx: number,
  cy: number,
  side: LabelSide,
  width: number,
  height: number = LABEL_HEIGHT * LABEL_FLOW_SCALE
): LabelBox {
  const gap = LABEL_GAP
  if (side === 'start') {
    // West / inward-left of disc
    return {
      left: cx - gap - width,
      right: cx - gap,
      top: cy - height / 2,
      bottom: cy + height / 2
    }
  }
  return {
    left: cx + gap,
    right: cx + gap + width,
    top: cy - height / 2,
    bottom: cy + height / 2
  }
}

function defaultSide(angle: number): LabelSide {
  return Math.cos(angle) < 0 ? 'start' : 'end'
}

function centreAt(radius: number, angle: number): { cx: number; cy: number } {
  // Disc centre = top-left (R cos, R sin) + offset — same as layoutRadialTree.
  return {
    cx: radius * Math.cos(angle) + COLLISION_DISC_OFFSET,
    cy: radius * Math.sin(angle) + COLLISION_DISC_OFFSET
  }
}

/**
 * Resolve collisions for a radial layout. Mutates nothing on the input; returns
 * placements keyed by id. Angles may be nudged within ±maxNudge; callers should
 * re-apply positions from the returned angles.
 */
export function resolveLabelCollisions(
  nodes: CollisionNode[],
  options: { maxNudge?: number; pad?: number } = {}
): Map<string, LabelPlacement> {
  const maxNudge = options.maxNudge ?? 0.35
  const pad = options.pad ?? 8
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const placements = new Map<string, LabelPlacement>()

  const discs: LabelBox[] = []
  for (const n of nodes) {
    if (n.nucleus || n.depth === 0) {
      const { cx, cy } = centreAt(0, 0)
      // Larger nucleus disc (~2.75rem → ~22px half)
      discs.push(discBox(cx, cy, (COLLISION_DISC_OFFSET + 10) * DISC_FLOW_SCALE))
      discs.push(nucleusLabelBox(cx, cy, n.label))
      placements.set(n.id, {
        id: n.id,
        angle: n.angle,
        side: 'end',
        displayLabel: n.label,
        width: measureLabelWidth(n.label),
        height: LABEL_HEIGHT * 2,
        box: nucleusLabelBox(cx, cy, n.label)
      })
      continue
    }
    const { cx, cy } = centreAt(n.radius, n.angle)
    discs.push(discBox(cx, cy))
  }

  const ordered = [...nodes]
    .filter((n) => !n.nucleus && n.depth > 0)
    .sort((a, b) => a.depth - b.depth || a.angle - b.angle || a.id.localeCompare(b.id))

  const placedLabels: LabelBox[] = [placements.get(nodes.find((n) => n.nucleus || n.depth === 0)?.id ?? '')?.box].filter(
    Boolean
  ) as LabelBox[]

  const clashes = (box: LabelBox, ownDisc: LabelBox): boolean => {
    if (placedLabels.some((p) => hit(box, p, pad))) return true
    for (const d of discs) {
      if (d === ownDisc) continue
      // Skip own disc by geometry match
      if (Math.abs(d.left - ownDisc.left) < 0.01 && Math.abs(d.top - ownDisc.top) < 0.01) continue
      if (hit(box, d, pad)) return true
    }
    return false
  }

  for (const n of ordered) {
    const own = discBox(
      n.radius * Math.cos(n.angle) + COLLISION_DISC_OFFSET,
      n.radius * Math.sin(n.angle) + COLLISION_DISC_OFFSET
    )
    const charCaps = [n.label.length, 14, 10, 7, 4, 2]
    let chosen: LabelPlacement | null = null

    outer: for (const cap of charCaps) {
      const text = ellipsizeLabel(n.label, cap)
      const width = measureLabelWidth(text)
      const sides: LabelSide[] = [defaultSide(n.angle), defaultSide(n.angle) === 'start' ? 'end' : 'start']
      const nudges = [0, 0.05, -0.05, 0.1, -0.1, 0.16, -0.16, 0.22, -0.22, maxNudge, -maxNudge]
      for (const side of sides) {
        for (const nudge of nudges) {
          if (Math.abs(nudge) > maxNudge + 1e-9) continue
          const angle = n.angle + nudge
          const { cx, cy } = centreAt(n.radius, angle)
          // Keep disc obstacle for nudged position too
          const box = labelBoxAt(cx, cy, side, width)
          const ownNow = discBox(cx, cy)
          if (clashes(box, ownNow)) continue
          chosen = {
            id: n.id,
            angle,
            side,
            displayLabel: text,
            width,
            height: LABEL_HEIGHT * LABEL_FLOW_SCALE,
            box
          }
          break outer
        }
      }
    }

    if (!chosen) {
      // Last resort: shortest ellipsis on default side, accept overlap for tests to flag
      const text = ellipsizeLabel(n.label, 6)
      const width = measureLabelWidth(text)
      const side = defaultSide(n.angle)
      const { cx, cy } = centreAt(n.radius, n.angle)
      chosen = {
        id: n.id,
        angle: n.angle,
        side,
        displayLabel: text,
        width,
        height: LABEL_HEIGHT * LABEL_FLOW_SCALE,
        box: labelBoxAt(cx, cy, side, width)
      }
    }

    placements.set(n.id, chosen)
    placedLabels.push(chosen.box)
    // Update disc list entry for this node to nudged centre so later labels avoid it
    const { cx, cy } = centreAt(n.radius, chosen.angle)
    const idx = discs.findIndex(
      (d) =>
        Math.abs(d.left - own.left) < 0.5 && Math.abs(d.top - own.top) < 0.5
    )
    if (idx >= 0) discs[idx] = discBox(cx, cy)
    void byId
  }


  // Refinement passes: earlier labels can be invalidated when later nodes nudge.
  for (let pass = 0; pass < 5; pass += 1) {
    const issues = assertNoLabelOverlaps(placements, nodes)
    if (issues.length === 0) break
    for (const issue of issues) {
      const m = /^label×(?:label|disc|nucleusLabel) (.+?)×/.exec(issue)
      if (!m) continue
      const id = m[1]!
      const n = byId.get(id)
      const cur = placements.get(id)
      if (!n || !cur || n.nucleus || n.depth === 0) continue
      const caps = [Math.min(cur.displayLabel.replace(/…$/, '').length, n.label.length), 10, 7, 4, 2]
      let fixed: LabelPlacement | null = null
      outer2: for (const cap of caps) {
        const text = ellipsizeLabel(n.label, cap)
        const width = measureLabelWidth(text)
        const sides: LabelSide[] = [cur.side === 'start' ? 'end' : 'start', cur.side]
        for (const side of sides) {
          for (const nudge of [0, 0.08, -0.08, 0.16, -0.16, 0.28, -0.28, maxNudge, -maxNudge]) {
            const angle = n.angle + nudge
            const { cx, cy } = centreAt(n.radius, angle)
            const box = labelBoxAt(cx, cy, side, width)
            const ownNow = discBox(cx, cy)
            // Rebuild placed labels excluding this id
            const others = [...placements.values()].filter((p) => p.id !== id).map((p) => p.box)
            const discHit = discs.some((d) => {
              if (Math.abs(d.left - ownNow.left) < 0.5 && Math.abs(d.top - ownNow.top) < 0.5) return false
              return hit(box, d, pad)
            })
            const labelHit = others.some((o) => hit(box, o, pad))
            if (discHit || labelHit) continue
            fixed = { id, angle, side, displayLabel: text, width, height: LABEL_HEIGHT * LABEL_FLOW_SCALE, box }
            break outer2
          }
        }
      }
      if (fixed) {
        placements.set(id, fixed)
        const { cx, cy } = centreAt(n.radius, fixed.angle)
        const ownOld = discBox(
          n.radius * Math.cos(n.angle) + COLLISION_DISC_OFFSET,
          n.radius * Math.sin(n.angle) + COLLISION_DISC_OFFSET
        )
        const idx = discs.findIndex(
          (d) => Math.abs(d.left - ownOld.left) < 2 && Math.abs(d.top - ownOld.top) < 2
        )
        if (idx >= 0) discs[idx] = discBox(cx, cy)
      }
    }
  }

  return placements
}

/** True when no label–label or label–disc overlaps remain (own disc excluded). */
export function assertNoLabelOverlaps(placements: Map<string, LabelPlacement>, nodes: CollisionNode[]): string[] {
  const issues: string[] = []
  const list = [...placements.values()].filter((p) => {
    const n = nodes.find((x) => x.id === p.id)
    return n && !n.nucleus && n.depth > 0
  })
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      if (hit(list[i]!.box, list[j]!.box, 3)) issues.push(`label×label ${list[i]!.id}×${list[j]!.id}`)
    }
  }
  for (const p of list) {
    for (const n of nodes) {
      if (n.id === p.id) continue
      const r = n.nucleus || n.depth === 0 ? 0 : n.radius
      const a = n.nucleus || n.depth === 0 ? 0 : (placements.get(n.id)?.angle ?? n.angle)
      const { cx, cy } = centreAt(r, a)
      const half = (n.nucleus || n.depth === 0 ? COLLISION_DISC_OFFSET + 10 : COLLISION_DISC_OFFSET) * DISC_FLOW_SCALE
      const d = discBox(cx, cy, half)
      if (hit(p.box, d, 3)) issues.push(`label×disc ${p.id}×${n.id}`)
      if (n.nucleus || n.depth === 0) {
        const nb = nucleusLabelBox(cx, cy, n.label)
        if (hit(p.box, nb, 3)) issues.push(`label×nucleusLabel ${p.id}×${n.id}`)
      }
    }
  }
  return issues
}
