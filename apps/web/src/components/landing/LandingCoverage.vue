<script setup lang="ts">
import { Check, CircleAlert } from '@lucide/vue'
import { useLandingCopy } from '../../composables/useLandingCopy'
import LandingSection from './LandingSection.vue'

const copy = useLandingCopy()
</script>

<template>
  <LandingSection labelledby="landing-cov-h" tone="raised">
    <div class="cov">
      <div>
        <p class="landing-kicker">{{ copy.coverage.kicker }}</p>
        <h2 id="landing-cov-h" class="landing-h2">{{ copy.coverage.title }}</h2>
        <p class="landing-lead">{{ copy.coverage.lead }}</p>
        <p class="cov__note">{{ copy.coverage.note }}</p>
      </div>
      <div>
        <div class="cov__stat"><b>{{ copy.coverage.statValue }}</b><span>{{ copy.coverage.statLabel }}</span></div>
        <div class="cov__bar" role="img" :aria-label="copy.coverage.barLabel">
          <div class="cov__ok" :style="{ inlineSize: `${copy.coverage.checkedPercent}%` }" />
          <div class="cov__skipped" :style="{ inlineSize: `${100 - copy.coverage.checkedPercent}%` }" />
        </div>
        <ul class="cov__rows">
          <li v-for="row in copy.coverage.rows" :key="row.text">
            <component :is="row.icon === 'check' ? Check : CircleAlert" :size="16" aria-hidden="true" :class="`cov__icon cov__icon--${row.icon}`" />
            <span>{{ row.text }}<span class="cov__why">{{ row.why }}</span></span>
            <span class="cov__num">{{ row.count }}</span>
          </li>
        </ul>
      </div>
    </div>
  </LandingSection>
</template>

<style scoped>
.cov {
  display: grid;
  grid-template-columns: 5fr 7fr;
  gap: clamp(32px, 6vw, 96px);
  align-items: start;
}
.cov__note {
  margin: 18px 0 0;
  color: var(--gray-7);
  font-size: var(--text-13);
}
.cov__stat {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
}
.cov__stat b {
  font: 600 clamp(40px, 5vw, 64px) / 1 var(--font-family-sans);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.cov__stat span {
  color: var(--gray-8);
  font-size: 15px;
}
.cov__bar {
  display: flex;
  block-size: 14px;
  margin: 28px 0 12px;
  overflow: hidden;
  border: 1px solid var(--gray-5);
  border-radius: 7px;
}
.cov__ok {
  background: var(--gray-10);
}
.cov__skipped {
  background: repeating-linear-gradient(135deg, var(--gray-5) 0 4px, var(--gray-2) 4px 8px);
}
.cov__rows {
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
  border-block-start: 1px solid var(--gray-4);
}
.cov__rows li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: baseline;
  padding-block: 14px;
  border-block-end: 1px solid var(--gray-4);
  font-size: 15px;
}
.cov__icon {
  align-self: center;
}
.cov__icon--alert {
  color: var(--sev-medium-fg);
}
.cov__why {
  color: var(--gray-8);
  font-size: var(--text-14);
}
.cov__num {
  color: var(--gray-10);
  font: 500 13px var(--landing-font-mono);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 900px) {
  .cov {
    grid-template-columns: 1fr;
  }
  .cov__rows li {
    grid-template-columns: auto 1fr;
  }
  .cov__num {
    grid-column: 2;
  }
}
</style>
