<script setup lang="ts">
/**
 * SkeletonReport - 4 KPI pills (coverage, critical, high, medium) + 4 finding rows.
 * Full-bleed and flat. Sections that depend on resolved data (skipped analysers, unresolved tables)
 * must render only after the summary resolves; do not show them under or before this skeleton.
 */
import SkeletonBlock from './SkeletonBlock.vue'

withDefaults(defineProps<{ findings?: number; label?: string }>(), { findings: 4, label: 'Loading report' })
</script>

<template>
  <div class="sk-report" role="status" aria-busy="true" :aria-label="label">
    <div class="sk-report__kpis" aria-hidden="true">
      <SkeletonBlock v-for="n in 4" :key="n" width="7.5rem" height="2rem" shape="pill" />
    </div>
    <div class="sk-report__findings" aria-hidden="true">
      <div v-for="n in findings" :key="n" class="sk-report__finding">
        <SkeletonBlock width="1.25rem" height="1.25rem" shape="square" />
        <div class="sk-report__text">
          <SkeletonBlock width="55%" height="0.875rem" />
          <SkeletonBlock width="35%" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sk-report {
  inline-size: 100%;
}
.sk-report__kpis {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-4);
  border-block-end: 1px solid var(--color-border);
}
.sk-report__finding {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-block-size: 3.5rem;
  padding-inline: var(--space-4);
  border-block-end: 1px solid var(--color-border);
}
.sk-report__text {
  display: grid;
  flex: 1;
  gap: var(--space-2);
}
</style>
