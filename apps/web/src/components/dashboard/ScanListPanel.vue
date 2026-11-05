<script setup lang="ts">
import { computed } from 'vue'
import type { Scan } from '../../api/scans'
import Button from '../ui/Button.vue'
import EmptyState from '../ui/EmptyState.vue'
import ErrorState from '../ui/ErrorState.vue'
import Skeleton from '../ui/Skeleton.vue'
import StatusPill from '../ui/StatusPill.vue'
import { dashboardMessages } from '../../services/dashboard-messages'
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
const sharedMessages = computed(() => dashboardMessages(props.locale))

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
      <Button variant="secondary" size="sm" :loading="loading" :disabled="loading" @click="emit('refresh')">
        {{ messages.refreshScans }}
      </Button>
    </div>

    <ErrorState
      v-if="error"
      :message="error"
      :retry-label="sharedMessages.retry"
      @retry="emit('refresh')"
    />
    <Skeleton v-else-if="loading" :rows="4" :label="messages.refreshScans" />
    <EmptyState v-else-if="scans.length === 0" :title="messages.scanListEmpty" />

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
            <StatusPill :status="scan.status" :label="messages.scanStatus(scan.status)" />
            <time :datetime="scan.createdAt">{{ formatDate(scan.createdAt) }}</time>
          </span>
          <span v-if="scan.status === 'failed' && scan.errorMessage" class="scan-error">{{ scan.errorMessage }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.scan-list {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.list-heading h2 {
  margin: 0;
  font-size: var(--text-18, var(--font-size-xl));
  line-height: 1.3;
  font-weight: var(--font-weight-semibold);
}

.rows {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--color-surface);
}

.rows > li + li {
  border-top: 1px solid var(--color-border);
}

.scan-row {
  width: 100%;
  display: grid;
  gap: var(--space-1);
  text-align: start;
  border: 0;
  border-radius: 0;
  padding: var(--space-3) var(--space-4);
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.scan-row:hover {
  background: var(--gray-3);
}

.scan-row.selected {
  background: color-mix(in srgb, var(--color-brand-amber-ui) var(--alpha-08), var(--color-surface));
  box-shadow: inset 2px 0 0 var(--color-brand-amber-ui);
}

.scan-source {
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}

.scan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
}

.scan-error {
  color: var(--color-danger);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
}
</style>
