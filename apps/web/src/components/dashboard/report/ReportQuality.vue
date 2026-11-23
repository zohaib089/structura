<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'
import type { GraphQuality, QualityCategory } from '../../../viewer/graph-types'
import {
  cappedFolderQuality,
  cappedQualityTips,
  hasGraphQuality,
  orderedBreakdown,
  qualityFolderName,
  qualityFolderShortPath,
  tipActionText
} from '../../../viewer/quality-score'
import {
  qualityBreakdownLabel,
  localizedFolderQualitySummary,
} from '../../../viewer/quality-breakdown-label'
import type { GraphMessageCodeMessages } from '../../../viewer/graph-message-codes'

const props = defineProps<{
  quality?: GraphQuality | null
  title: string
  hint: string
  scoreLabel: (score: number, grade: string) => string
  gradeLabel: (grade: string) => string
  outOfLabel: string
  breakdownTitle: string
  categoryTitle: (category: QualityCategory) => string
  pointsOff: (penalty: number) => string
  tipsTitle: string
  tipGain: (gain: number) => string
  foldersTitle: string
  foldersHint: string
  foldersShowing: (shown: number, total: number) => string
  openLabel: string
  folderEmptySummary: string
  graphHref: (path?: string) => RouteLocationRaw
  breakdownMessages: GraphMessageCodeMessages
}>()

const visible = computed(() => hasGraphQuality(props.quality))

const project = computed(() => props.quality?.project)

const categories = computed(() => (project.value ? orderedBreakdown(project.value) : []))

const tips = computed(() =>
  cappedQualityTips(project.value?.tips ?? []).map((tip) => ({
    ...tip,
    action: tipActionText(tip, props.breakdownMessages)
  }))
)

const folderTotal = computed(() => props.quality?.folders?.length ?? 0)
const folders = computed(() =>
  cappedFolderQuality(props.quality?.folders ?? []).map((folder) => ({
    path: folder.path,
    score: folder.score,
    grade: folder.grade,
    name: qualityFolderName(folder.path),
    shortPath: qualityFolderShortPath(folder.path),
    summary: localizedFolderQualitySummary(folder, props.breakdownMessages, props.folderEmptySummary),
    scoreText: props.scoreLabel(folder.score, folder.grade)
  }))
)
</script>

<template>
  <div v-if="visible && project" class="quality" data-testid="quality-score">
    <section class="block" data-testid="quality-score-card" aria-labelledby="report-quality-score">
      <div class="block__head">
        <h3 id="report-quality-score" class="block__title">{{ title }}</h3>
      </div>
      <p class="hint">{{ hint }}</p>

      <div class="hero" :aria-label="scoreLabel(project.score, project.grade)">
        <p class="hero__score">
          <span class="hero__value">{{ project.score }}</span>
          <span class="hero__out">{{ outOfLabel }}</span>
        </p>
        <span class="grade" :data-grade="project.grade" :aria-label="gradeLabel(project.grade)">
          {{ project.grade }}
        </span>
      </div>

      <h4 class="sub__title">{{ breakdownTitle }}</h4>
      <ul class="categories">
        <li v-for="item in categories" :key="item.category" class="category" :data-category="item.category">
          <span class="category__head">
            <span class="category__name">{{ categoryTitle(item.category) }}</span>
            <span class="category__points" :data-off="item.penalty > 0 ? 'yes' : 'no'">
              {{ pointsOff(item.penalty) }}
            </span>
          </span>
          <span class="category__label">{{ qualityBreakdownLabel(item, breakdownMessages) }}</span>
        </li>
      </ul>
    </section>

    <section v-if="tips.length" class="block" data-testid="quality-tips" aria-labelledby="report-quality-tips">
      <h3 id="report-quality-tips" class="block__title">{{ tipsTitle }}</h3>
      <ol class="tips">
        <li v-for="(tip, index) in tips" :key="`${tip.gain}-${tip.text}-${index}`" class="tip">
          <span class="tip__gain">{{ tipGain(tip.gain) }}</span>
          <span class="tip__text">{{ tip.action }}</span>
        </li>
      </ol>
    </section>

    <section v-if="folders.length" class="block" data-testid="quality-folders" aria-labelledby="report-quality-folders">
      <div class="block__head">
        <h3 id="report-quality-folders" class="block__title">{{ foldersTitle }}</h3>
      </div>
      <p class="hint">{{ folderTotal > folders.length ? foldersShowing(folders.length, folderTotal) : foldersHint }}</p>
      <ol class="folders">
        <li v-for="row in folders" :key="row.path" class="folder">
          <RouterLink
            class="folder__link"
            :to="graphHref(row.path)"
            :title="openLabel"
            :aria-label="`${row.name}. ${row.scoreText}. ${row.summary}. ${openLabel}`"
          >
            <span class="folder__score">
              <span class="grade" :data-grade="row.grade" :aria-hidden="true">{{ row.grade }}</span>
              <span class="folder__value">{{ row.score }}</span>
            </span>
            <span class="folder__body">
              <span class="folder__name">{{ row.name }}</span>
              <span v-if="row.shortPath" class="folder__path" dir="ltr">{{ row.shortPath }}</span>
              <span class="folder__summary">{{ row.summary }}</span>
            </span>
          </RouterLink>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.quality {
  display: grid;
}
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
.block__title,
.sub__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}
.sub__title {
  margin-block-start: var(--space-5);
}
.hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
}
.hero {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-block-start: var(--space-4);
}
.hero__score {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin: 0;
}
.hero__value {
  font-size: var(--text-32);
  line-height: var(--text-32-lh);
  font-weight: var(--font-weight-semibold, 600);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}
