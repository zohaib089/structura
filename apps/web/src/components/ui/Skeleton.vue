<script setup lang="ts">
import { computed } from 'vue'
import { uiFallbackMessage } from '../../services/ui-fallback-messages'
/**
 * Skeleton - generic flat loading rows (full-bleed, no card chrome, shared 1.6s shimmer).
 * For specific patterns use SkeletonTableRows, SkeletonGraph, SkeletonReport (components/ui/skeleton).
 */
import SkeletonBlock from './skeleton/SkeletonBlock.vue'

const props = withDefaults(
  defineProps<{
    rows?: number
    label?: string
  }>(),
  {
    rows: 3
  }
)
const labelText = computed(() => props.label ?? uiFallbackMessage('loading'))
</script>

<template>
  <div class="ui-skeleton" role="status" aria-busy="true" :aria-label="labelText">
    <SkeletonBlock v-for="row in rows" :key="row" class="ui-skeleton__row" height="2.5rem" />
  </div>
</template>

<style scoped>
.ui-skeleton {
  display: grid;
  gap: var(--space-2);
  inline-size: 100%;
}
</style>
