<script setup lang="ts">
import { computed } from 'vue'
import type { Scan } from '../../api/scans'
import {
  buildScanStepperItems,
  formatStepElapsed,
  scanStepperLiveMessage,
  type ScanLocalPhase,
  type ScanStepperItem,
  type ScanStepperPhase
} from '../../services/scan-step-display'
import Button from './Button.vue'
import HexLoader from './HexLoader.vue'

const props = defineProps<{
  scan: Scan | null
  localPhase?: ScanLocalPhase
  /** Phase titles (loading-and-toasts.md §1.4): Prepare, Upload, Queued, Analysing, Building report. */
  stepLabels: Record<ScanStepperPhase, string>
  /** One plain-language status line shown under the active / done phase. */
  statusLines?: Partial<Record<ScanStepperPhase, string>>
  queuedLabel: string
  terminalLabels: Record<'succeeded' | 'failed' | 'cancelled', string>
  cancelling?: boolean
  failedPhase?: ScanStepperPhase | null
  cancelLabel?: string
  cancellingLabel?: string
  showCancel?: boolean
  /** One-line plain reason shown under the failed phase (no HTTP codes or stack traces). */
  failureReason?: string
  /** When set, a Retry button appears under a failed / errored run. */
  retryLabel?: string
  /** Elapsed ms per phase (client-tracked). */
  phaseElapsedMs?: Partial<Record<ScanStepperPhase, number>>
  /** Progress 0–1 for the active phase (optional). */
  activeProgress?: number | null
}>()

const emit = defineEmits<{ cancel: []; retry: [] }>()

const items = computed<ScanStepperItem[]>(() =>
  buildScanStepperItems(props.scan, {
    localPhase: props.localPhase,
    failedPhase: props.failedPhase,
    cancelling: props.cancelling
  })
)

const liveMessage = computed(() =>
  scanStepperLiveMessage(props.scan, props.stepLabels, {
    localPhase: props.localPhase,
    cancelling: props.cancelling,
    cancellingLabel: props.cancellingLabel,
    queuedLabel: props.queuedLabel,
    terminalLabels: props.terminalLabels
  })
)

const canRetry = computed(
  () =>
    Boolean(props.retryLabel) &&
    (props.scan?.status === 'failed' || Boolean(props.failedPhase && !props.scan))
)

const canCancel = computed(
  () =>
    props.showCancel === true &&
    props.scan !== null &&
    (props.scan.status === 'queued' || props.scan.status === 'running') &&
    !props.cancelling
)

function stepStateLabel(state: ScanStepperItem['state']): string {
  switch (state) {
    case 'pending':
      return 'Pending'
    case 'active':
      return 'In progress'
    case 'done':
      return 'Complete'
    case 'error':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
  }
}

function statusFor(item: ScanStepperItem): string {
  if (item.state === 'error' && props.failureReason) return props.failureReason
  if (item.state === 'done' && item.id === 'upload') return props.statusLines?.upload ?? 'Complete'
  if (item.state === 'pending') return props.statusLines?.[item.id] ? '' : 'Pending'
  return props.statusLines?.[item.id] ?? ''
}

function elapsedFor(item: ScanStepperItem): string {
  if (item.state === 'pending') return '—'
  return formatStepElapsed(props.phaseElapsedMs?.[item.id])
}
</script>

