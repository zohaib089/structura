<script setup lang="ts">
import { useVueFlow } from '@vue-flow/core'
import { watch } from 'vue'
import { RADIAL_RING_GAP } from '../overview'
import { radialFitViewport, type FitBox } from '../radial-fit'
import { EMBEDDED_MAX_MARK_SCALE, LABEL_PX, BASE_LABEL_PX, isPhoneCanvas, markScaleForZoom } from '../graph-mark-scale'

const props = defineProps<{
  signature: string
  duration?: number
  padding?: number
  ringCount?: number
  focusIds?: string[]
  /** Back: put this exact viewport back instead of fitting (token changes per request). */
  restore?: { token: number; viewport: { x: number; y: number; zoom: number } | null } | null
  /** Expand / collapse: keep this node where it was on screen when the person had zoomed or panned. */
  keepView?: { token: number; id: string } | null
  reserveZoomPad?: boolean
  hideOverlappingRing1?: boolean
}>()
const flow = useVueFlow()

function overlays(canvas: HTMLElement) {
  const box = canvas.getBoundingClientRect()
  const stage = canvas.closest('.stage') ?? canvas.parentElement
  const barEl = stage?.querySelector('.floating-bar') ?? document.querySelector('.floating-bar')
  const bar = barEl?.getBoundingClientRect()
  const coach = stage?.querySelector('[data-testid="coach-mark"]')?.getBoundingClientRect()
  const zoomEl = stage?.querySelector('.zoom') ?? canvas.querySelector('.zoom') ?? document.querySelector('.vue-flow__panel.zoom, .zoom')
  const zoom = zoomEl?.getBoundingClientRect()
  const reserveZoom = Boolean(props.reserveZoomPad) && zoom && zoom.width > 0 && zoom.height > 0
  const barReserve = bar && bar.height > 0 ? Math.max(0, bar.bottom - box.top) : 0
  // Embedded: always keep a toolbar-sized top band so discs/labels cannot slide under the bar
  // when the first fit runs before the bar box is measurable.
  const topPad = props.reserveZoomPad ? 40 : 0
  return {
    top: Math.max(barReserve + topPad, props.reserveZoomPad ? 96 : 0),
    bottom: reserveZoom ? Math.max(0, box.bottom - zoom.top) : 0,
    right: reserveZoom ? Math.max(0, box.right - zoom.left) : 0,
    bar: bar && bar.height > 0 ? bar : null,
    zoom: reserveZoom ? zoom : null,
    coach: coach && coach.height > 0
      ? { left: coach.left - box.left, right: coach.right - box.left, top: coach.top - box.top, bottom: box.bottom - coach.top }
      : null
  }
}

/** Real painted extents in flow units: node marks, their visible labels/chips, and the outer ring. */
function measuredBoxes(canvas: HTMLElement, focus: Set<string>): FitBox[] {
  const box = canvas.getBoundingClientRect()
  const vp = flow.viewport.value
  const toFlow = (rect: DOMRect): FitBox => ({
    x: (rect.left - box.left - vp.x) / vp.zoom,
    y: (rect.top - box.top - vp.y) / vp.zoom,
    width: rect.width / vp.zoom,
    height: rect.height / vp.zoom
  })
  const boxes: FitBox[] = []
  const phone = isPhoneCanvas(canvas.clientWidth)
  // Desktop (≥640): include labels. Phone: include visible labels so fit keeps ~11px text on-screen.
  // Mid widths (481–639) still fit marks/rings only; declutter handles overflow.
  const withLabels = canvas.clientWidth >= 640 || phone
  canvas.querySelectorAll<HTMLElement>('.overview-node').forEach((node) => {
    const id = node.dataset.nodeId ?? ''
    if (focus.size > 0 && !focus.has(id)) return
    boxes.push(toFlow(node.getBoundingClientRect()))
    const aside = node.querySelector<HTMLElement>(':scope > .aside')
    const labelEl = aside?.querySelector<HTMLElement>('.label') ?? aside
    if (withLabels && labelEl && !node.hasAttribute('data-label-hidden')) {
      const rect = labelEl.getBoundingClientRect()
      if (phone) {
        // Cap horizontal extent so left/right labels don't crush zoom; prefer vertical placement instead.
        const disc = node.querySelector('.kind-mark--disc')?.getBoundingClientRect()
        const cx = disc ? (disc.left + disc.right) / 2 : (rect.left + rect.right) / 2
        const maxHalf = 40
        const left = Math.max(rect.left, cx - maxHalf)
        const right = Math.min(rect.right, cx + maxHalf)
        boxes.push(toFlow(new DOMRect(left, rect.top, Math.max(right - left, 1), rect.height)))
      } else {
        boxes.push(toFlow(rect))
      }
    }
  })
  if (focus.size === 0) {
    const rings = canvas.querySelectorAll('.ring-guides circle')
    const outer = rings[rings.length - 1]
    if (outer) boxes.push(toFlow(outer.getBoundingClientRect()))
  }
  return boxes
}

