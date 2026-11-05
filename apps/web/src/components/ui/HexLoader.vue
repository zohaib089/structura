<script lang="ts">
export type HexLoaderSize = 'sm' | 'md' | 'lg'
export const HEX_LOADER_PX: Record<HexLoaderSize, number> = { sm: 16, md: 24, lg: 40 }
</script>

<script setup lang="ts">
/**
 * HexLoader - the Nucleus mark as a CSS-only loader (spec: design/loading-and-toasts.md §1.1).
 * Ring sweep rotates 360° / 1.2s linear, the amber core pulses 1 → 1.08 → 1 / 1.2s ease-in-out.
 * Sizes: sm 16 (inline, buttons) · md 24 (panels, toasts) · lg 40 (app boot).
 * Flicker guard: appears only after `delay` ms (200) and, once shown, stays `minVisible` ms (400).
 * Label: visible text by default; with `hide-label` the text is screen-reader only and the root
 * carries aria-label. Under prefers-reduced-motion the mark is static and the text is always visible.
 * `inline` is for async buttons: decorative, the button's own text is the status.
 */
import { computed, toRef } from 'vue'
import { useDelayedVisible } from '../../composables/useDelayedVisible'
import BrandMark from '../brand/BrandMark.vue'

const props = withDefaults(
  defineProps<{
    size?: HexLoaderSize
    /** Accessible / visible text, e.g. "Loading projects…". */
    label?: string
    /** Keep the text for assistive tech only (hidden visually unless the user prefers reduced motion). */
    hideLabel?: boolean
    /** Whether loading is in progress. Toggle this instead of v-if so the delay/minimum rules apply. */
    active?: boolean
    /** ms before first paint. Pass 0 to show immediately. */
    delay?: number
    /** ms the loader stays once shown. */
    minVisible?: number
    /** Stack the mark above the text (boot / full-page). */
    stacked?: boolean
    /**
     * Decorative use inside a control that already shows its own visible text (async buttons):
     * the root is aria-hidden and no label is rendered.
     */
    inline?: boolean
  }>(),
  {
    size: 'md',
    label: 'Loading…',
    hideLabel: false,
    active: true,
    delay: 200,
    minVisible: 400,
    stacked: false,
    inline: false
  }
)

const visible = useDelayedVisible(toRef(props, 'active'), {
  delay: props.delay,
  minVisible: props.minVisible
})
const px = computed(() => HEX_LOADER_PX[props.size])
</script>

<template>
  <span
    v-if="visible"
    class="hex-loader"
    :class="[`hex-loader--${size}`, { 'hex-loader--stacked': stacked }]"
    :role="inline ? undefined : 'status'"
    :aria-hidden="inline ? 'true' : undefined"
    :aria-label="hideLabel && !inline ? label : undefined"
  >
    <BrandMark class="hex-loader__mark" :size="px" animated />
    <span v-if="!inline" class="hex-loader__label" :class="{ 'hex-loader__label--hidden': hideLabel }">{{ label }}</span>
  </span>
</template>

<style scoped>
.hex-loader {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}
.hex-loader--lg {
  gap: var(--space-3);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}
.hex-loader--stacked {
  flex-direction: column;
}
.hex-loader__label--hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* CSS-only motion; svg-origin keeps both transforms centred on the 64 viewBox. */
.hex-loader :deep(.nucleus-sweep),
.hex-loader :deep(.nucleus-core) {
  transform-origin: 32px 32px;
}
.hex-loader :deep(.nucleus-sweep) {
  animation: hex-loader-rotate 1.2s linear infinite;
}
.hex-loader :deep(.nucleus-core) {
  animation: hex-loader-pulse 1.2s ease-in-out infinite;
}

@keyframes hex-loader-rotate {
  to {
    transform: rotate(360deg);
  }
}
@keyframes hex-loader-pulse {
  50% {
    transform: scale(1.08);
  }
}

/* Reduced motion: static Nucleus mark, visible text is required. */
@media (prefers-reduced-motion: reduce) {
  .hex-loader :deep(.nucleus-sweep),
  .hex-loader :deep(.nucleus-core) {
    animation: none;
  }
  .hex-loader :deep(.nucleus-sweep) {
    display: none;
  }
  .hex-loader__label--hidden {
    position: static;
    inline-size: auto;
    block-size: auto;
    overflow: visible;
    clip-path: none;
    white-space: normal;
  }
}
</style>
