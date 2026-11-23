<script setup lang="ts">
import { Panel, useVueFlow } from '@vue-flow/core'
import { zoomAnchor, zoomAroundPoint } from '../graph-history'
import { prefersReducedMotion } from '../motion'
import Tip from './Tip.vue'

const props = defineProps<{ zoomIn: string; zoomOut: string; zoomFit: string; zoomFitShort?: string; fit?: () => void }>()

const flow = useVueFlow()

/** Step per button press / key press. */
const ZOOM_STEP = 1.25

/** Selected node's disc centre in canvas px, or null when nothing is selected. */
function selectedPoint(canvas: HTMLElement): { x: number; y: number } | null {
  const mark = canvas.querySelector('.overview-node.is-selected .kind-mark')
  if (!mark) return null
  const box = canvas.getBoundingClientRect()
  const r = mark.getBoundingClientRect()
  return { x: (r.left + r.right) / 2 - box.left, y: (r.top + r.bottom) / 2 - box.top }
}

/** Zoom around the selected node (if on screen) or the centre, so the view keeps its place. */
function zoomBy(factor: number) {
  const canvas = flow.vueFlowRef.value
  if (!canvas) return
  const anchor = zoomAnchor({ width: canvas.clientWidth, height: canvas.clientHeight }, selectedPoint(canvas))
  const before = selectedPoint(canvas)
  const next = zoomAroundPoint(flow.viewport.value, anchor, factor, flow.minZoom.value, flow.maxZoom.value)
  void Promise.resolve(flow.setViewport(next, { duration: prefersReducedMotion() ? 0 : 160 })).then(() => {
    if (before) requestAnimationFrame(() => settleAnchor(canvas, before))
  })
}

/**
 * Low zoom raises --graph-mark-scale, which grows labels and can shift the disc inside its node box.
 * After the zoom lands, pan by that drift so the selected disc stays exactly where it was.
 */
function settleAnchor(canvas: HTMLElement, before: { x: number; y: number }) {
  const after = selectedPoint(canvas)
  if (!after) return
  const dx = before.x - after.x
  const dy = before.y - after.y
  if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) return
  const vp = flow.viewport.value
  void flow.setViewport({ x: vp.x + dx, y: vp.y + dy, zoom: vp.zoom }, { duration: 0 })
}

function fit() {
  if (props.fit) props.fit()
  else void flow.fitView({ duration: 0, padding: 0.2, maxZoom: 1.15 })
}

defineExpose({ zoomBy, ZOOM_STEP })
</script>

<template>
  <Panel position="bottom-right" class="zoom">
    <Tip side="start" :text="zoomIn"><button type="button" data-testid="zoom-in" :aria-label="zoomIn" @click="zoomBy(ZOOM_STEP)">+</button></Tip>
    <Tip side="start" :text="zoomOut"><button type="button" data-testid="zoom-out" :aria-label="zoomOut" @click="zoomBy(1 / ZOOM_STEP)">−</button></Tip>
    <Tip side="start" :text="zoomFit"><button type="button" data-testid="zoom-fit" :aria-label="zoomFit" @click="fit()">{{ zoomFitShort || zoomFit }}</button></Tip>
  </Panel>
</template>

<style scoped>
.zoom {
  display: flex;
  flex-direction: column;
  overflow: visible;
  /* G4c shared control style: 1px control border, 8px floating radius, raised surface. */
  border: 1px solid var(--viewer-control-border, var(--color-border));
  border-radius: var(--r-md);
  background: var(--color-surface-raised);
  /* Above the canvas vignette, so the labels keep full contrast in the dark theme. */
  z-index: calc(var(--z-graph-controls, 10) + 1);
}
.zoom :deep(.tip) { display: flex; }
button {
  /* G09: the symbol / word sits in the middle of the 44px target. */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  inline-size: 100%;
  min-inline-size: var(--viewer-control-size, 2.75rem);
  min-block-size: var(--viewer-hit-target, 2.75rem);
  margin: 0;
  padding: 0;
  appearance: none;
  border: 0;
  /* One hairline between buttons; none above the first. */
  border-block-start: 1px solid var(--viewer-control-border, var(--color-border));
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
}
.zoom :deep(.tip:first-child) button {
  border-block-start: 0;
  border-start-start-radius: var(--r-md);
  border-start-end-radius: var(--r-md);
}
.zoom :deep(.tip:last-child) button {
  border-end-start-radius: var(--r-md);
  border-end-end-radius: var(--r-md);
}
/* Same surface states as the floating toolbar buttons, in both themes. */
button:hover { background: color-mix(in srgb, var(--color-text-primary) 8%, var(--color-surface-raised)); }
button:focus-visible {
  outline: none;
  position: relative;
  z-index: 1;
  box-shadow: var(--focus-ring);
}
</style>
