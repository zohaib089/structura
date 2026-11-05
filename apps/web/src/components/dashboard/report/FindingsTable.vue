<script setup lang="ts">
/**
 * FindingsTable - flat, full-width findings list. Severity is always icon + word + colour.
 * Owns pagination; the parent owns filtering and decides which empty state applies.
 */
import { computed, ref, watch } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { CircleCheck, SearchX } from '@lucide/vue'
import type { ReportFinding } from '../../../api/scan-report-types'
import type { ScanReportMessages } from '../../../services/scan-report-messages'
import SeverityChip from '../../ui/SeverityChip.vue'
import Button from '../../ui/Button.vue'

const props = withDefaults(
  defineProps<{
    findings: ReportFinding[]
    messages: ScanReportMessages
    tabLabel: string
    graphHref?: (path: string) => RouteLocationRaw
    /** Why the list is empty: nothing in this category, or the filters hide everything. */
    emptyKind?: 'none' | 'filtered'
    pageSize?: number
  }>(),
  { emptyKind: 'none', pageSize: 50 }
)

const emit = defineEmits<{ clearFilters: []; showAll: [] }>()

const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(props.findings.length / props.pageSize)))
const paged = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return props.findings.slice(start, start + props.pageSize)
})

watch(
  () => props.findings,
  () => {
    page.value = 1
  }
)
</script>

<template>
  <div v-if="findings.length === 0" class="empty" role="status" :data-testid="`findings-empty-${emptyKind}`">
    <component :is="emptyKind === 'filtered' ? SearchX : CircleCheck" class="empty__icon" :size="20" aria-hidden="true" />
    <p class="empty__title">
      {{ emptyKind === 'filtered' ? messages.emptyFilteredTitle : messages.emptyTabTitle(tabLabel) }}
    </p>
    <p class="empty__body">
      {{ emptyKind === 'filtered' ? messages.emptyFilteredBody : messages.emptyTabBody }}
    </p>
    <Button v-if="emptyKind === 'filtered'" variant="secondary" size="sm" @click="emit('clearFilters')">
      {{ messages.clearFilters }}
    </Button>
    <Button v-else variant="ghost" size="sm" @click="emit('showAll')">
      {{ messages.emptyTabAction }}
    </Button>
  </div>

  <div v-else class="findings">
    <div class="findings__scroll">
      <table class="findings__table" data-testid="findings-table">
        <caption class="sr-only">{{ messages.tableCaption(tabLabel) }}</caption>
        <thead>
          <tr>
            <th scope="col" class="col-severity">{{ messages.columnSeverity }}</th>
            <th scope="col">{{ messages.columnFinding }}</th>
            <th scope="col" class="col-where">{{ messages.columnWhere }}</th>
            <th scope="col" class="col-tool">{{ messages.columnFoundBy }}</th>
            <th v-if="graphHref" scope="col" class="col-actions"><span class="sr-only">{{ messages.columnActions }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="finding in paged" :key="finding.id">
            <td>
              <SeverityChip
                :severity="finding.severity"
                :label="messages.severityLabel(finding.severity)"
              />
            </td>
            <td>
              <p class="finding__message">{{ finding.message }}</p>
              <p v-if="finding.rule" class="finding__rule" :title="messages.ruleLabel">
                <code>{{ finding.rule }}</code>
              </p>
            </td>
            <td class="where">
              <code>{{ finding.file }}<template v-if="finding.line">:{{ finding.line }}</template></code>
            </td>
            <td class="tool" :title="messages.provenanceTooltip(finding.provenance)">
              {{ finding.tool ?? '—' }}
            </td>
            <td v-if="graphHref" class="actions">
              <RouterLink :to="graphHref(finding.file)" class="link" :title="messages.openGraphTooltip">
                {{ messages.showInGraph }}
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="findings.length > pageSize" class="pagination" aria-label="Pages">
      <Button variant="secondary" size="sm" :disabled="page <= 1" @click="page -= 1">
        {{ messages.paginationPrevious }}
      </Button>
      <span role="status">{{ messages.paginationStatus(page, totalPages, findings.length) }}</span>
      <Button variant="secondary" size="sm" :disabled="page >= totalPages" @click="page += 1">
        {{ messages.paginationNext }}
      </Button>
    </nav>
  </div>
</template>

<style scoped>
.findings__scroll {
  overflow-x: auto;
}

.findings__table {
  inline-size: 100%;
  border-collapse: collapse;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}

.findings__table th,
.findings__table td {
  padding: var(--space-3);
  border-block-end: 1px solid var(--color-border);
  text-align: start;
  vertical-align: top;
}

.findings__table thead th {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.col-severity {
  inline-size: 7.5rem;
}

.col-tool {
  inline-size: 9rem;
}

.col-actions {
  inline-size: 8rem;
}

.finding__message {
  margin: 0;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.finding__rule {
  margin: var(--space-1) 0 0;
  font-size: var(--text-12);
  color: var(--color-text-muted);
}

code {
  font-family: var(--font-family-mono);
}

.where {
  font-size: var(--text-12);
  overflow-wrap: anywhere;
}

.tool {
  color: var(--color-text-secondary);
}

.link {
  color: var(--color-brand-amber-ui);
  text-decoration: none;
  white-space: nowrap;
}

.link:hover {
  text-decoration: underline;
}

.link:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: var(--r-xs);
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
  font-size: var(--text-14);
  font-weight: var(--font-weight-medium);
}

.empty__body {
  margin: 0;
  max-inline-size: 42rem;
  color: var(--color-text-secondary);
}

.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