function ringCentre(canvas: HTMLElement) {
  const guide = canvas.querySelector('.ring-guides')?.getBoundingClientRect()
  const box = canvas.getBoundingClientRect()
  const vp = flow.viewport.value
  return guide && vp.zoom > 0 ? { x: (guide.left - box.left - vp.x) / vp.zoom, y: (guide.top - box.top - vp.y) / vp.zoom } : undefined
}

function fitOnce() {
  const canvas = flow.vueFlowRef.value
  const focus = new Set(props.focusIds ?? [])
  if (!canvas || canvas.clientWidth === 0 || flow.viewport.value.zoom <= 0) return false
  const boxes = measuredBoxes(canvas, focus)
  if (boxes.length === 0) return false
  const measured = overlays(canvas)
  const phone = isPhoneCanvas(canvas.clientWidth)
  const input = {
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    reserve: {
      top: measured.top,
      bottom: Math.max(
        measured.bottom,
        measured.coach?.bottom ?? 0,
        props.reserveZoomPad ? 150 : 0
      ),
      right: Math.max(measured.right, props.reserveZoomPad ? 56 : 0),
      left: 0
    },
    nodes: boxes,
    ringRadius: focus.size === 0 && (props.ringCount ?? 0) > 0 ? RADIAL_RING_GAP : null,
    // Phone: extra padding so kept labels are not clipped at the canvas edge.
    // Embedded desktop: slightly tighter than 0.2 so ring-1 labels keep more screen arc.
    padding: phone ? Math.max(props.padding ?? 0.2, 0.22) : props.reserveZoomPad ? Math.min(props.padding ?? 0.2, 0.12) : (props.padding ?? 0.2),
    center: ringCentre(canvas),
    minZoom: props.reserveZoomPad ? LABEL_PX / (BASE_LABEL_PX * EMBEDDED_MAX_MARK_SCALE) : undefined
  }
  let viewport = radialFitViewport(input)
  // Hard clamp: after a width-limited or minZoom fit, shift or shrink so no disc
  // sits under the top toolbar reserve.
  const minTop = input.reserve.top
  const maxBottom = input.height - input.reserve.bottom
  const topPx = (vp: typeof viewport) => Math.min(...boxes.map((n) => vp.y + n.y * vp.zoom))
  const botPx = (vp: typeof viewport) => Math.max(...boxes.map((n) => vp.y + (n.y + n.height) * vp.zoom))
  const overflowTop = topPx(viewport) - minTop
  if (overflowTop < 0) viewport = { ...viewport, y: viewport.y - overflowTop }
  const overflowBot = botPx(viewport) - maxBottom
  if (overflowBot > 0) {
    const span = Math.max(botPx(viewport) - topPx(viewport), 1)
    const room = Math.max(maxBottom - minTop, 1)
    const nextZoom = Math.max(input.minZoom ?? 0.05, viewport.zoom * (room / span) * 0.98)
    const cx = input.center?.x ?? 0
    const cy = input.center?.y ?? 0
    viewport = {
      zoom: nextZoom,
      x: input.reserve.left + (input.width - input.reserve.left - (input.reserve.right ?? 0)) / 2 - cx * nextZoom,
      y: minTop + room / 2 - cy * nextZoom
    }
    if (topPx(viewport) < minTop) viewport = { ...viewport, y: viewport.y + (minTop - topPx(viewport)) }
  }
  void flow.setViewport(viewport, { duration: props.duration ?? 0 })
  return true
}

let declutterTimer = 0
function scheduleDeclutter() {
  window.clearTimeout(declutterTimer)
  declutterTimer = window.setTimeout(() => requestAnimationFrame(declutter), 120)
}

/** Marks grow with the zoom-out so labels stay ≈11.5px on screen; fit is re-measured once they settle. */
function frame() {
  return new Promise<void>((done) => requestAnimationFrame(() => done()))
}

