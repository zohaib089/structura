<script setup lang="ts">
/**
 * LoadingSkeleton - graph loading state: faint rings + ghost nodes with a real status bar underneath.
 * Never a spinner over the canvas; the HexLoader sits in the bottom bar (loading-and-toasts.md §1.2/§1.3).
 */
import HexLoader from '../../components/ui/HexLoader.vue'
import SkeletonGraph from '../../components/ui/skeleton/SkeletonGraph.vue'

defineProps<{ label: string; cancelLabel: string }>()
const emit = defineEmits<{ cancel: [] }>()
</script>

<template>
  <div class="loading-skeleton">
    <SkeletonGraph :label="label">
      <HexLoader size="md" :label="label" :delay="0" :min-visible="0" />
      <button type="button" class="cancel" @click="emit('cancel')">{{ cancelLabel }}</button>
    </SkeletonGraph>
  </div>
</template>

<style scoped>
.loading-skeleton {
  position: relative;
  flex: 1;
  min-block-size: 18rem;
}
.loading-skeleton :deep(.sk-graph__status) {
  gap: var(--space-3);
  justify-content: space-between;
}
.cancel {
  min-block-size: var(--viewer-hit-target);
}
</style>
