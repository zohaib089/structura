<script setup lang="ts">
/**
 * SkeletonBlock - one flat placeholder shape with the shared 1.6s shimmer.
 * Decorative: always aria-hidden. The surrounding region carries aria-busy / the status label.
 */
withDefaults(
  defineProps<{
    width?: string
    height?: string
    shape?: 'bar' | 'pill' | 'square' | 'circle'
  }>(),
  { width: '100%', height: '0.75rem', shape: 'bar' }
)
</script>

<template>
  <span
    class="sk-block"
    :class="`sk-block--${shape}`"
    :style="{ inlineSize: width, blockSize: height }"
    aria-hidden="true"
  />
</template>

<style scoped>
.sk-block {
  display: block;
  flex: none;
  max-inline-size: 100%;
  border-radius: var(--r-sm);
  background: var(--gray-3);
}
.sk-block--pill,
.sk-block--circle {
  border-radius: var(--radius-full);
}
.sk-block--square {
  border-radius: var(--r-sm);
}

@media (prefers-reduced-motion: no-preference) {
  .sk-block {
    background: linear-gradient(
      90deg,
      var(--gray-3) 0%,
      var(--gray-4) 50%,
      var(--gray-3) 100%
    );
    background-size: 200% 100%;
    animation: sk-shimmer var(--duration-shimmer) linear infinite;
  }
}

@keyframes sk-shimmer {
  to {
    background-position: -200% 0;
  }
}
</style>
