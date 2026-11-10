<script setup lang="ts">
import { useLandingCopy } from '../../composables/useLandingCopy'
import LandingSection from './LandingSection.vue'

const copy = useLandingCopy()

/** Line style per link kind: solid, dashed, dotted (hollow dotted ends for "couldn't confirm"). */
const LINE: Record<string, { dash?: string; width: number; cap?: 'round'; hollow?: boolean }> = {
  extracted: { width: 1.8 },
  inferred: { dash: '7 5', width: 1.8 },
  unresolved: { dash: '1.5 5', width: 2, cap: 'round', hollow: true }
}
</script>

<template>
  <LandingSection id="product" labelledby="landing-edge-h">
    <div class="conn">
      <div>
        <p class="landing-kicker">{{ copy.connections.kicker }}</p>
        <h2 id="landing-edge-h" class="landing-h2">{{ copy.connections.title }}</h2>
        <p class="landing-lead">{{ copy.connections.lead }}</p>
      </div>
      <div class="conn__rows">
        <div v-for="row in copy.connections.rows" :key="row.kind" class="conn__row">
          <svg viewBox="0 0 150 28" aria-hidden="true">
            <circle
              v-for="cx in [8, 142]"
              :key="cx"
              :cx="cx"
              cy="14"
              r="5"
              :fill="LINE[row.kind]?.hollow ? 'var(--gray-0)' : 'var(--gray-2)'"
              stroke="var(--gray-8)"
              stroke-width="1.6"
              :stroke-dasharray="LINE[row.kind]?.hollow ? '2 3' : undefined"
            />
            <line
              x1="13"
              y1="14"
              x2="137"
              y2="14"
              stroke="var(--gray-8)"
              :stroke-width="LINE[row.kind]?.width"
              :stroke-dasharray="LINE[row.kind]?.dash"
              :stroke-linecap="LINE[row.kind]?.cap"
            />
          </svg>
          <div>
            <h3>{{ row.title }} <span class="conn__tag">{{ row.tag }}</span></h3>
            <p>{{ row.body }}</p>
            <code dir="ltr"><span class="conn__comment">{{ row.commentLine }}</span><span class="conn__line">{{ row.codeLine }}</span></code>
          </div>
        </div>
      </div>
    </div>
  </LandingSection>
</template>

<style scoped>
.conn {
  display: grid;
  grid-template-columns: 5fr 7fr;
  gap: clamp(32px, 6vw, 96px);
  align-items: start;
}
.conn__rows {
  border-block-start: 1px solid var(--gray-4);
}
.conn__row {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: var(--space-6);
  align-items: start;
  padding-block: var(--space-6);
  border-block-end: 1px solid var(--gray-4);
}
.conn__row > svg {
  display: block;
  inline-size: 150px;
  block-size: 28px;
}
h3 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin: 0 0 var(--space-1);
  font: 600 18px/1.3 var(--font-family-sans);
}
.conn__tag {
  padding: 1px var(--space-2);
  border: 1px solid var(--gray-5);
  border-radius: var(--r-xs);
  color: var(--gray-8);
  font: 500 11px/16px var(--landing-font-mono);
  letter-spacing: 0.06em;
}
.conn__row p {
  margin: 0;
  color: var(--gray-8);
  font-size: 15px;
}
code {
  display: block;
  margin-block-start: 10px;
  padding: var(--space-2) var(--space-3);
  overflow-x: auto;
  border: 1px solid var(--gray-4);
  border-radius: var(--r-sm);
  background: var(--gray-1);
  color: var(--gray-10);
  font: 400 12.5px/1.5 var(--landing-font-mono);
  white-space: pre;
}
.conn__comment,
.conn__line {
  display: block;
}
.conn__comment {
  color: var(--gray-7);
}

@media (max-width: 900px) {
  .conn {
    grid-template-columns: 1fr;
  }
  .conn__row {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
}
</style>
