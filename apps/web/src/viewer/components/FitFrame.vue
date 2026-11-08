<script setup lang="ts">
import { useVueFlow } from '@vue-flow/core'
import { watch } from 'vue'
import { RADIAL_RING_GAP } from '../overview'
import { graphOverlaps, radialFitViewport, type FitBox } from '../radial-fit'

const props = defineProps<{ signature: string; duration?: number; padding?: number; ringCount?: number; focusIds?: string[] }>()
const flow = useVueFlow()

/** Target on-screen label size (px) and the cap on how far marks may grow in flow units. */
const LABEL_PX = 11.5
const BASE_LABEL_PX = 11
const MAX_MARK_SCALE = 4.2

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
  canvas.querySelectorAll<HTMLElement>('.overview-node').forEach((node) => {
    const id = node.dataset.nodeId ?? ''
    if (focus.size > 0 && !focus.has(id)) return
    boxes.push(toFlow(node.getBoundingClientRect()))
    const aside = node.querySelector<HTMLElement>(':scope > .aside')
    if (aside) boxes.push(toFlow(aside.getBoundingClientRect()))
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
    ringRadius: focus.size === 0 && (props.ringCount ?? 0) > 0 ? RADIAL_RING_GAP * 0.5 : null,
    padding: props.padding ?? 0.2,
    center: ringCentre(canvas)
  }
  let viewport = radialFitViewport(input)
  if (measured.coach && graphOverlaps(viewport, boxes, measured.coach)) {
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
function declutter() {
  const canvas = flow.vueFlowRef.value
  if (!canvas) return
  const nodes = [...canvas.querySelectorAll<HTMLElement>('.overview-node')].filter((n) => n.querySelector(':scope > .aside'))
  nodes.forEach((n) => n.removeAttribute('data-label-hidden'))
  const centre = canvas.querySelector('.ring-guides')?.getBoundingClientRect()
  const discs = nodes.map((n) => ({ node: n, rect: (n.querySelector('.kind-mark') ?? n).getBoundingClientRect() }))
  const rank = (n: HTMLElement) => {
    if (n.classList.contains('is-nucleus')) return -2
    if (n.classList.contains('is-selected')) return -1
    const r = n.getBoundingClientRect()
    const d = centre ? Math.hypot(r.left - centre.left, r.top - centre.top) : 0
    return (n.querySelector('.severity-chips') ? 0 : 1e5) + d
  }
  const placed: DOMRect[] = []
  const hit = (a: DOMRect, b: DOMRect, pad = 2) =>
    a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad
  for (const node of [...nodes].sort((a, b) => rank(a) - rank(b))) {
    const label = node.querySelector<HTMLElement>(':scope > .aside')!.getBoundingClientRect()
    const must = node.classList.contains('is-nucleus') || node.classList.contains('is-selected')
    const clash = placed.some((p) => hit(label, p)) || discs.some((d) => d.node !== node && hit(label, d.rect))
    if (clash && !must) node.setAttribute('data-label-hidden', 'true')
    else placed.push(label)
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
}

watch(
  () => flow.viewport.value.zoom,
  (zoom) => {
    const el = flow.vueFlowRef.value
    if (!el || !(zoom > 0)) return
    const scale = Math.min(MAX_MARK_SCALE, Math.max(1, LABEL_PX / (BASE_LABEL_PX * zoom)))
    el.style.setProperty('--graph-mark-scale', scale.toFixed(3))
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
