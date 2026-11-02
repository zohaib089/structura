<script setup lang="ts">
import { computed } from 'vue'
import type { Scan } from '../../api/scans'
import { scanMessages } from '../../services/scan-messages'
import type { WebLocale } from '../../services/locale'

const props = defineProps<{
  locale: WebLocale
  scans: Scan[]
  loading: boolean
  error: string
  selectedScanId: string | null
}>()

const emit = defineEmits<{
  refresh: []
  select: [scanId: string]
}>()

const messages = computed(() => scanMessages(props.locale))

function formatDate(value: string) {
  return new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}
</script>

<template>
  <section class="scan-list" :aria-label="messages.scanListTitle">
    <div class="list-heading">
      <h2>{{ messages.scanListTitle }}</h2>
      <button type="button" class="secondary-button" :disabled="loading" @click="emit('refresh')">
        {{ messages.refreshScans }}
      </button>
    </div>

    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-else-if="loading" role="status">{{ messages.refreshScans }}…</p>
    <p v-else-if="scans.length === 0">{{ messages.scanListEmpty }}</p>

    <ul v-else class="rows">
      <li v-for="scan in scans" :key="scan.id">
        <button
          type="button"
          class="scan-row"
          :class="{ selected: selectedScanId === scan.id }"
          @click="emit('select', scan.id)"
        >
          <span class="scan-source">{{ messages.scanSourceLabel(scan) }}</span>
          <span class="scan-meta">
            <span class="status" :data-status="scan.status">{{ messages.scanStatus(scan.status) }}</span>
            <time :datetime="scan.created_at">{{ formatDate(scan.created_at) }}</time>
          </span>
          <span v-if="scan.status === 'failed' && scan.error" class="scan-error">{{ scan.error }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.scan-list {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-50), transparent);
}

.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.list-heading h2 {
  margin: 0;
  font-size: var(--font-size-xl);
}

.rows {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.scan-row {
  width: 100%;
  display: grid;
  gap: var(--space-1);
  text-align: start;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  background: var(--color-surface);
  cursor: pointer;
  font: inherit;
}

.scan-row.selected {
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-40), var(--color-border));
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-06), transparent);
}

.scan-source {
  font-weight: var(--font-weight-bold);
  overflow-wrap: anywhere;
}

.scan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.status[data-status='failed'] {
  color: var(--color-danger);
}

.scan-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.secondary-button {
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  cursor: pointer;
  font: inherit;
}

.feedback.error {
  margin: 0;
  color: var(--color-danger);
}
</style>
