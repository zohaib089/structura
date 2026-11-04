<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <section class="ui-card">
    <header v-if="title || $slots.header || $slots.actions" class="ui-card__header">
      <div class="ui-card__header-main">
        <slot name="header">
          <h2 v-if="title" class="ui-card__title">{{ title }}</h2>
        </slot>
      </div>
      <div v-if="$slots.actions" class="ui-card__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="ui-card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.ui-card {
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
  box-shadow: var(--elev-0);
}

.ui-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  padding-block-end: 0;
}

.ui-card__title {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
  font-weight: var(--font-weight-semibold);
}

.ui-card__body {
  padding: var(--space-4);
}

.ui-card__header + .ui-card__body {
  padding-block-start: var(--space-3);
}
</style>