<template>
  <div class="scan-stepper" data-testid="scan-stepper">
    <p class="scan-stepper__live" aria-live="polite" aria-atomic="true">
      {{ liveMessage }}
    </p>
    <ol class="scan-stepper__list">
      <li
        v-for="item in items"
        :key="item.id"
        class="scan-stepper__step"
        :data-state="item.state"
        :data-phase="item.id"
      >
        <span class="scan-stepper__marker" aria-hidden="true">
          <span v-if="item.state === 'done'" class="scan-stepper__dot scan-stepper__dot--done">✓</span>
          <span v-else-if="item.state === 'error'" class="scan-stepper__dot scan-stepper__dot--error">!</span>
          <span v-else-if="item.state === 'cancelled'" class="scan-stepper__dot scan-stepper__dot--cancelled">×</span>
          <span v-else-if="item.state === 'active'" class="scan-stepper__dot scan-stepper__dot--active">
            <HexLoader size="sm" :label="stepLabels[item.id]" hide-label inline :delay="0" :min-visible="0" />
          </span>
          <span v-else class="scan-stepper__dot">{{ item.index }}</span>
        </span>
        <div class="scan-stepper__body">
          <div class="scan-stepper__row">
            <span class="scan-stepper__label">{{ stepLabels[item.id] }}</span>
            <span class="scan-stepper__elapsed">{{ elapsedFor(item) }}</span>
          </div>
          <span class="scan-stepper__state">{{ stepStateLabel(item.state) }}</span>
          <span v-if="statusFor(item)" class="scan-stepper__status">{{ statusFor(item) }}</span>
          <div
            v-if="item.state === 'active' && activeProgress != null"
            class="scan-stepper__bar"
            role="progressbar"
            :aria-valuenow="Math.round(activeProgress * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <i :style="{ width: `${Math.min(100, Math.max(0, activeProgress * 100))}%` }" />
          </div>
          <div v-else-if="item.state === 'active'" class="scan-stepper__bar scan-stepper__bar--indeterminate" aria-hidden="true">
            <i />
          </div>
        </div>
      </li>
    </ol>
    <div class="scan-stepper__actions">
      <Button
        v-if="canCancel && cancelLabel"
        variant="ghost"
        size="sm"
        type="button"
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </Button>
      <p v-else-if="cancelling" class="scan-stepper__cancelling" role="status">
        {{ cancellingLabel ?? 'Cancelling…' }}
      </p>
      <Button v-if="canRetry" variant="secondary" size="sm" type="button" @click="emit('retry')">
        {{ retryLabel }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.scan-stepper {
  display: grid;
  gap: var(--space-4);
  width: 100%;
}

.scan-stepper__live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.scan-stepper__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--color-border);
  width: 100%;
}

.scan-stepper__step {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}

.scan-stepper__marker {
  flex-shrink: 0;
  padding-top: 1px;
}

.scan-stepper__dot {
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 999px;
  border: 2px solid var(--color-border-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  background: transparent;
}

.scan-stepper__dot--done {
  border-color: var(--status-success, #3fb950);
  background: color-mix(in srgb, var(--status-success, #3fb950) 12%, transparent);
  color: var(--status-success, #3fb950);
}

.scan-stepper__dot--active {
  border-color: var(--color-brand-amber-ui);
  background: color-mix(in srgb, var(--color-brand-amber-ui) 14%, transparent);
  color: var(--color-brand-amber-ui);
}

.scan-stepper__dot--error {
  border-color: var(--sev-critical-fg);
  background: color-mix(in srgb, var(--sev-critical-bg) 80%, transparent);
  color: var(--sev-critical-fg);
}

.scan-stepper__dot--cancelled {
  border-color: var(--color-border-strong);
  color: var(--color-text-secondary);
}

.scan-stepper__body {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: var(--space-1);
}

.scan-stepper__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.scan-stepper__label {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.scan-stepper__step[data-state='pending'] .scan-stepper__label {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.scan-stepper__elapsed {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.scan-stepper__state {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.scan-stepper__status {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-secondary);
}

.scan-stepper__step[data-state='error'] .scan-stepper__status {
  color: var(--sev-critical-fg);
  font-weight: var(--font-weight-medium);
}

.scan-stepper__bar {
  margin-top: var(--space-2);
  height: 4px;
  max-width: 11.25rem;
  border-radius: 2px;
  background: var(--gray-3);
  overflow: hidden;
}

.scan-stepper__bar > i {
  display: block;
  height: 100%;
  background: var(--color-brand-amber-ui);
  width: 0;
}

.scan-stepper__bar--indeterminate > i {
  width: 40%;
  animation: scan-stepper-indeterminate 1.2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .scan-stepper__bar--indeterminate > i {
    animation: none;
    width: 62%;
  }
}

@keyframes scan-stepper-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}

.scan-stepper__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.scan-stepper__cancelling {
  margin: 0;
  font-size: var(--text-13);
  color: var(--color-text-secondary);
}
</style>