/**
 * Declutter: paint labels in priority order (entry, selection, files with findings, inner rings first)
 * and hide any label that would overlap an already painted label or another node's mark. Hidden names
 * stay in aria-label/title and reappear on hover, keyboard focus and selection.
 */
function hitRect(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
  pad = 2
) {
  return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top + pad
}

function overlayScreenBoxes(canvas: HTMLElement): DOMRect[] {
  const measured = overlays(canvas)
  const boxes: DOMRect[] = []
  if (measured.bar) boxes.push(measured.bar)
  if (measured.zoom) boxes.push(measured.zoom)
  const stage = canvas.closest('.stage') ?? canvas.parentElement
  const coachEl = stage?.querySelector('[data-testid="coach-mark"]')
  const coachBox = coachEl?.getBoundingClientRect()
  if (coachBox && coachBox.width > 0 && coachBox.height > 0) boxes.push(coachBox)
  return boxes
}

function declutter() {
  const canvas = flow.vueFlowRef.value
  if (!canvas) return
  const nodes = [...canvas.querySelectorAll<HTMLElement>('.overview-node')].filter((n) => n.querySelector(':scope > .aside'))
  nodes.forEach((n) => {
    n.removeAttribute('data-label-hidden')
    n.removeAttribute('data-label-flip')
    n.style.removeProperty('--label-nudge-x')
    n.style.removeProperty('--label-nudge-y')
  })

  const desktop = canvas.clientWidth >= 640
  // Desktop: flip label side when the painted box still hits another disc/label; then hide residuals.
  if (desktop) {
    const discs = nodes.map((n) => ({
      id: n.dataset.nodeId ?? '',
      nucleus: n.classList.contains('is-nucleus'),
      box: (n.querySelector('.kind-mark--disc') ?? n.querySelector('.kind-mark') ?? n).getBoundingClientRect()
    }))
    for (const n of nodes) {
      if (n.classList.contains('is-nucleus')) continue
      const aside = n.querySelector<HTMLElement>(':scope > .aside')
      if (!aside) continue
      const label = aside.getBoundingClientRect()
      const ownId = n.dataset.nodeId ?? ''
      const hitsDisc = discs.some((d) => d.id !== ownId && hitRect(label, d.box))
      const hitsLabel = nodes.some((other) => {
        if (other === n || other.classList.contains('is-nucleus')) return false
        if (other.hasAttribute('data-label-hidden')) return false
        const o = other.querySelector<HTMLElement>(':scope > .aside')?.getBoundingClientRect()
        return o ? hitRect(label, o) : false
      })
      if (!hitsDisc && !hitsLabel) continue
      const flippingToStart = !aside.classList.contains('aside--start')
      n.setAttribute('data-label-flip', flippingToStart ? 'start' : 'end')
    }
    // Force layout so flipped asides reflow before the residual check.
    void canvas.offsetWidth
    for (const n of nodes) {
      if (n.classList.contains('is-nucleus')) continue
      const aside = n.querySelector<HTMLElement>(':scope > .aside')
      if (!aside) continue
      const label = aside.getBoundingClientRect()
      const ownId = n.dataset.nodeId ?? ''
      const collisions = () => {
        const box = aside.getBoundingClientRect()
        return (
          discs.some((d) => d.id !== ownId && hitRect(box, d.box)) ||
          nodes.some((other) => {
            if (other === n || other.classList.contains('is-nucleus')) return false
            if (other.hasAttribute('data-label-hidden')) return false
            const o = other.querySelector<HTMLElement>(':scope > .aside')?.getBoundingClientRect()
            return o ? hitRect(box, o) : false
          })
        )
      }
      if (!collisions()) continue
      if (props.reserveZoomPad) {
        const previous = n.getAttribute('data-label-flip')
        let placed = false
        for (const place of ['below', 'above'] as const) {
          n.setAttribute('data-label-flip', place)
          void canvas.offsetWidth
          if (!collisions()) {
            placed = true
            break
          }
        }
        if (placed) continue
        if (previous) n.setAttribute('data-label-flip', previous)
        else n.removeAttribute('data-label-flip')
        void canvas.offsetWidth
      }
      n.setAttribute('data-label-hidden', 'true')
    }
    if (props.reserveZoomPad || props.hideOverlappingRing1) {
      const overlayBoxes = overlayScreenBoxes(canvas)
      for (const n of nodes) {
        if (n.classList.contains('is-nucleus')) continue
        const aside = n.querySelector<HTMLElement>(':scope > .aside')
        if (!aside || n.hasAttribute('data-label-hidden')) continue
        const label = aside.getBoundingClientRect()
        if (!overlayBoxes.some((box) => hitRect(label, box, 4))) continue
        const previous = n.getAttribute('data-label-flip')
        n.setAttribute('data-label-flip', 'below')
        void canvas.offsetWidth
        const flipped = aside.getBoundingClientRect()
        const hitsOverlay = overlayBoxes.some((box) => hitRect(flipped, box, 4))
        const hitsDisc = discs.some((d) => d.id !== (n.dataset.nodeId ?? '') && hitRect(flipped, d.box))
        const hitsLabel = nodes.some((other) => {
          if (other === n || other.classList.contains('is-nucleus')) return false
          if (other.hasAttribute('data-label-hidden')) return false
          const o = other.querySelector<HTMLElement>(':scope > .aside')?.getBoundingClientRect()
          return o ? hitRect(flipped, o) : false
        })
        if (hitsOverlay || hitsDisc || hitsLabel) {
          if (previous) n.setAttribute('data-label-flip', previous)
          else n.removeAttribute('data-label-flip')
          void canvas.offsetWidth
          n.setAttribute('data-label-hidden', 'true')
        }
      }
    }
    return
  }

  // Phone: try end/start/above/below at painted scale; keep nucleus + findings + ring-1.
  const centre = canvas.querySelector('.ring-guides')?.getBoundingClientRect()
  const bounds = canvas.getBoundingClientRect()
  const edgePad = 6
  const cx = centre ? (centre.left + centre.right) / 2 : (bounds.left + bounds.right) / 2

  const labelRect = (n: HTMLElement) => {
    const el = n.querySelector<HTMLElement>(':scope > .aside')
    return el?.getBoundingClientRect() ?? null
  }

  const discBoxOf = (n: HTMLElement) =>
    (n.querySelector('.kind-mark--disc') ?? n.querySelector('.kind-mark') ?? n).getBoundingClientRect()

  /** Nucleus name+ENTRY POINT stack is an obstacle (not just the disc). */
  const obstacles = () => {
    const list: { id: string; box: DOMRect; kind: 'disc' | 'label' }[] = []
    for (const n of nodes) {
      list.push({ id: n.dataset.nodeId ?? '', box: discBoxOf(n), kind: 'disc' })
      if (n.classList.contains('is-nucleus')) {
        const stack = n.querySelector<HTMLElement>(':scope > .aside')
        if (stack) list.push({ id: `${n.dataset.nodeId}::nucleus-label`, box: stack.getBoundingClientRect(), kind: 'label' })
      } else if (!n.hasAttribute('data-label-hidden')) {
        const lab = labelRect(n)
        if (lab) list.push({ id: `${n.dataset.nodeId}::label`, box: lab, kind: 'label' })
      }
    }
    return list
  }

  const overlayBoxes = (props.reserveZoomPad || props.hideOverlappingRing1) ? overlayScreenBoxes(canvas) : []
  const outside = (r: DOMRect) =>
    r.left < bounds.left + edgePad ||
    r.right > bounds.right - edgePad ||
    r.top < bounds.top + edgePad ||
    r.bottom > bounds.bottom - edgePad ||
    overlayBoxes.some((box) => hitRect(r, box, 4))

  const conflicts = (n: HTMLElement, box: DOMRect, obs: ReturnType<typeof obstacles>) => {
    if (outside(box)) return true
    const ownId = n.dataset.nodeId ?? ''
    return obs.some((o) => {
      if (o.id === ownId || o.id.startsWith(`${ownId}::`)) return false
      return hitRect(box, o.box)
    })
  }

  const isMust = (n: HTMLElement) => {
    if (n.classList.contains('is-nucleus') || n.classList.contains('is-selected')) return true
    if (n.dataset.nbhGroup === 'true') return true
    if (props.hideOverlappingRing1) return false
    if (Number(n.dataset.depth ?? NaN) === 1) return true
    if (n.dataset.hasFindings === 'true') return true
    return false
  }

  const placementsFor = (n: HTMLElement): Array<'end' | 'start' | 'above' | 'below'> => {
    const disc = discBoxOf(n)
    const west = (disc.left + disc.right) / 2 < cx
    const cy0 = centre ? (centre.top + centre.bottom) / 2 : (bounds.top + bounds.bottom) / 2
    const south = (disc.top + disc.bottom) / 2 >= cy0
    // Prefer outward vertical first so neighbours don't all pick the same side.
    const vertical = south ? (['below', 'above'] as const) : (['above', 'below'] as const)
    return west
      ? [vertical[0], vertical[1], 'end', 'start']
      : ['end', vertical[0], vertical[1], 'start']
  }

  const unplacedFindings: string[] = []

  // Priority order: findings + ring-1 first so they claim space; outer later.
  const ordered = [...nodes]
    .filter((n) => !n.classList.contains('is-nucleus'))
    .sort((a, b) => {
      const score = (n: HTMLElement) => {
        if (n.dataset.hasFindings === 'true') return 0
        if (n.dataset.nbhGroup === 'true') return 0.5
        if (Number(n.dataset.depth ?? NaN) === 1) return 1
        return 2 + Number(n.dataset.depth ?? 9)
      }
      return score(a) - score(b)
    })

  for (const n of ordered) {
    n.removeAttribute('data-label-hidden')
    n.style.removeProperty('--label-nudge-x')
    n.style.removeProperty('--label-nudge-y')
    let placed = false
    const nudges = [0, -12, 12, -24, 24]
    outer: for (const place of placementsFor(n)) {
      n.setAttribute('data-label-flip', place)
      for (const nudge of nudges) {
        if (place === 'above' || place === 'below') {
          n.style.setProperty('--label-nudge-x', `${nudge}px`)
          n.style.removeProperty('--label-nudge-y')
        } else {
          n.style.setProperty('--label-nudge-y', `${nudge}px`)
          n.style.removeProperty('--label-nudge-x')
        }
        void canvas.offsetWidth
        const box = labelRect(n)
        if (!box) continue
        const obs = obstacles().filter((o) => o.id !== `${n.dataset.nodeId}::label`)
        if (!conflicts(n, box, obs)) {
          placed = true
          break outer
        }
      }
    }
    if (placed) continue
    if (isMust(n)) {
      if (n.dataset.hasFindings === 'true') {
        unplacedFindings.push(n.dataset.nodeId ?? n.querySelector('.label')?.textContent ?? '?')
      }
      // Last resort keep: outward vertical with zero nudge.
      const disc = discBoxOf(n)
      const cy0 = centre ? (centre.top + centre.bottom) / 2 : (bounds.top + bounds.bottom) / 2
      const south = (disc.top + disc.bottom) / 2 >= cy0
      n.setAttribute('data-label-flip', south ? 'below' : 'above')
      n.style.removeProperty('--label-nudge-x')
      n.style.removeProperty('--label-nudge-y')
      void canvas.offsetWidth
      continue
    }
    n.removeAttribute('data-label-flip')
    n.style.removeProperty('--label-nudge-x')
    n.style.removeProperty('--label-nudge-y')
    n.setAttribute('data-label-hidden', 'true')
  }

  // Final pass: hide only non-must that still conflict/clip after must-keep settled.
  void canvas.offsetWidth
  const obsFinal = obstacles()
  for (const n of ordered) {
    if (isMust(n) || n.hasAttribute('data-label-hidden')) continue
    const box = labelRect(n)
    if (!box) continue
    const obs = obsFinal.filter((o) => o.id !== `${n.dataset.nodeId}::label`)
    if (conflicts(n, box, obs)) n.setAttribute('data-label-hidden', 'true')
  }

  if (unplacedFindings.length > 0) {
    canvas.setAttribute('data-unplaced-findings', unplacedFindings.join(','))
  } else {
    canvas.removeAttribute('data-unplaced-findings')
  }
}