.hero__out {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
}
.grade {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 2.25rem;
  padding: 0.2em 0.55em;
  border-radius: var(--r-sm, 6px);
  border: 1px solid color-mix(in srgb, var(--grade-fg) 45%, transparent);
  background: color-mix(in srgb, var(--grade-fg) 16%, transparent);
  color: var(--grade-fg);
  font-size: var(--text-16, 1rem);
  line-height: 1.2;
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.04em;
}
.grade[data-grade='A'] { --grade-fg: var(--color-success); }
.grade[data-grade='B'] { --grade-fg: var(--sev-low-fg); }
.grade[data-grade='C'] { --grade-fg: var(--color-brand-amber-ui); }
.grade[data-grade='D'] { --grade-fg: var(--sev-high-fg); }
.grade[data-grade='F'] { --grade-fg: var(--color-danger); }
.categories {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
  max-inline-size: 40rem;
}
.category {
  display: grid;
  gap: 2px;
  min-inline-size: 0;
}
.category__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}
.category__name {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
}
.category__points {
  flex-shrink: 0;
  margin-inline-start: auto;
  white-space: nowrap;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}
.category__points[data-off='yes'] {
  color: var(--color-text-primary);
}
.category__label {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.tips,
.folders {
  display: grid;
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}
.tip + .tip,
.folder + .folder {
  border-block-start: 1px solid var(--color-border);
}
.tip {
  display: grid;
  grid-template-columns: 8.75rem minmax(0, 1fr);
  align-items: start;
  gap: var(--space-3);
  padding-block: var(--space-3);
}
.tip__gain {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
  color: var(--color-brand-amber-ui);
}
.tip__text {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  overflow-wrap: anywhere;
}
.folder__link {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  align-items: start;
  gap: var(--space-3);
  padding-block: var(--space-3);
  color: inherit;
  text-decoration: none;
  border-radius: var(--r-sm, 6px);
}
.folder__link:hover {
  background: color-mix(in srgb, var(--color-brand-navy) 10%, transparent);
}
.folder__link:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.folder__score {
  display: grid;
  justify-items: start;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}
.folder__value {
  font-size: var(--text-16, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.2;
}
.folder__body {
  display: grid;
  gap: 2px;
  min-inline-size: 0;
}
.folder__name {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
  overflow-wrap: anywhere;
}
.folder__path {
  font-family: var(--font-family-mono);
  font-size: var(--text-12);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.folder__summary {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
@media (max-width: 760px) {
  .tip {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
  .folder__link {
    grid-template-columns: 4.75rem minmax(0, 1fr);
  }
}
</style>
