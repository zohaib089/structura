<script setup lang="ts">
import { Crosshair, Waypoints } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import type { ViewerReportFinding, ViewerReportSeverity } from '../report-types'
import SeverityChip from '../../components/ui/SeverityChip.vue'
import type { DirectoryChildRow, NodeDetailSections, RelatedNodeRow, SymbolKindGroup, SymbolRow } from '../node-detail-data'

export type FileSummaryState = 'none' | 'loading' | 'ready' | 'error'

const props = defineProps<{
  empty: string
  panelHint: string
  kindLabel: string
  pathLabel: string
  spanLabel: string
  provenanceLabel: string
  confidenceLabel: string
  reasonLabel: string
  internalLabel: string
  weightLabel: string
  importKindLabel: string
  typeOnlyLabel: string
  focusLabel: string
  recentreLabel: string
  focusTooltip: string
  recentreTooltip: string
  depthLabel: string
  depthTooltip: string
  depsOutLabel: string
  depsInLabel: string
  findingsLabel: string
  findingsSectionLabel: string
  purposeLabel: string
  symbolsLabel: string
  importsLabel: string
  importersLabel: string
  contentsLabel: string
  expandContentsLabel: string
  expandTooltip: string
  noFindingsLabel: string
  noFindingsNeedScan: string
  hasScanReport: boolean
  noIssuesStat: string
  summaryLoading: string
  summaryError: string
  summaryRetry: string
  summaryEmpty: string
  emptyImports: string
  emptyImporters: string
  emptySymbols: string
  emptyContents: string
  openDetailsLabel: string
  kindTagFolder: string
  kindTagFile: string
  symbolExportTag: string
  symbolExportTooltip?: string
  symbolsHint?: string
  symbolLine?: string
  symbolOpenTooltip?: string
  symbolKindLabels?: Record<SymbolKindGroup, string>
  symbolKindCountLabels?: Record<SymbolKindGroup, { one: string; other: string }>
  /** Symbol rows open the file at their line (editor hosts); otherwise rows are read-only. */
  canOpenSymbols?: boolean
  showAllSymbolsLabel?: string
  summaryState: FileSummaryState
  severityLabel: (severity: ViewerReportSeverity) => string
  detail: {
    title: string
    kind: string
    path: string
    span: string
    provenance: string
    confidence: string
    reason: string
    internal: string
    weight: string
    importKind: string
    typeOnly: string
  } | null
  sections: NodeDetailSections | null
  findings: ViewerReportFinding[]
  /** Back to the previous graph view (hidden when there is none). */
  canBack?: boolean
  backLabel?: string
  backTooltip?: string
}>()

const emit = defineEmits<{
  focus: []
  recentre: []
  navigate: [id: string]
  expandChild: [id: string]
  retrySummary: []
  back: []
  openSymbol: [row: SymbolRow]
}>()

/** Long files: show the first rows, the rest behind one "Show all" button. */
const SYMBOL_PREVIEW = 25
const showAllSymbols = ref(false)
watch(() => props.detail?.path, () => { showAllSymbols.value = false })
const visibleSymbols = computed(() => {
  const rows = props.sections?.symbols ?? []
  return showAllSymbols.value ? rows : rows.slice(0, SYMBOL_PREVIEW)
})
const hiddenSymbolCount = computed(() => Math.max(0, (props.sections?.symbols.length ?? 0) - visibleSymbols.value.length))

