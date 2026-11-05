<script setup lang="ts">
/** ReportImprovements - suggested clean-ups, each fixing one or more findings. */
import { computed, ref, watch } from 'vue'
import { CircleCheck } from '@lucide/vue'
import type { ReportImprovement } from '../../../api/scan-report-types'
import type { ScanReportMessages } from '../../../services/scan-report-messages'
import SeverityChip from '../../ui/SeverityChip.vue'
import Button from '../../ui/Button.vue'

const props = withDefaults(
  defineProps<{
    improvements: ReportImprovement[]
    messages: ScanReportMessages
    tabLabel: string
    emptyKind: 'none' | 'filtered'
    pageSize?: number
  }>(),
  { pageSize: 50 }
)

const emit = defineEmits<{ clearFilters: []; showAll: [] }>()

const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(props.improvements.length / props.pageSize)))
const paged = computed(() =>
  props.improvements.slice((page.value - 1) * props.pageSize, page.value * props.pageSize)
)
watch(
  () => props.improvements,
  () => {
    page.value = 1
  }
)
</script>

<template>
  <div v-if="improvements.length === 0" class="empty" role="status">
    <CircleCheck class="empty__icon" :size="20" aria-hidden="true" />
    <p class="empty__title">
      {{ emptyKind === 'filtered' ? messages.emptyFilteredTitle : messages.emptyTabTitle(tabLabel) }}
    </p>
    <p class="empty__body">
      {{ emptyKind === 'filtered' ? messages.emptyFilteredBody : messages.emptyTabBody }}
    </p>
    <Button v-if="emptyKind === 'filtered'" variant="secondary" size="sm" @click="emit('clearFilters')">
      {{ messages.clearFilters }}
    </Button>
    <Button v-else variant="ghost" size="sm" @click="emit('showAll')">{{ messages.emptyTabAction }}</Button>
  </div>
  <div v-else>
    <ul class="list">
      <li v-for="row in paged" :key="row.id" class="row">
        <SeverityChip
          v-if="row.severity"
          :severity="row.severity"
          :label="messages.severityLabel(row.severity)"
        />
        <div>
          <p class="row__message">{{ row.message }}</p>
          <p class="row__meta">{{ messages.improvementsRelated(row.relatedFindingIds.length) }}</p>
        </div>
      </li>
    </ul>
    <nav v-if="improvements.length > pageSize" class="pagination" aria-label="Pages">
      <Button variant="secondary" size="sm" :disabled="page <= 1" @click="page -= 1">
        {{ messages.paginationPrevious }}
      </Button>
      <span role="status">{{ messages.paginationStatus(page, totalPages, improvements.length) }}</span>
      <Button variant="secondary" size="sm" :disabled="page >= totalPages" @click="page += 1">
        {{ messages.paginationNext }}
      </Button>
    </nav>
  </div>
</template>

<style scoped>
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-3);
  border-block-end: 1px solid var(--color-border);
}

.row__message {
  margin: 0;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.row__meta {
  margin: var(--space-1) 0 0;
  font-size: var(--text-12);
  color: var(--color-text-secondary);
}

.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-4);
  font-size: var(--text-13);
  color: var(--color-text-secondary);
}

.empty {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
  padding-block: var(--space-6);
}

.empty__icon {
  color: var(--color-text-muted);
}

.empty__title {
  margin: 0;
  font-weight: var(--font-weight-medium);
}

.empty__body {
  margin: 0;
  max-inline-size: 42rem;
  color: var(--color-text-secondary);
}
</style>
