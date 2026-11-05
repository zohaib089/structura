<script lang="ts">
let nucleusUid = 0
</script>

<script setup lang="ts">
/**
 * BrandMark - the "Nucleus" mark as an inline SVG (64 viewBox).
 * Geometry mirrors public/brand/mark-dark.svg (logo-final/NUCLEUS.md): soft rounded hex plate,
 * radial glow behind the core, inner ring, amber core and a specular highlight.
 * Colours come from the --nucleus-* tokens in variables.css, so the mark follows data-theme.
 * The name is NOT in the SVG: render the wordmark as live text from BRAND.wordmark next to it.
 *
 * Props
 *  - size:    number (px) | string (any CSS length). Default 32. Below 28px the ring is slightly heavier so it stays legible.
 *  - variant: 'auto' (navy plate + theme-aware ring/amber core) | 'mono' (currentColor only: outlined hex, ring, solid core)
 *  - title:   when set the SVG is role="img" with that accessible name; otherwise it is aria-hidden (decorative).
 *  - animated: adds the ring sweep arc and exposes .nucleus-ring / .nucleus-core hooks for HexLoader (CSS-only motion).
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ size?: number | string; variant?: 'auto' | 'mono'; title?: string; animated?: boolean }>(),
  { size: 32, variant: 'auto', title: undefined, animated: false }
)

const uid = `nucleus-glow-${++nucleusUid}`
const cssSize = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
const small = computed(() => typeof props.size === 'number' && props.size < 28)
const mono = computed(() => props.variant === 'mono')
const ringWidth = computed(() => (small.value ? 2.4 : 1.6))

// 64 grid; illustration geometry, not design tokens.
const HEX =
  'M28.7 3.91A6.6 6.6 0 0 1 35.3 3.91L54.68 15.09A6.6 6.6 0 0 1 57.98 20.81L57.98 43.19A6.6 6.6 0 0 1 54.68 48.91L35.3 60.09A6.6 6.6 0 0 1 28.7 60.09L9.32 48.91A6.6 6.6 0 0 1 6.02 43.19L6.02 20.81A6.6 6.6 0 0 1 9.32 15.09Z'
const RING_R = 14
const ARC = `${(2 * Math.PI * RING_R * 0.28).toFixed(2)} ${(2 * Math.PI * RING_R).toFixed(2)}`
</script>

<template>
  <svg
    class="brand-mark"
    :class="{ 'is-mono': mono, 'is-animated': animated }"
    viewBox="0 0 64 64"
    :width="cssSize"
    :height="cssSize"
    :role="title ? 'img' : undefined"
    :aria-hidden="title ? undefined : 'true'"
    focusable="false"
  >
    <title v-if="title">{{ title }}</title>
    <defs v-if="!mono">
      <radialGradient :id="uid" cx="50%" cy="45%" r="55%">
        <stop offset="0%" class="glow-stop" />
        <stop offset="100%" stop-color="transparent" />
      </radialGradient>
    </defs>

    <path :d="HEX" class="plate" stroke-linejoin="round" />
    <circle v-if="!mono" cx="32" cy="32" r="18" :fill="`url(#${uid})`" />
    <circle cx="32" cy="32" :r="RING_R" fill="none" class="nucleus-ring" :stroke-width="ringWidth" />
    <circle
      v-if="animated"
      cx="32"
      cy="32"
      :r="RING_R"
      fill="none"
      class="nucleus-sweep"
      :stroke-width="ringWidth + 0.8"
      stroke-linecap="round"
      :stroke-dasharray="ARC"
    />
    <circle cx="32" cy="32" r="6.2" class="nucleus-core" />
    <circle v-if="!mono" cx="32" cy="32" r="2.2" class="specular" />
  </svg>
</template>

<style scoped>
.brand-mark {
  display: inline-block;
  flex: none;
}
.plate {
  fill: var(--nucleus-plate);
}
.glow-stop {
  stop-color: var(--nucleus-glow);
  stop-opacity: var(--nucleus-glow-opacity);
}
.nucleus-ring {
  stroke: var(--nucleus-ring);
}
.nucleus-sweep {
  stroke: var(--nucleus-core);
  opacity: 0.9;
}
.nucleus-core {
  fill: var(--nucleus-core);
}
.specular {
  fill: var(--nucleus-spec);
  opacity: 0.85;
}

/* mono: everything follows currentColor (set `color` on the parent) */
.is-mono .plate {
  fill: none;
  stroke: currentColor;
  stroke-width: 3.2;
}
.is-mono .nucleus-ring {
  stroke: currentColor;
  opacity: 0.55;
}
.is-mono .nucleus-sweep {
  stroke: currentColor;
}
.is-mono .nucleus-core {
  fill: currentColor;
}
</style>
