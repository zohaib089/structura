<script setup lang="ts">
/**
 * ReportSummary - the default report view. Order matters (summary-first rule):
 *   1. coverage + severity counts (icon + word + colour)
 *   2. top findings and what to do next
 *   3. secondary, below the fold: skipped analysers, failed checks, unresolved imports.
 */
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { CircleCheck } from '@lucide/vue'
import type { ReportSeverity } from '../../../api/scan-report-types'
import type { ScanReportMessages } from '../../../services/scan-report-messages'
import { SEVERITY_DESCENDING } from '../../../services/scan-report-severity'
import type { ReportSummary } from '../../../services/scan-report-summary'
import SeverityChip from '../../ui/SeverityChip.vue'
import SkeletonBlock from '../../ui/skeleton/SkeletonBlock.vue'
import ReportAnalysers from './ReportAnalysers.vue'

const props = defineProps<{
  summary: ReportSummary
  messages: ScanReportMessages
  /** Link to the findings list, optionally narrowed to one severity. */
  findingsHref: (severity?: ReportSeverity) => RouteLocationRaw
  graphHref: (path?: string) => RouteLocationRaw
  /** The graph feeds coverage and unresolved imports; those parts wait for it. */
  graphLoading?: boolean
}>()

const coverageLabel = computed(() => {
  const coverage = props.summary.coverage
  if (!coverage) return ''
  return coverage.basis === 'files'
    ? props.messages.coverageOfFiles(coverage.analysed, coverage.total)
    : props.messages.coverageOfChecks(coverage.analysed, coverage.total)
})

const showSecondary = computed(() => !props.graphLoading)
const hasSecondaryContent = computed(
  () =>
    props.summary.skippedAnalysers.length > 0 ||
    props.summary.problemAnalysersCount > 0 ||
    props.summary.unresolved.length > 0
)

const nextSteps = computed(() => {
  const steps: Array<{ text: string; to: RouteLocationRaw }> = []
  const critical = props.summary.severity.critical
  if (critical > 0) steps.push({ text: props.messages.nextStepCritical(critical), to: props.findingsHref('critical') })
  if (props.summary.totalFindings > 0) steps.push({ text: props.messages.nextStepReview, to: props.findingsHref() })
  steps.push({ text: props.messages.nextStepGraph, to: props.graphHref() })
  return steps
})
</script>

