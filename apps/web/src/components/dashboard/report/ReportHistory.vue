<script setup lang="ts">
/** ReportHistory - commit timeline, hotspots, churn and authors, plus any history findings. */
import { History } from '@lucide/vue'
import type { ReportFinding, ReportHistoryPayload } from '../../../api/scan-report-types'
import type { ScanReportMessages } from '../../../services/scan-report-messages'
import FindingsTable from './FindingsTable.vue'
import type { RouteLocationRaw } from 'vue-router'

const LIST_LIMIT = 50

defineProps<{
  history: ReportHistoryPayload | null
  findings: ReportFinding[]
  messages: ScanReportMessages
  tabLabel: string
  graphHref: (path: string) => RouteLocationRaw
}>()
</script>

<template>
  <div v-if="!history" class="empty" role="status">
    <History class="empty__icon" :size="20" aria-hidden="true" />
    <p class="empty__title">{{ messages.historyEmptyTitle }}</p>
    <p class="empty__body">{{ messages.historyEmptyBody }}</p>
  </div>
  <div v-else class="history">
    <p v-if="history.limitedHistory" class="note">{{ messages.historyLimited }}</p>
    <div class="history__grid">
      <section>
        <h3>{{ messages.historyTimeline }}</h3>
        <p v-if="history.commits.length === 0" class="muted">{{ messages.emptySection }}</p>
        <ol v-else class="list">
          <li v-for="commit in history.commits.slice(0, LIST_LIMIT)" :key="commit.hash">
            <strong>{{ commit.subject }}</strong>
            <span>{{ commit.author }} · {{ commit.date }}</span>
            <code>{{ commit.hash.slice(0, 8) }}</code>
          </li>
        </ol>
      </section>
      <section>
        <h3 :title="'Files that change often. They are where problems tend to appear.'">{{ messages.historyHotspots }}</h3>
        <p v-if="history.hotspots.length === 0" class="muted">{{ messages.emptySection }}</p>
        <ol v-else class="list">
          <li v-for="row in history.hotspots.slice(0, LIST_LIMIT)" :key="row.path">
            <code>{{ row.path }}</code>
            <strong>{{ row.score }}</strong>
          </li>
        </ol>
      </section>
      <section>
        <h3 :title="'How many lines were added and removed in each file.'">{{ messages.historyChurn }}</h3>
        <p v-if="history.fileChurn.length === 0" class="muted">{{ messages.emptySection }}</p>
        <ol v-else class="list">
          <li v-for="row in history.fileChurn.slice(0, LIST_LIMIT)" :key="row.path">
            <code>{{ row.path }}</code>
            <span>+{{ row.additions }} / −{{ row.deletions }} · {{ row.commits }} commits</span>
          </li>
        </ol>
      </section>
      <section>
        <h3>{{ messages.historyAuthors }}</h3>
        <p v-if="history.authors.length === 0" class="muted">{{ messages.emptySection }}</p>
        <ol v-else class="list">
          <li v-for="author in history.authors.slice(0, LIST_LIMIT)" :key="`${author.name}-${author.email ?? ''}`">
            <strong>{{ author.name }}</strong>
            <span>{{ author.commitCount }} commits</span>
          </li>
        </ol>
      </section>
    </div>
  </div>

  <section v-if="findings.length > 0" class="history-findings">
    <h3>{{ tabLabel }}</h3>
    <FindingsTable :findings="findings" :messages="messages" :tab-label="tabLabel" :graph-href="graphHref" />
  </section>
</template>

<style scoped>
.history__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5) var(--space-6);
}

h3 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-12);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: grid;
  gap: 2px;
  padding-block: var(--space-2);
  border-block-end: 1px solid var(--color-border);
  font-size: var(--text-13);
  overflow-wrap: anywhere;
}

.list span,
.muted,
.note {
  color: var(--color-text-secondary);
}

code {
  font-family: var(--font-family-mono);
  font-size: var(--text-12);
}

.history-findings {
  margin-block-start: var(--space-6);
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

@media (max-width: 920px) {
  .history__grid {
    grid-template-columns: 1fr;
  }
}
</style>
