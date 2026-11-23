<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'
import type { GraphDuplicates } from '../../../viewer/graph-types'
import {
  cappedDuplicateGroups,
  descriptionSegments,
  duplicateFileName,
  duplicateShortPath,
  hasGraphDuplicates
} from '../../../viewer/duplicates'

const props = defineProps<{
  duplicates?: GraphDuplicates | null
  title: string
  hint: string
  groupsCaption: (count: number) => string
  linesCaption: (count: number) => string
  percentValue: (percent: number) => string
  percentCaption: string
  summaryLabel: (groups: number, lines: number, percent: number) => string
  groupLines: (count: number) => string
  groupPlaces: (count: number) => string
  lineRange: (startLine: number, endLine: number) => string
  openLabel: string
  showing: (shown: number, total: number) => string
  graphHref: (path?: string) => RouteLocationRaw
}>()

const visible = computed(() => hasGraphDuplicates(props.duplicates))

const summary = computed(() => props.duplicates?.summary)

const groupTotal = computed(() => props.duplicates?.summary.groups ?? props.duplicates?.groups.length ?? 0)

const groups = computed(() =>
  cappedDuplicateGroups(props.duplicates?.groups ?? []).map((group) => ({
    id: group.id,
    description: group.description,
    descriptionParts: descriptionSegments(group.description),
    linesText: props.groupLines(group.lineCount),
    placesText: props.groupPlaces(group.occurrences.length),
    occurrences: group.occurrences.map((item, index) => {
      const name = duplicateFileName(item.path)
      const range = props.lineRange(item.startLine, item.endLine)
      return {
        key: `${item.path}:${item.startLine}:${item.endLine}:${index}`,
        path: item.path,
        name,
        shortPath: duplicateShortPath(item.path),
        range,
        ariaLabel: `${name}, ${range}. ${props.openLabel}`
      }
    })
  }))
)

const hintText = computed(() => {
  const shown = groups.value.length
  const total = groupTotal.value
  return total > shown ? props.showing(shown, total) : props.hint
})
</script>

<template>
  <section v-if="visible && summary" class="block" data-testid="duplicated-code" aria-labelledby="report-duplicated-code">
    <div class="block__head">
      <h3 id="report-duplicated-code" class="block__title">{{ title }}</h3>
    </div>
    <p class="hint">{{ hintText }}</p>

    <ul
      class="metrics"
      data-testid="duplicates-summary"
      :aria-label="summaryLabel(summary.groups, summary.duplicatedLines, summary.percentage)"
    >
      <li class="metric">
        <span class="metric__value">{{ summary.groups }}</span>
        <span class="metric__label">{{ groupsCaption(summary.groups) }}</span>
      </li>
      <li class="metric">
        <span class="metric__value">{{ summary.duplicatedLines }}</span>
        <span class="metric__label">{{ linesCaption(summary.duplicatedLines) }}</span>
      </li>
      <li class="metric">
        <span class="metric__value">{{ percentValue(summary.percentage) }}</span>
        <span class="metric__label">{{ percentCaption }}</span>
      </li>
    </ul>

    <ol class="groups" data-testid="duplicates-groups">
      <li v-for="group in groups" :key="group.id" class="group" :data-group-id="group.id">
        <div class="group__meta">
          <span class="group__lines">{{ group.linesText }}</span>
          <span class="group__places">{{ group.placesText }}</span>
        </div>
        <p class="group__desc">
          <template v-for="(part, index) in group.descriptionParts" :key="index">
            <wbr v-if="index > 0" />{{ part }}
          </template>
        </p>
        <ul class="occ">
          <li v-for="item in group.occurrences" :key="item.key" class="occ__item">
            <RouterLink
              class="occ__link"
              :to="graphHref(item.path)"
              :title="openLabel"
              :aria-label="item.ariaLabel"
            >
              <span class="occ__body">
                <span class="occ__name">{{ item.name }}</span>
                <span v-if="item.shortPath" class="occ__path" dir="ltr">{{ item.shortPath }}</span>
              </span>
              <span class="occ__range">{{ item.range }}</span>
            </RouterLink>
          </li>
        </ul>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.block {
  padding-block: var(--space-5);
  border-block-end: 1px solid var(--color-border);
}
.block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}
.block__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}
.hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
}
.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
  max-inline-size: 40rem;
}
.metric {
  display: grid;
  gap: 2px;
  min-inline-size: 0;
}
.metric__value {
  font-size: var(--text-24);
  line-height: var(--text-24-lh);
  font-weight: var(--font-weight-semibold, 600);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}
.metric__label {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
@media (max-width: 520px) {
  .metrics {
    grid-template-columns: 1fr;
    gap: var(--space-3);
    max-inline-size: none;
  }
}
.groups {
  display: grid;
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}
.group + .group {
  border-block-start: 1px solid var(--color-border);
}
.group {
  display: grid;
  gap: var(--space-2);
  padding-block: var(--space-4);
  min-inline-size: 0;
}
.group__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-3);
}
.group__lines {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-semibold, 600);
  font-variant-numeric: tabular-nums;
  color: var(--color-brand-amber-ui);
}
.group__places {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}
.group__desc {
  margin: 0;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  overflow-wrap: break-word;
}
.occ {
  display: grid;
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
}
.occ__link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--space-3);
  padding-block: var(--space-2);
  padding-inline: var(--space-2);
  margin-inline: calc(var(--space-2) * -1);
  color: inherit;
  text-decoration: none;
  border-radius: var(--r-sm, 6px);
}
.occ__link:hover {
  background: color-mix(in srgb, var(--color-brand-navy) 10%, transparent);
}
.occ__link:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.occ__body {
  display: grid;
  gap: 1px;
  min-inline-size: 0;
}
.occ__name {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
  overflow-wrap: anywhere;
}
.occ__path {
  font-family: var(--font-family-mono);
  font-size: var(--text-12);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.occ__range {
  flex-shrink: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
@media (max-width: 760px) {
  .metrics {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
  .occ__link {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
