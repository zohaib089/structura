<script setup lang="ts">
import BrandMark from '../brand/BrandMark.vue'
import { BRAND } from '../../../../../packages/brand/src/brand'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isSupportedWebLocale } from '../../services/locale'
import { navigationMessages } from '../../services/navigation-messages'
import { authCoreMessages } from '../../services/auth-core-messages'

const route = useRoute()

/** Decorative ring-graph nodes [x, y, r] around the nucleus at (300, 300). */
const motifNodes: Array<[number, number, number]> = [
  [390, 300, 6], [236, 236, 5], [300, 140, 5], [460, 220, 6], [413, 413, 5],
  [180, 380, 6], [530, 330, 5], [300, 530, 6], [110, 250, 5], [470, 470, 4]
]
const locale = computed(() => {
  const raw = route?.params.locale
  return typeof raw === 'string' && isSupportedWebLocale(raw) ? raw : 'en'
})
const tagline = computed(() => navigationMessages(locale.value).brandTagline)
const core = computed(() => authCoreMessages(locale.value))

const props = defineProps({
  eyebrow: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell">
      <aside class="brand-panel" :aria-label="BRAND.name">
        <svg class="brand-motif" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
          <g class="brand-motif__rings">
            <circle v-for="r in [90, 160, 230, 290]" :key="r" cx="300" cy="300" :r="r" />
          </g>
          <g class="brand-motif__edges">
            <line v-for="(n, i) in motifNodes" :key="`e${i}`" x1="300" y1="300" :x2="n[0]" :y2="n[1]" />
          </g>
          <g class="brand-motif__nodes">
            <circle v-for="(n, i) in motifNodes" :key="`n${i}`" :cx="n[0]" :cy="n[1]" :r="n[2]" />
          </g>
          <circle class="brand-motif__core" cx="300" cy="300" r="9" />
        </svg>
        <div class="brand-panel__inner">
          <BrandMark :size="56" :title="BRAND.name" />
          <p class="wordmark">{{ BRAND.name }}</p>
          <p class="tagline">{{ tagline }}</p>
        </div>
      </aside>

      <main class="form-panel">
        <div class="form-panel__inner">
          <div class="form-topline">
            <span class="eyebrow">{{ props.eyebrow || core.loginEyebrow }}</span>
          </div>

          <slot name="top" />

          <div class="panel-header">
            <h1>{{ props.title || core.loginTitle }}</h1>
            <p v-if="props.subtitle">{{ props.subtitle }}</p>
          </div>

          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: calc(100vh - var(--shell-topbar-height, 48px));
  background: var(--gray-0);
  overflow: hidden;
}

.auth-shell {
  display: grid;
  grid-template-columns: minmax(20rem, 0.95fr) minmax(0, 1.15fr);
  width: 100%;
  min-height: inherit;
}

/* Navy brand panel: Nucleus mark, value line and a quiet ring-graph motif (dark in both themes). */
.brand-panel {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: flex-end;
  padding: clamp(var(--space-8), 4.5vw, var(--space-16));
  overflow: hidden;
  background:
    radial-gradient(60% 50% at 70% 38%, color-mix(in srgb, var(--color-brand-amber-ui) 12%, transparent), transparent 70%),
    linear-gradient(165deg, var(--color-brand-navy-lift) 0%, var(--color-brand-navy) 48%, #0e1d38 100%);
  color: #dbe6f8;
  border-inline-end: 1px solid #2a4a80;
}

.brand-motif {
  position: absolute;
  inset-block-start: 4%;
  inset-inline-end: -18%;
  z-index: -1;
  width: min(620px, 115%);
  height: auto;
  opacity: 0.9;
}
.brand-motif__rings circle {
  fill: none;
  stroke: #4a6fa8;
  stroke-width: 1;
  stroke-dasharray: 2 6;
  opacity: 0.55;
}
.brand-motif__edges line {
  stroke: #4a6fa8;
  stroke-width: 1;
  opacity: 0.45;
}
.brand-motif__nodes circle {
  fill: #0e1d38;
  stroke: #9cbcf0;
  stroke-width: 1.5;
}
.brand-motif__core {
  fill: #e0a040;
  filter: drop-shadow(0 0 10px rgb(224 160 64 / 0.7));
}

.brand-panel__inner {
  display: grid;
  gap: var(--space-3);
  width: min(28rem, 100%);
}

.wordmark {
  margin: var(--space-2) 0 0;
  color: #ffffff;
  font-size: clamp(var(--font-size-3xl), 3vw, var(--font-size-5xl));
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.tagline {
  margin: 0;
  max-width: 22em;
  color: #c3d3ee;
  line-height: var(--line-height-relaxed);
  font-size: var(--text-18, 18px);
}

.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(var(--space-8), 4vw, var(--space-12)) clamp(var(--space-5), 4.5vw, var(--space-12));
  background:
    radial-gradient(50% 40% at 50% 0%, color-mix(in srgb, var(--color-brand-navy) 22%, transparent), transparent 70%),
    var(--gray-0);
}

/* The form card */
.form-panel__inner {
  width: min(30rem, 100%);
  padding: clamp(var(--space-6), 3vw, var(--space-10));
  border: 1px solid color-mix(in srgb, #4a6fa8 28%, var(--gray-4));
  border-radius: 20px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-brand-navy) 12%, var(--gray-1)) 0%, var(--gray-1) 45%);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.03) inset, 0 30px 60px -36px rgb(0 0 0 / 0.75);
}