let fitGen = 0
/** Signature already settled by a Back restore or a kept anchor: a late nodes-initialized must not refit it. */
let settledSignature = ''
let restoredToken = 0
let keptToken = 0
/** Viewport the last automatic fit produced; anything else means the person zoomed or panned. */
let lastFit: { x: number; y: number; zoom: number } | null = null

function sameViewport(a: { x: number; y: number; zoom: number } | null, b: { x: number; y: number; zoom: number }) {
  return Boolean(a) && Math.abs(a!.x - b.x) < 1 && Math.abs(a!.y - b.y) < 1 && Math.abs(a!.zoom - b.zoom) < 1e-3
}

function markScreenPoint(id: string): { x: number; y: number } | null {
  const canvas = flow.vueFlowRef.value
  const mark = canvas?.querySelector(`.overview-node[data-node-id="${CSS.escape(id)}"] .kind-mark`)
  if (!canvas || !mark) return null
  const box = canvas.getBoundingClientRect()
  const r = mark.getBoundingClientRect()
  return { x: (r.left + r.right) / 2 - box.left, y: (r.top + r.bottom) / 2 - box.top }
}

/** Remember where a node sits before the graph changes (expand / collapse). */
let anchorBefore: { token: number; id: string; point: { x: number; y: number } } | null = null
watch(
  () => props.keepView?.token,
  () => {
    const keep = props.keepView
    if (!keep) return
    const point = markScreenPoint(keep.id)
    const moved = !sameViewport(lastFit, flow.viewport.value)
    anchorBefore = point && moved ? { token: keep.token, id: keep.id, point } : null
  },
  { flush: 'sync' }
)

