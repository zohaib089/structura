<script setup lang="ts">
import { useVueFlow } from '@vue-flow/core'
import { watch } from 'vue'
import { RADIAL_RING_GAP } from '../overview'
import { graphOverlaps, radialFitViewport } from '../radial-fit'

const props = defineProps<{ signature: string; duration?: number; padding?: number; ringCount?: number; focusIds?: string[] }>()
const flow = useVueFlow()

/** Measured overlay reserve: the floating toolbar on top, the coach card on the bottom (in canvas px). */
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

function fit() {
  const canvas = flow.vueFlowRef.value
  const focus = new Set(props.focusIds ?? [])
  const nodes = flow.getNodes.value
    .filter((node) => node.id !== '__radial-guides__' && (focus.size === 0 || focus.has(node.id)))
    .map((node) => ({ x: node.computedPosition.x, y: node.computedPosition.y, width: node.dimensions.width, height: node.dimensions.height }))
  if (!canvas || nodes.length === 0 || canvas.clientWidth === 0) {
    void flow.fitView({ duration: props.duration ?? 0, padding: props.padding ?? 0.2, maxZoom: 1.15 })
    return
  }
  const measured = overlays(canvas)
  const input = {
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    reserve: { top: measured.top, bottom: 0 },
    nodes,
    ringRadius: focus.size === 0 && (props.ringCount ?? 0) > 0 ? RADIAL_RING_GAP * 0.5 : null,
    padding: props.padding ?? 0.2
  }
  let viewport = radialFitViewport(input)
  // Only give up height to the guide card when the fitted graph would actually sit under it.
  if (measured.coach && graphOverlaps(viewport, nodes, measured.coach)) {
    viewport = radialFitViewport({ ...input, reserve: { top: measured.top, bottom: measured.coach.bottom } })
  }
  void flow.setViewport(viewport, { duration: props.duration ?? 0 })
}

/**
 * Semantic zoom for marks: when the fit zooms far out (dense graphs), discs and labels grow in flow
 * units so they stay legible on screen (capped), like the landing radial; at 1x they are unchanged.
 */
watch(
  () => flow.viewport.value.zoom,
  (zoom) => {
    const el = flow.vueFlowRef.value
    if (!el || !(zoom > 0)) return
    el.style.setProperty('--graph-mark-scale', String(Math.min(3, Math.max(1, 0.8 / zoom))))
  },
  { immediate: true }
)

watch(() => props.signature, () => fit())
flow.onNodesInitialized(() => fit())
defineExpose({ fit })
</script>

<template>
  <span class="fit-frame" aria-hidden="true"></span>
</template>

<style scoped>
.fit-frame { display: none; }
</style>