.form-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-brand-amber-ui);
  font: 500 12px/16px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.eyebrow::before {
  content: '';
  width: 22px;
  height: 1px;
  background: currentColor;
}

.panel-header {
  margin: var(--space-5) 0 var(--space-5);
}

.panel-header h1 {
  margin: 0 0 var(--space-2);
  color: var(--gray-10);
  font-size: clamp(var(--text-24), 2.2vw, 30px);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.025em;
  line-height: 1.15;
}

.panel-header p {
  margin: 0;
  color: var(--gray-8);
  line-height: var(--line-height-relaxed);
}

[data-theme='light'] .form-panel {
  background:
    radial-gradient(50% 40% at 50% 0%, color-mix(in srgb, var(--color-brand-navy) 7%, transparent), transparent 70%),
    var(--gray-1);
}

[data-theme='light'] .form-panel__inner {
  background: #ffffff;
  border-color: color-mix(in srgb, #4a6fa8 20%, var(--gray-4));
  box-shadow: 0 1px 2px rgb(16 24 40 / 0.05), 0 24px 48px -32px rgb(14 29 56 / 0.35);
}

[data-theme='light'] .brand-panel {
  background:
    radial-gradient(60% 50% at 70% 38%, color-mix(in srgb, #e0a040 12%, transparent), transparent 70%),
    linear-gradient(165deg, #1b3a6b 0%, var(--color-brand-navy) 55%, #0e1d38 100%);
}

@media (max-width: 900px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  /* Phone/tablet: a compact brand strip, then the form. */
  .brand-panel {
    align-items: center;
    min-height: auto;
    padding: var(--space-5) var(--space-6);
    border-inline-end: none;
    border-block-end: 1px solid #2a4a80;
  }
  .brand-motif {
    inset-block-start: 50%;
    inset-inline-end: -60px;
    width: 260px;
    transform: translateY(-50%);
    opacity: 0.6;
  }
  .brand-panel__inner {
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: var(--space-3);
    row-gap: 0;
  }
  .brand-panel__inner :deep(.brand-mark) {
    grid-row: span 2;
    width: 40px;
    height: 40px;
  }
  .wordmark {
    margin: 0;
    font-size: var(--font-size-xl, 20px);
  }
  .tagline {
    font-size: var(--text-13, 13px);
  }

  .form-panel {
    align-items: flex-start;
    padding-block: var(--space-6) var(--space-10);
  }
}

@media (max-width: 640px) {
  .brand-panel {
    padding-inline: var(--space-5);
  }
  .form-panel {
    padding-inline: var(--space-4);
  }
  .form-panel__inner {
    padding: var(--space-5);
    border-radius: 16px;
  }
}
</style>
