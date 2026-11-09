<script setup lang="ts">
import { useVueFlow } from '@vue-flow/core'
import { watch } from 'vue'
import { RADIAL_RING_GAP } from '../overview'
import { labelsToHide, type DeclutterBox } from '../label-declutter'
import { radialFitViewport, type FitBox } from '../radial-fit'
import { isPhoneCanvas, markScaleForZoom } from '../graph-mark-scale'

const props = defineProps<{ signature: string; duration?: number; padding?: number; ringCount?: number; focusIds?: string[] }>()
const flow = useVueFlow()

function overlays(canvas: HTMLElement) {
  const box = canvas.getBoundingClientRect()
  const stage = canvas.closest('.stage') ?? canvas.parentElement
  const bar = stage?.querySelector('.floating-bar')?.getBoundingClientRect()
  const coach = stage?.querySelector('[data-testid="coach-mark"]')?.getBoundingClientRect()
  return {
    top: bar && bar.height > 0 ? Math.max(0, bar.bottom - box.top) : 0,
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
  // Narrow canvases fit ring + marks only (labels are screen-constant, so counting them shrinks the
  // graph without limit); declutter then hides labels that would leave the canvas.
  const withLabels = canvas.clientWidth >= 640
  canvas.querySelectorAll<HTMLElement>('.overview-node').forEach((node) => {
    const id = node.dataset.nodeId ?? ''
    if (focus.size > 0 && !focus.has(id)) return
    boxes.push(toFlow(node.getBoundingClientRect()))
    const aside = node.querySelector<HTMLElement>(':scope > .aside')
    if (withLabels && aside && !node.hasAttribute('data-label-hidden')) boxes.push(toFlow(aside.getBoundingClientRect()))
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
  const input = {
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    reserve: { top: measured.top, bottom: 0 },
    nodes: boxes,
    ringRadius: focus.size === 0 && (props.ringCount ?? 0) > 0 ? RADIAL_RING_GAP : null,
    padding: props.padding ?? 0.2,
    center: ringCentre(canvas)
  }
  let viewport = radialFitViewport(input)
  // Always leave room for the coach when it is open so ring nodes are never under it.
  if (measured.coach) {
    viewport = radialFitViewport({ ...input, reserve: { top: measured.top, bottom: measured.coach.bottom } })
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

function declutter() {
  const canvas = flow.vueFlowRef.value
  if (!canvas) return
  const nodes = [...canvas.querySelectorAll<HTMLElement>('.overview-node')].filter((n) => n.querySelector(':scope > .aside'))
  nodes.forEach((n) => {
    n.removeAttribute('data-label-hidden')
    n.removeAttribute('data-label-flip')
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
      const still =
        discs.some((d) => d.id !== ownId && hitRect(label, d.box)) ||
        nodes.some((other) => {
          if (other === n || other.classList.contains('is-nucleus')) return false
          if (other.hasAttribute('data-label-hidden')) return false
          const o = other.querySelector<HTMLElement>(':scope > .aside')?.getBoundingClientRect()
          return o ? hitRect(label, o) : false
        })
      if (still) n.setAttribute('data-label-hidden', 'true')
    }
    return
  }

  const centre = canvas.querySelector('.ring-guides')?.getBoundingClientRect()
  const bounds = canvas.getBoundingClientRect()
  const boxes: DeclutterBox[] = nodes.map((n) => {
    const r = n.getBoundingClientRect()
    const disc = (n.querySelector('.kind-mark') ?? n).getBoundingClientRect()
    const label = n.querySelector<HTMLElement>(':scope > .aside')!.getBoundingClientRect()
    const depth = Number(n.dataset.depth ?? n.getAttribute('data-depth') ?? NaN)
    return {
      id: n.dataset.nodeId ?? '',
      label: { left: label.left, right: label.right, top: label.top, bottom: label.bottom },
      disc: { left: disc.left, right: disc.right, top: disc.top, bottom: disc.bottom },
      nucleus: n.classList.contains('is-nucleus'),
      selected: n.classList.contains('is-selected'),
      hasFindings: Boolean(n.querySelector('.severity-chips')) || n.dataset.hasFindings === 'true',
      ring1: depth === 1,
      distance: centre ? Math.hypot(r.left - centre.left, r.top - centre.top) : 0
    }
  })
  // Phone: hide colliding outer labels rather than shrinking text; keep nucleus / ring-1 / findings.
  const hidden = labelsToHide(
    boxes,
    { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
    { keepRing1: true, keepFindings: true }
  )
  for (const n of nodes) {
    const id = n.dataset.nodeId ?? ''
    if (hidden.has(id)) n.setAttribute('data-label-hidden', 'true')
  }
}

async function fit() {
  if (!fitOnce()) {
    void flow.fitView({ duration: 0, padding: props.padding ?? 0.2, maxZoom: 1.15 })
  }
  await frame(); await frame()
  fitOnce()
  await frame(); await frame()
  fitOnce()
  await frame(); await frame()
  declutter()
  // Second pass: fit the ring bounds plus only the labels that stay visible, then re-place labels.
  await frame()
  fitOnce()
  await frame(); await frame()
  declutter()
}

watch(
  () => flow.viewport.value.zoom,
  (zoom) => {
    const el = flow.vueFlowRef.value
    if (!el || !(zoom > 0)) return
    // Phone raises the mark-scale cap so labels stay ≈11px / discs ≥20px; desktop unchanged (a3695cd).
    const phone = isPhoneCanvas(el.clientWidth)
    const { mark, disc } = markScaleForZoom(zoom, phone)
    el.style.setProperty('--graph-mark-scale', mark.toFixed(3))
    el.style.setProperty('--graph-disc-scale', disc.toFixed(3))
    scheduleDeclutter()
  },
  { immediate: true }
)

watch(() => props.signature, () => void fit())
flow.onNodeClick(() => scheduleDeclutter())
flow.onNodesInitialized(() => void fit())
defineExpose({ fit })
</script>

<template>
  <span class="fit-frame" aria-hidden="true"></span>
</template>

<style scoped>
.fit-frame { display: none; }
</style>