<template>
  <div class="report-summary">
    <section class="kpis" :aria-label="`${messages.coverageTitle}, ${messages.severityTitle}`">
      <div class="kpi kpi--coverage">
        <h3 class="kpi__title">{{ messages.coverageTitle }}</h3>
        <SkeletonBlock v-if="graphLoading && !summary.coverage" width="9rem" height="2.5rem" />
        <p v-else-if="summary.coverage" class="coverage">
          <span class="coverage__value">{{ summary.coverage.percent }}%</span>
          <span class="coverage__label">{{ coverageLabel }}</span>
        </p>
        <p v-else class="muted">{{ messages.coverageUnavailable }}</p>
        <p class="hint">{{ messages.coverageHint }}</p>
      </div>

      <div class="kpi kpi--severity">
        <h3 class="kpi__title">{{ messages.severityTitle }}</h3>
        <ul class="severity-list">
          <li v-for="severity in SEVERITY_DESCENDING" :key="severity">
            <RouterLink
              class="severity-link"
              :to="findingsHref(severity)"
              :title="messages.severityTooltip(severity)"
              :aria-label="`${messages.severityCount(messages.severityLabel(severity), summary.severity[severity])}. ${messages.severityTooltip(severity)}`"
            >
              <SeverityChip :severity="severity" :label="messages.severityLabel(severity)" />
              <span class="severity-count">{{ summary.severity[severity] }}</span>
            </RouterLink>
          </li>
        </ul>
        <p class="hint">{{ messages.severityHint }}</p>
      </div>
    </section>

    <section class="block" :aria-labelledby="'report-top-findings'">
      <div class="block__head">
        <h3 id="report-top-findings" class="block__title">{{ messages.topFindingsTitle }}</h3>
        <RouterLink v-if="summary.totalFindings > 0" class="link" :to="findingsHref()">
          {{ messages.seeAllFindings(summary.totalFindings) }}
        </RouterLink>
      </div>
      <p v-if="summary.totalFindings > 0" class="hint">{{ messages.topFindingsHint }}</p>

      <div v-if="summary.totalFindings === 0" class="all-clear" role="status">
        <CircleCheck class="all-clear__icon" :size="20" aria-hidden="true" />
        <div>
          <p class="all-clear__title">{{ messages.summaryAllClearTitle }}</p>
          <p class="hint">{{ messages.summaryAllClearBody }}</p>
        </div>
      </div>
      <ol v-else class="top-findings">
        <li v-for="finding in summary.topFindings" :key="finding.id" class="top-finding">
          <SeverityChip :severity="finding.severity" :label="messages.severityLabel(finding.severity)" />
          <div class="top-finding__body">
            <p class="top-finding__message">{{ finding.message }}</p>
            <p class="top-finding__where">
              <code>{{ finding.file }}<template v-if="finding.line">:{{ finding.line }}</template></code>
            </p>
          </div>
          <RouterLink class="link" :to="graphHref(finding.file)" :title="messages.openGraphTooltip">
            {{ messages.showInGraph }}
          </RouterLink>
        </li>
      </ol>
    </section>

    <section class="block" aria-labelledby="report-next-steps">
      <h3 id="report-next-steps" class="block__title">{{ messages.nextStepsTitle }}</h3>
      <ul class="next-steps">
        <li v-for="step in nextSteps" :key="step.text">
          <RouterLink class="link" :to="step.to">{{ step.text }}</RouterLink>
        </li>
      </ul>
    </section>

    <!-- Secondary: intentionally last. Renders only once the graph (coverage source) has settled. -->
    <section v-if="showSecondary" class="block block--secondary" aria-labelledby="report-secondary">
      <h3 id="report-secondary" class="block__title block__title--caps">{{ messages.secondaryTitle }}</h3>
      <p class="hint">{{ messages.secondaryHint }}</p>

      <p v-if="!hasSecondaryContent" class="muted">{{ messages.nothingSkipped }}</p>

      <div v-if="summary.problemAnalysersCount > 0" class="sub">
        <h4 class="sub__title">{{ messages.problemAnalysersTitle }}</h4>
        <p class="hint">{{ messages.problemAnalysersHint }}</p>
        <ReportAnalysers
          :rows="summary.problemAnalysers"
          :caption="messages.problemAnalysersTitle"
          :messages="messages"
        />
      </div>

      <div v-if="summary.skippedAnalysers.length > 0" class="sub">
        <h4 class="sub__title">{{ messages.analysersSkippedHeading }}</h4>
        <p class="hint">{{ messages.skippedHint }}</p>
        <ReportAnalysers
          :rows="summary.skippedAnalysers"
          :caption="messages.analysersSkippedCaption"
          :messages="messages"
        />
      </div>

      <div v-if="summary.unresolved.length > 0" class="sub">
        <h4 class="sub__title">{{ messages.unresolvedTitle }} ({{ summary.unresolvedTotal }})</h4>
        <p class="hint">{{ messages.unresolvedHint }}</p>
        <table class="plain-table">
          <caption class="sr-only">{{ messages.unresolvedTitle }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ messages.unresolvedColumnReason }}</th>
              <th scope="col">{{ messages.unresolvedColumnCount }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.unresolved" :key="row.reason">
              <td>{{ row.reason }}</td>
              <td>{{ row.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.report-summary {
  display: grid;
}

.kpis {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: var(--space-6);
  padding-block: var(--space-5);
  border-block-end: 1px solid var(--color-border);
}

.kpi__title,
.block__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.block__title--caps {
  text-transform: uppercase;
  letter-spacing: var(--tracking-caps);
}

.coverage {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin: 0;
}

.coverage__value {
  font-size: var(--text-32);
  line-height: var(--text-32-lh);
  font-weight: var(--font-weight-semibold, 600);
  font-variant-numeric: tabular-nums;
}

.coverage__label {
  color: var(--color-text-secondary);
  font-size: var(--text-13);
}

.severity-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.severity-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  margin: calc(var(--space-1) * -1) calc(var(--space-2) * -1);
  border-radius: var(--r-sm);
  color: inherit;
  text-decoration: none;
}

.severity-link:hover {
  background: var(--gray-3);
}

.severity-link:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.severity-count {
  font-size: var(--text-24);
  line-height: var(--text-24-lh);
  font-weight: var(--font-weight-semibold, 600);
  font-variant-numeric: tabular-nums;
}

.hint,
.muted {
  margin: var(--space-2) 0 0;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
}

.block {
  padding-block: var(--space-5);
  border-block-end: 1px solid var(--color-border);
}

.block--secondary {
  border-block-end: 0;
}

.block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.link {
  color: var(--color-brand-amber-ui);
  font-size: var(--text-13);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.link:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: var(--r-xs);
}

.top-findings,
.next-steps {
  display: grid;
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.top-finding {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-3);
  padding-block: var(--space-3);
  border-block-start: 1px solid var(--color-border);
}

.top-finding:first-child {
  border-block-start: 0;
}

.top-finding__message {
  margin: 0;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
}

.top-finding__where {
  margin: var(--space-1) 0 0;
  font-size: var(--text-12);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

code {
  font-family: var(--font-family-mono);
}

.next-steps {
  gap: var(--space-2);
}

.all-clear {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  margin-block-start: var(--space-3);
}

.all-clear__icon {
  color: var(--color-success);
  flex-shrink: 0;
  margin-block-start: 2px;
}

.all-clear__title {
  margin: 0;
  font-weight: var(--font-weight-medium);
}

.sub {
  margin-block-start: var(--space-4);
}

.sub__title {
  margin: 0;
  font-size: var(--text-14);
  font-weight: var(--font-weight-medium);
}

.plain-table {
  inline-size: 100%;
  margin-block-start: var(--space-2);
  border-collapse: collapse;
  font-size: var(--text-13);
}

.plain-table th,
.plain-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  text-align: start;
}

.plain-table thead th {
  font-size: var(--text-12);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
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

@media (max-width: 760px) {
  .kpis {
    grid-template-columns: 1fr;
  }

  .top-finding {
    grid-template-columns: auto minmax(0, 1fr);
  }
}
</style>
