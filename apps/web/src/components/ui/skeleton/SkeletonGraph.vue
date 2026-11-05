<script lang="ts">
const RING_RADII = [16, 30, 44] as const
// Ghost nodes sit on the rings: [ring index, angle in degrees]. Fixed so renders are stable.
const GHOSTS: ReadonlyArray<readonly [number, number]> = [
  [0, 20], [0, 140], [0, 260],
  [1, 50], [1, 130], [1, 210], [1, 310],
  [2, 15], [2, 95], [2, 175], [2, 250], [2, 330]
]
const NODES = GHOSTS.map(([ring, deg]) => {
  const r = RING_RADII[ring] ?? 16
  const rad = (deg * Math.PI) / 180
  return { cx: +(50 + r * Math.cos(rad)).toFixed(2), cy: +(50 + r * Math.sin(rad)).toFixed(2), r: ring === 0 ? 2.4 : 2 }
})
</script>

<script setup lang="ts">
/**
 * SkeletonGraph - faint concentric rings + ghost nodes (loading-and-toasts.md §1.3).
 * Fills its container; never a spinner over the canvas. Render real floating bars / status bar around it.
 * Slot: optional status content pinned to the bottom (e.g. HexLoader "Laying out graph…").
 */
withDefaults(defineProps<{ label?: string }>(), { label: 'Loading graph' })
</script>

<template>
  <div class="sk-graph" role="status" aria-busy="true" :aria-label="label">
    <svg class="sk-graph__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <circle v-for="r in RING_RADII" :key="r" cx="50" cy="50" :r="r" class="sk-graph__ring" />
      <circle cx="50" cy="50" r="3.2" class="sk-graph__node sk-graph__node--root" />
      <circle v-for="(n, i) in NODES" :key="i" :cx="n.cx" :cy="n.cy" :r="n.r" class="sk-graph__node" />
    </svg>
    <div v-if="$slots.default" class="sk-graph__status"><slot /></div>
  </div>
</template>

<style scoped>
.sk-graph {
  position: relative;
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 18rem;
}
.sk-graph__svg {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
}
.sk-graph__ring {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.sk-graph__node {
  fill: var(--gray-5);
  opacity: 0.3;
}
.sk-graph__node--root {
  opacity: 0.4;
}
.sk-graph__status {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  display: flex;
  align-items: center;
  min-block-size: 2rem;
  padding: var(--space-1) var(--space-4);
  border-block-start: 1px solid var(--color-border);
  background: var(--color-surface);
}

@media (prefers-reduced-motion: no-preference) {
  .sk-graph__node {
    animation: sk-graph-pulse var(--duration-shimmer) ease-in-out infinite;
  }
}
@keyframes sk-graph-pulse {
  50% {
    opacity: 0.15;
  }
}
</style>
