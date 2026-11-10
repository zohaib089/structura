<script setup lang="ts">
import { FileArchive, Folder, Link2 } from '@lucide/vue'
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLandingLinks } from '../../composables/useLandingLinks'
import { useToast } from '../../composables/useToast'
import { useLandingCopy } from '../../composables/useLandingCopy'
import { SEVERITY_ICONS } from '../../services/severity-display'
import BrandMark from '../brand/BrandMark.vue'
import HexLoader from '../ui/HexLoader.vue'
import LandingSection from './LandingSection.vue'

const copy = useLandingCopy()

const router = useRouter()
const links = useLandingLinks()
const toast = useToast()

const sourceIcons = [Folder, FileArchive, Link2]

const title = ref<string>(copy.how.loaderLabel)
const status = ref<string>(copy.how.initialStatus)
const progress = ref<number>(copy.how.initialProgress)
/** True while the loader spins. The page opens mid-scan, as in the mockup; it settles after a sample run. */
const running = ref(true)
const demoRunning = ref(false)

const timers = new Set<ReturnType<typeof setTimeout>>()
const demoToastIds = new Set<string>()

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function later(fn: () => void, ms: number) {
  const id = setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
}
function track(id: string): string {
  demoToastIds.add(id)
  return id
}

function runSample() {
  if (demoRunning.value) return
  demoRunning.value = true
  running.value = true
  track(toast.info(copy.toasts.scanStarted))
  const stepMs = reducedMotion() ? 500 : 1100
  let index = 0
  const step = () => {
    const phase = copy.how.phases[index]
    if (phase) {
      index += 1
      title.value = phase.title
      status.value = phase.status
      progress.value = phase.progress
      later(step, stepMs)
      return
    }
    title.value = copy.how.finished.title
    status.value = copy.how.finished.status
    progress.value = copy.how.finished.progress
    running.value = false
    demoRunning.value = false
    track(
      toast.success(copy.toasts.scanFinished, {
        body: copy.toasts.scanFinishedBody,
        action: { label: copy.toasts.viewMap, onAction: () => void router.push(links.viewer.value) },
        focusAction: true
      })
    )
  }
  step()
}

function previewToasts() {
  track(toast.info(copy.toasts.previewInfo, { body: copy.toasts.previewInfoBody }))
  track(toast.warning(copy.toasts.previewWarning, { body: copy.toasts.previewWarningBody }))
  track(
    toast.error(copy.toasts.previewError, {
      body: copy.toasts.previewErrorBody,
      action: { label: copy.toasts.retry, onAction: () => {} }
    })
  )
}

// Demo notifications must not outlive the page (the error one is sticky).
onBeforeUnmount(() => {
  for (const id of timers) clearTimeout(id)
  timers.clear()
  for (const id of demoToastIds) toast.dismiss(id)
  demoToastIds.clear()
})
</script>

<template>
  <LandingSection id="how" labelledby="landing-how-h">
    <div class="how__head">
      <p class="landing-kicker">{{ copy.how.kicker }}</p>
      <h2 id="landing-how-h" class="landing-h2">{{ copy.how.title }}</h2>
      <p class="landing-lead">{{ copy.how.lead }}</p>
    </div>

    <div class="how__steps">
      <article class="how__step">
        <span class="how__n">{{ copy.how.step }} 1</span>
        <h3>{{ copy.how.steps[0]?.title }}</h3>
        <p>{{ copy.how.steps[0]?.body }}</p>
        <div class="how__demo">
          <ul class="how__chips">
            <li v-for="(source, i) in copy.how.sources" :key="source">
              <component :is="sourceIcons[i]" :size="14" aria-hidden="true" />{{ source }}
            </li>
          </ul>
          <span class="how__path">
            {{ copy.how.checking.before }}<b>{{ copy.how.checking.files }}</b>{{ copy.how.checking.middle }}<b>{{ copy.how.checking.skipped }}</b>
          </span>
        </div>
      </article>

      <article class="how__step">
        <span class="how__n">{{ copy.how.step }} 2</span>
        <h3>{{ copy.how.steps[1]?.title }}</h3>
        <p>{{ copy.how.steps[1]?.body }}</p>
        <div class="how__demo" data-testid="scan-demo">
          <div class="how__scan">
            <span class="how__loader">
              <HexLoader v-if="running" size="lg" inline :delay="0" :min-visible="0" />
              <BrandMark v-else :size="40" />
            </span>
            <div class="how__scan-meta">
              <div class="how__scan-title" data-testid="scan-title">{{ title }}</div>
              <div class="how__scan-status" role="status" aria-live="polite" data-testid="scan-status">{{ status }}</div>
              <div class="how__bar" aria-hidden="true"><i :style="{ inlineSize: `${progress}%` }" /></div>
            </div>
          </div>
          <div class="how__actions">
            <button type="button" class="how__btn" :disabled="demoRunning" data-testid="run-scan" @click="runSample">
              {{ copy.how.runScan }}
            </button>
            <button type="button" class="how__btn" data-testid="preview-toasts" @click="previewToasts">
              {{ copy.how.previewToasts }}
            </button>
          </div>
        </div>
      </article>

      <article class="how__step">
        <span class="how__n">{{ copy.how.step }} 3</span>
        <h3>{{ copy.how.steps[2]?.title }}</h3>
        <p>{{ copy.how.steps[2]?.body }}</p>
        <div class="how__demo">
          <ul class="how__rows" :aria-label="copy.how.findingsLabel">
            <li v-for="finding in copy.how.findings" :key="finding.text" :style="{ color: `var(--sev-${finding.severity}-fg)` }">
              <component :is="SEVERITY_ICONS[finding.severity]" :size="14" aria-hidden="true" />
              <span class="how__sev">{{ copy.severity[finding.severity] }}</span>
              <span class="how__finding">{{ finding.text }}</span>
            </li>
          </ul>
        </div>
      </article>
    </div>
  </LandingSection>