function fill(template: string | undefined, values: Record<string, string | number>): string {
  return (template ?? '').replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

function symbolKindTag(row: SymbolRow): string {
  return props.symbolKindLabels?.[row.kindGroup] ?? symbolKindLabel(row.symbolKind)
}

function symbolCountText(kind: SymbolKindGroup, count: number): string {
  const label = props.symbolKindCountLabels?.[kind]
  return label ? `${count} ${count === 1 ? label.one : label.other}` : `${count} ${kind}`
}

function symbolLineText(row: SymbolRow): string {
  return props.symbolLine ? fill(props.symbolLine, { line: row.line }) : row.span
}

function symbolOpenText(row: SymbolRow): string {
  return fill(props.symbolOpenTooltip, { name: row.label, line: row.line })
}

const severityChipLabel = computed(() => {
  const chip = props.sections?.severityChip
  if (!chip) return ''
  return `${props.severityLabel(chip.severity)} · ${chip.count}`
})

const findingsEmptyText = computed(() => {
  if (props.findings.length > 0) return ''
  if (props.hasScanReport) return props.noFindingsLabel
  return `${props.noFindingsLabel} ${props.noFindingsNeedScan}`
})

function kindTag(kind: string): string {
  if (kind === 'directory') return props.kindTagFolder
  if (kind === 'file') return props.kindTagFile
  return kind
}

function symbolKindLabel(kind: string): string {
  if (!kind) return kind
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}

function onNavigate(row: RelatedNodeRow | DirectoryChildRow) {
  emit('navigate', row.id)
}

function onExpandChild(row: DirectoryChildRow) {
  emit('expandChild', row.id)
}
</script>

<template>
  <section data-testid="node-detail" class="node-detail">
    <button
      v-if="canBack && backLabel"
      type="button"
      class="back"
      data-testid="detail-back"
      :aria-label="backTooltip || backLabel"
      :title="backTooltip || backLabel"
      @click="emit('back')"
    >
      <span aria-hidden="true">←</span> {{ backLabel }}
    </button>
    <p v-if="!detail">{{ empty }}</p>
    <template v-else-if="detail.kind === 'contains' || detail.kind === 'bundle'">
      <h3 dir="ltr">{{ detail.title }}</h3>
      <dl class="meta-grid">
        <div><dt>{{ kindLabel }}</dt><dd>{{ detail.kind }}</dd></div>
        <div v-if="detail.provenance"><dt>{{ provenanceLabel }}</dt><dd>{{ detail.provenance }}</dd></div>
        <div v-if="detail.weight"><dt>{{ weightLabel }}</dt><dd>{{ detail.weight }}</dd></div>
        <div v-if="detail.importKind"><dt>{{ importKindLabel }}</dt><dd>{{ detail.importKind }}</dd></div>
        <div v-if="detail.typeOnly"><dt>{{ typeOnlyLabel }}</dt><dd>{{ detail.typeOnly }}</dd></div>
      </dl>
    </template>
    <template v-else>
      <header class="header">
        <h3 dir="ltr">{{ detail.title }}</h3>
        <p v-if="detail.path" class="path" dir="ltr" :title="detail.path">{{ detail.path }}</p>
        <p class="hint">{{ panelHint }}</p>
      </header>

      <dl v-if="sections" class="stat-grid" data-testid="stat-grid">
        <div>
          <dt :title="depthTooltip">{{ depthLabel }}</dt>
          <dd>{{ sections.stats.depth }}</dd>
        </div>
        <div><dt>{{ depsOutLabel }}</dt><dd>{{ sections.stats.depsOut }}</dd></div>
        <div><dt>{{ depsInLabel }}</dt><dd>{{ sections.stats.depsIn }}</dd></div>
        <div>
          <dt>{{ findingsLabel }}</dt>
          <dd>
            <SeverityChip
              v-if="sections.severityChip"
              :severity="sections.severityChip.severity"
              :label="severityChipLabel"
              :title="severityChipLabel"
            />
            <span v-else class="muted">{{ noIssuesStat }}</span>
          </dd>
        </div>
      </dl>
      <dl v-if="sections" class="meta-grid">
        <div v-if="sections.stats.provenance">
          <dt>{{ provenanceLabel }}</dt><dd>{{ sections.stats.provenance }}</dd>
        </div>
        <div v-else-if="detail.provenance">
          <dt>{{ provenanceLabel }}</dt><dd>{{ detail.provenance }}</dd>
        </div>
        <div v-if="detail.span"><dt>{{ spanLabel }}</dt><dd dir="ltr">{{ detail.span }}</dd></div>
        <div v-if="detail.internal"><dt>{{ internalLabel }}</dt><dd>{{ detail.internal }}</dd></div>
      </dl>

      <section v-if="sections && detail.kind === 'directory'" class="block">
        <h4>{{ contentsLabel }}</h4>
        <p v-if="!sections.contents.length" class="muted">{{ emptyContents }}</p>
        <ul v-else class="link-list">
          <li v-for="row in sections.contents" :key="row.id">
            <button type="button" class="link" :aria-label="openDetailsLabel" :title="openDetailsLabel" @click="onNavigate(row)">
              {{ row.label }}
            </button>
            <span class="kind-tag">{{ kindTag(row.kind) }}</span>
            <button
              v-if="row.kind === 'directory'"
              type="button"
              class="ghost"
              :title="expandTooltip"
              @click="onExpandChild(row)"
            >
              {{ expandContentsLabel }}
            </button>
          </li>
        </ul>
      </section>

      <section v-if="sections && detail.kind === 'file'" class="block">
        <h4>{{ purposeLabel }}</h4>
        <p v-if="summaryState === 'loading'" class="muted" role="status">{{ summaryLoading }}</p>
        <div v-else-if="summaryState === 'error'" class="error-row" role="alert">
          <p class="muted">{{ summaryError }}</p>
          <button type="button" class="ghost" @click="emit('retrySummary')">{{ summaryRetry }}</button>
        </div>
        <p v-else-if="sections.summary" class="summary">{{ sections.summary }}</p>
        <p v-else class="muted">{{ summaryEmpty }}</p>
      </section>

      <section v-if="sections && detail.kind === 'file'" class="block">
        <h4>{{ symbolsLabel }}</h4>
        <p v-if="!sections.symbols.length" class="muted" data-testid="symbols-empty">{{ emptySymbols }}</p>
        <template v-else>
          <p v-if="symbolsHint" class="muted symbols-hint">{{ symbolsHint }}</p>
          <ul class="symbol-counts" data-testid="symbol-counts">
            <li v-for="entry in sections.symbolCounts" :key="entry.kind" class="symbol-count">{{ symbolCountText(entry.kind, entry.count) }}</li>
          </ul>
          <ul class="symbol-list" data-testid="symbol-list">
            <li v-for="row in visibleSymbols" :key="row.id">
              <button
                v-if="canOpenSymbols"
                type="button"
                class="symbol-row is-action"
                :title="symbolOpenText(row)"
                :aria-label="symbolOpenText(row)"
                :data-line="row.line"
                @click="emit('openSymbol', row)"
              >
                <span class="mono symbol-name" dir="ltr">{{ row.label }}</span>
                <span class="symbol-tags">
                  <span class="kind-tag">{{ symbolKindTag(row) }}</span>
                  <span v-if="row.exported" class="export-tag" :title="symbolExportTooltip">{{ symbolExportTag }}</span>
                </span>
                <span class="muted mono symbol-line">{{ symbolLineText(row) }}</span>
              </button>
              <div v-else class="symbol-row" :data-line="row.line">
                <span class="mono symbol-name" dir="ltr">{{ row.label }}</span>
                <span class="symbol-tags">
                  <span class="kind-tag">{{ symbolKindTag(row) }}</span>
                  <span v-if="row.exported" class="export-tag" :title="symbolExportTooltip">{{ symbolExportTag }}</span>
                </span>
                <span class="muted mono symbol-line">{{ symbolLineText(row) }}</span>
              </div>
            </li>
          </ul>
          <button v-if="hiddenSymbolCount > 0" type="button" class="ghost" data-testid="symbols-show-all" @click="showAllSymbols = true">
            {{ fill(showAllSymbolsLabel, { count: sections.symbols.length }) || `Show all ${sections.symbols.length}` }}
          </button>
        </template>
      </section>

      <section v-if="sections && detail.kind === 'file'" class="block">
        <h4>{{ importsLabel }}</h4>
        <p v-if="!sections.imports.length" class="muted">{{ emptyImports }}</p>
        <ul v-else class="link-list">
          <li v-for="row in sections.imports" :key="`${row.edgeType}:${row.id}`">
            <button type="button" class="link" :aria-label="openDetailsLabel" :title="openDetailsLabel" @click="onNavigate(row)">
              {{ row.label }}
            </button>
          </li>
        </ul>
      </section>

      <section v-if="sections && detail.kind === 'file'" class="block">
        <h4>{{ importersLabel }}</h4>
        <p v-if="!sections.importers.length" class="muted">{{ emptyImporters }}</p>
        <ul v-else class="link-list">
          <li v-for="row in sections.importers" :key="`${row.edgeType}:${row.id}`">
            <button type="button" class="link" :aria-label="openDetailsLabel" :title="openDetailsLabel" @click="onNavigate(row)">
              {{ row.label }}
            </button>
          </li>
        </ul>
      </section>

      <section v-if="sections && detail.kind === 'file'" class="block">
        <h4>{{ findingsSectionLabel }}</h4>
        <p v-if="findings.length === 0" class="muted">{{ findingsEmptyText }}</p>
        <ul v-else class="finding-list">
          <li v-for="finding in findings" :key="finding.id">
            <SeverityChip
              :severity="finding.severity"
              :label="severityLabel(finding.severity)"
              :title="severityLabel(finding.severity)"
            />
            <p>{{ finding.message }}</p>
            <p v-if="finding.line" class="muted mono">Line {{ finding.line }}</p>
          </li>
        </ul>
      </section>

      <div class="actions">
        <button type="button" class="primary" :title="recentreTooltip" @click="emit('recentre')"><Crosshair :size="14" aria-hidden="true" /><span>{{ recentreLabel }}</span></button>
        <button type="button" class="ghost action-ghost" :title="focusTooltip" @click="emit('focus')"><Waypoints :size="14" aria-hidden="true" /><span>{{ focusLabel }}</span></button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.node-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--text-13);
}
/* Levels / Uses / Used by / Findings: a compact 2 x 2 grid of small cards. */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-1);
  margin: 0;
}
.stat-grid div {
  display: grid;
  gap: 2px;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--color-brand-navy) 8%, transparent);
}
.stat-grid dt {
  color: var(--color-text-secondary);
  font-size: var(--text-12);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-grid dd {
  margin: 0;
  font-size: var(--text-16);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}
.stat-grid dd .muted { font-size: var(--text-13); font-weight: 400; }
.header h3 {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
}
.path {
  margin: var(--space-1) 0 0;
  font-family: var(--font-family-mono);
  font-size: var(--text-12);
  color: var(--color-text-secondary);
  word-break: break-all;
}
.hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
}
.meta-grid {
  display: grid;
  gap: var(--space-1);
  margin: 0;
}
.meta-grid div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}
.meta-grid dt {
  color: var(--color-text-secondary);
  max-inline-size: 55%;
}
.meta-grid dd {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  text-align: end;
}
.block h4 {
  margin: 0 0 var(--space-1);
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}
.plain-list,
.link-list,
.finding-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-1);
}
.link-list li,
.plain-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.error-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.link {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-brand-amber-ui);
  cursor: pointer;
  font: inherit;
  text-align: start;
}
.link:hover {
  text-decoration: underline;
}
.ghost {
  border: 1px solid var(--color-border);
  border-radius: var(--r-sm);
  padding: var(--space-1) var(--space-2);
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: var(--text-12);
}
.primary {
  flex: 1;
  min-block-size: var(--viewer-hit-target);
  border: 1px solid var(--button-primary-border);
  border-radius: var(--r-sm);
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
  cursor: pointer;
}
.actions {
  display: flex;
  gap: var(--space-2);
  margin-block-start: var(--space-1);
}
.actions button {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-inline-size: 0;
  min-block-size: 2.25rem;
  padding: 0 var(--space-2);
  font-size: var(--text-12);
  white-space: nowrap;
}
.actions button span { overflow: hidden; text-overflow: ellipsis; }
.actions button:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.summary {
  margin: 0;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}