async function fit() {
  settledSignature = ''
  const gen = ++fitGen
  const stale = () => gen !== fitGen
  const restore = props.restore
  if (restore && restore.token !== restoredToken && restore.viewport) {
    // Consumed only once applied: a fit that starts meanwhile (nodes initialised) takes this branch too.
    const viewport = restore.viewport
    await frame(); await frame()
    if (stale()) return
    restoredToken = restore.token
    await flow.setViewport(viewport, { duration: 0 })
    settledSignature = props.signature
    lastFit = null
    await frame(); await frame()
    if (stale()) return
    declutter()
    return
  }
  const anchor = anchorBefore
  if (anchor && props.keepView?.token === anchor.token && anchor.token !== keptToken) {
    await frame(); await frame()
    if (stale()) return
    keptToken = anchor.token
    anchorBefore = null
    const now = markScreenPoint(anchor.id)
    if (now) {
      const vp = flow.viewport.value
      await flow.setViewport({ zoom: vp.zoom, x: vp.x + anchor.point.x - now.x, y: vp.y + anchor.point.y - now.y }, { duration: 0 })
      settledSignature = props.signature
      await frame(); await frame()
      if (stale()) return
      declutter()
      return
    }
  }
  if (!fitOnce()) {
    // Unreserved VueFlow fitView ignores the toolbar reserve and would slide discs under it.
    // Only use it as a last resort in the web app, never in the embedded viewer.
    if (!props.reserveZoomPad && !stale()) {
      void flow.fitView({ duration: 0, padding: props.padding ?? 0.2, maxZoom: 1.15 })
    }
  }
  await frame(); await frame()
  if (stale()) return
  fitOnce()
  await frame(); await frame()
  if (stale()) return
  fitOnce()
  await frame(); await frame()
  if (stale()) return
  declutter()
  // Second pass: fit the ring bounds plus only the labels that stay visible, then re-place labels.
  await frame()
  if (stale()) return
  fitOnce()
  await frame(); await frame()
  if (stale()) return
  declutter()
  lastFit = { ...flow.viewport.value }
}

