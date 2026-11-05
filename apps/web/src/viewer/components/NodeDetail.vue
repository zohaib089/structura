<script setup lang="ts">
import type { ViewerReportFinding, ViewerReportSeverity } from '../report-types'
import SeverityChip from '../../components/ui/SeverityChip.vue'
import type { DirectoryChildRow, NodeDetailSections, RelatedNodeRow } from '../node-detail-data'

defineProps<{
  empty: string
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
  depthLabel: string
  depsOutLabel: string
  depsInLabel: string
  findingsLabel: string
  purposeLabel: string
  symbolsLabel: string
  importsLabel: string
  importersLabel: string
  contentsLabel: string
  expandLabel: string
  noFindingsLabel: string
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
}>()

const emit = defineEmits<{
  focus: []
  recentre: []
  navigate: [id: string]
  expandChild: [id: string]
}>()

function onNavigate(row: RelatedNodeRow | DirectoryChildRow) {
  emit('navigate', row.id)
}

function onExpandChild(row: DirectoryChildRow) {
  emit('expandChild', row.id)
}
</script>

<template>
  <section data-testid="node-detail" class="node-detail">
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
      </header>

      <dl v-if="sections" class="meta-grid">
        <div><dt>{{ depthLabel }}</dt><dd>{{ sections.stats.depth }}</dd></div>
        <div><dt>{{ depsOutLabel }}</dt><dd>{{ sections.stats.depsOut }}</dd></div>
        <div><dt>{{ depsInLabel }}</dt><dd>{{ sections.stats.depsIn }}</dd></div>
        <div>
          <dt>{{ findingsLabel }}</dt>
          <dd>
            <SeverityChip
              v-if="sections.severityChip"
              :severity="sections.severityChip.severity"
              :label="severityLabel(sections.severityChip.severity)"
              :count="sections.severityChip.count"
              compact
            />
            <span v-else class="muted">—</span>
          </dd>
        </div>
        <div v-if="sections.stats.provenance">
          <dt>{{ provenanceLabel }}</dt><dd>{{ sections.stats.provenance }}</dd>
        </div>
        <div v-else-if="detail.provenance">
          <dt>{{ provenanceLabel }}</dt><dd>{{ detail.provenance }}</dd>
        </div>
        <div v-if="detail.span"><dt>{{ spanLabel }}</dt><dd dir="ltr">{{ detail.span }}</dd></div>
        <div v-if="detail.internal"><dt>{{ internalLabel }}</dt><dd>{{ detail.internal }}</dd></div>
      </dl>

      <section v-if="sections?.contents.length" class="block">
        <h4>{{ contentsLabel }}</h4>
        <ul class="link-list">
          <li v-for="row in sections.contents" :key="row.id">
            <button type="button" class="link" @click="onNavigate(row)">{{ row.label }}</button>
            <span class="kind-tag">{{ row.kind }}</span>
            <button type="button" class="ghost" @click="onExpandChild(row)">{{ expandLabel }}</button>
          </li>
        </ul>
      </section>

      <section v-if="sections && detail.kind === 'file'" class="block">
        <h4>{{ purposeLabel }}</h4>
        <p v-if="sections.summary" class="summary">{{ sections.summary }}</p>
        <p v-else class="muted">—</p>
      </section>

      <section v-if="sections?.symbols.length" class="block">
        <h4>{{ symbolsLabel }}</h4>
        <ul class="plain-list">
          <li v-for="row in sections.symbols" :key="row.id">
            <span class="mono">{{ row.label }}</span>
            <span class="kind-tag">{{ row.symbolKind }}</span>
            <span v-if="row.exported" class="kind-tag">export</span>
            <span class="muted mono">{{ row.span }}</span>
          </li>
        </ul>
      </section>

      <section v-if="sections?.imports.length" class="block">
        <h4>{{ importsLabel }}</h4>
        <ul class="link-list">
          <li v-for="row in sections.imports" :key="`${row.edgeType}:${row.id}`">
            <button type="button" class="link" @click="onNavigate(row)">{{ row.label }}</button>
            <span class="muted mono">{{ row.edgeType }}</span>
          </li>
        </ul>
      </section>

      <section v-if="sections?.importers.length" class="block">
        <h4>{{ importersLabel }}</h4>
        <ul class="link-list">
          <li v-for="row in sections.importers" :key="`${row.edgeType}:${row.id}`">
            <button type="button" class="link" @click="onNavigate(row)">{{ row.label }}</button>
            <span class="muted mono">{{ row.edgeType }}</span>
          </li>
        </ul>
      </section>

      <section v-if="sections && detail.kind === 'file'" class="block">
        <h4>{{ findingsLabel }}</h4>
        <p v-if="findings.length === 0" class="muted">{{ noFindingsLabel }}</p>
        <ul v-else class="finding-list">
          <li v-for="finding in findings" :key="finding.id">
            <SeverityChip :severity="finding.severity" :label="severityLabel(finding.severity)" />
            <p>{{ finding.message }}</p>
            <p v-if="finding.line" class="muted mono">L{{ finding.line }}</p>
          </li>
        </ul>
      </section>

      <div class="actions">
        <button type="button" class="primary" @click="emit('recentre')">{{ recentreLabel }}</button>
        <button type="button" class="ghost" @click="emit('focus')">{{ focusLabel }}</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.node-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
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
.meta-grid {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}
.meta-grid div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}
.meta-grid dt {
  color: var(--color-text-secondary);
}
.meta-grid dd {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.finding-count {
  font-variant-numeric: tabular-nums;
}
.block h4 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-12);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
}
.plain-list,
.link-list,
.finding-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}
.link-list li,
.plain-list li {
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
  margin-block-start: var(--space-2);
}
.summary {
  margin: 0;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}
.muted {
  margin: 0;
  color: var(--color-text-secondary);
}
.mono {
  font-family: var(--font-family-mono);
}
.kind-tag {
  font-size: var(--text-12);
  color: var(--color-text-secondary);
}
.finding-list li {
  display: grid;
  gap: var(--space-1);
}
</style>