.muted {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}
.mono {
  font-family: var(--font-family-mono);
}
.kind-tag {
  font-size: var(--text-12);
  color: var(--color-text-secondary);
}
.symbols-hint { margin-block-end: var(--space-2); }
.symbol-counts {
  list-style: none;
  margin: 0 0 var(--space-2);
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
.symbol-count {
  padding: 2px var(--space-2);
  border: 1px solid var(--viewer-control-border, var(--color-border));
  border-radius: var(--radius-full, 999px);
  font-size: var(--text-12);
  color: var(--color-text-primary);
  background: var(--color-surface-raised);
}
.symbol-list {
  min-inline-size: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}
.symbol-list li { min-inline-size: 0; }
.symbol-row {
  box-sizing: border-box;
  max-inline-size: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  inline-size: 100%;
  min-block-size: 2rem;
  padding: 2px var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  text-align: start;
}
.symbol-row.is-action { cursor: pointer; }
.symbol-row.is-action:hover { background: color-mix(in srgb, var(--color-text-primary) 8%, transparent); }
.symbol-row.is-action:focus-visible { outline: none; box-shadow: var(--focus-ring); border-color: var(--color-brand-amber-ui); }
.symbol-name { flex: 1 1 auto; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-13); }
.symbol-tags { flex: 0 0 auto; display: flex; gap: var(--space-1); align-items: center; }
.symbol-line { flex: 0 0 auto; min-inline-size: 4.5em; text-align: end; font-size: var(--text-12); font-variant-numeric: tabular-nums; }
.symbol-row.is-action .symbol-line { color: var(--color-text-primary); text-decoration: underline; text-decoration-color: var(--color-brand-amber-ui); text-underline-offset: 3px; }
.export-tag {
  font-size: var(--text-12);
  font-weight: 600;
  color: var(--color-text-primary);
  padding-inline: var(--space-1);
  border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--color-brand-amber-ui) 18%, transparent);
}
.finding-list li {
  display: grid;
  gap: var(--space-1);
}
.back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1, 4px);
  align-self: flex-start;
  margin-block-end: var(--space-2, 8px);
  min-block-size: 2rem;
  padding-inline: var(--space-2, 8px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
}
.back:hover { background: var(--color-surface-raised); }
.back:focus-visible { outline: 2px solid var(--color-focus, #f5b041); outline-offset: 2px; }
</style>