let fitQueued = false
function queueFit() {
  if (fitQueued) return
  fitQueued = true
  queueMicrotask(() => {
    fitQueued = false
    void fit()
  })
}

function getViewport() {
  return { ...flow.viewport.value }
}

watch(
  () => flow.viewport.value.zoom,
  (zoom) => {
    const el = flow.vueFlowRef.value
    if (!el || !(zoom > 0)) return
    // Phone raises the mark-scale cap so labels stay ≈11px / discs ≥20px; desktop unchanged (a3695cd).
    const phone = isPhoneCanvas(el.clientWidth)
    const { mark, disc } = markScaleForZoom(zoom, phone, props.reserveZoomPad ? EMBEDDED_MAX_MARK_SCALE : undefined)
    el.style.setProperty('--graph-mark-scale', mark.toFixed(3))
    el.style.setProperty('--graph-disc-scale', disc.toFixed(3))
    scheduleDeclutter()
  },
  { immediate: true }
)

watch(() => props.signature, () => queueFit())
watch(() => props.restore?.token, () => queueFit())
flow.onNodeClick(() => scheduleDeclutter())
flow.onNodesInitialized(() => {
  if (props.signature === settledSignature) return
  queueFit()
})
defineExpose({ fit, getViewport })
</script>

<template>
  <span class="fit-frame" aria-hidden="true"></span>
</template>

<style scoped>
.fit-frame { display: none; }
</style>