</template>

<style scoped>
.how__head {
  margin-block-end: clamp(36px, 5vw, 64px);
}
.how__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-block: 1px solid var(--gray-4);
}
.how__step {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 32px 32px 36px 0;
}
.how__step + .how__step {
  padding-inline-start: 32px;
  border-inline-start: 1px solid var(--gray-4);
}
.how__n {
  color: var(--color-brand-amber-ui);
  font: 500 12px/16px var(--landing-font-mono);
  letter-spacing: 0.08em;
}
h3 {
  margin: 0;
  font: 600 22px/1.25 var(--font-family-sans);
  letter-spacing: -0.015em;
}
.how__step p {
  margin: 0;
  color: var(--gray-8);
  font-size: 15px;
}
.how__demo {
  min-block-size: 176px;
  margin-block-start: auto;
  padding-block-start: 14px;
  border-block-start: 1px dashed var(--gray-4);
}
.how__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.how__chips li {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-3);
  border: 1px solid var(--gray-5);
  border-radius: var(--r-full);
  background: var(--gray-1);
  color: var(--gray-10);
  font-size: var(--text-13);
}
.how__chips svg {
  color: var(--gray-8);
}
.how__path {
  display: block;
  margin-block-start: 14px;
  color: var(--gray-8);
  font: 400 12px/1.5 var(--landing-font-mono);
}
.how__path b {
  color: var(--gray-10);
  font-weight: var(--font-weight-medium);
}
.how__scan {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.how__loader {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 56px;
  block-size: 56px;
}
.how__scan-meta {
  flex: 1;
  min-inline-size: 0;
}
.how__scan-title {
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
}
.how__scan-status {
  min-block-size: 18px;
  color: var(--gray-8);
  font: 400 12px/1.5 var(--landing-font-mono);
}
.how__bar {
  block-size: 4px;
  margin-block-start: var(--space-2);
  overflow: hidden;
  border-radius: 2px;
  background: var(--gray-3);
}
.how__bar i {
  display: block;
  block-size: 100%;
  border-radius: 2px;
  background: var(--gray-10);
  transition: inline-size 0.4s var(--easing-product);
}
.how__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-block-start: 14px;
}
.how__btn {
  block-size: 32px;
  padding-inline: 14px;
  border: 1px solid var(--gray-5);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--gray-10);
  font-size: var(--text-13);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}
.how__btn:hover:not(:disabled) {
  background: var(--gray-3);
  border-color: var(--gray-7);
}
.how__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.how__rows {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}
.how__rows li {
  display: flex;
  align-items: center;
  gap: 10px;
  min-block-size: 38px;
  padding-block: 6px;
  border-block-end: 1px solid var(--gray-4);
  font-size: var(--text-13);
  line-height: 1.4;
}
.how__rows li:last-child {
  border-block-end: 0;
}
.how__rows svg {
  flex: none;
}
.how__sev {
  min-inline-size: 62px;
  font-weight: var(--font-weight-semibold);
}
.how__finding {
  color: var(--gray-10);
}

@media (prefers-reduced-motion: reduce) {
  .how__bar i {
    transition: none;
  }
}
@media (max-width: 900px) {
  .how__steps {
    grid-template-columns: 1fr;
  }
  .how__step,
  .how__step + .how__step {
    padding: 28px 0;
    border-inline-start: 0;
  }
  .how__step + .how__step {
    border-block-start: 1px solid var(--gray-4);
  }
}
</style>
