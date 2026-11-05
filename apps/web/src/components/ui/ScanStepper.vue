<script setup lang="ts">
import { computed } from 'vue'
import type { Scan, ScanStep } from '../../api/scans'
import {
  buildScanStepperItems,
  scanStepperLiveMessage,
  type ScanStepperItem,
  type ScanStepperPhase
} from '../../services/scan-step-display'
import Button from './Button.vue'
import HexLoader from './HexLoader.vue'

const props = defineProps<{
  scan: Scan
  /** Phase titles (loading-and-toasts.md §1.4): Waiting to start, Preparing files, Reading files, Analysing code, Building report. */
  stepLabels: Record<ScanStepperPhase, string>
  /** One plain-language status line shown under the active phase. */
  statusLines?: Partial<Record<ScanStepperPhase, string>>
  queuedLabel: string
  terminalLabels: Record<'succeeded' | 'failed' | 'cancelled', string>
  cancelling?: boolean
  failedStep?: ScanStep | null
  cancelLabel?: string
  cancellingLabel?: string
  showCancel?: boolean
  /** One-line plain reason shown under the failed phase (no HTTP codes or stack traces). */
  failureReason?: string
  /** When set, a Retry button appears under a failed scan. */
  retryLabel?: string
}>()

const emit = defineEmits<{ cancel: []; retry: [] }>()

const items = computed<ScanStepperItem[]>(() =>
  buildScanStepperItems(props.scan, {
    failedStep: props.failedStep,
    cancelling: props.cancelling
  })
)

const liveMessage = computed(() =>
  scanStepperLiveMessage(props.scan, props.stepLabels, {
    cancelling: props.cancelling,
    cancellingLabel: props.cancellingLabel,
    queuedLabel: props.queuedLabel,
    terminalLabels: props.terminalLabels
  })
)

const canRetry = computed(() => props.scan.status === 'failed' && Boolean(props.retryLabel))

const canCancel = computed(
  () =>
    props.showCancel === true &&
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
</script>

<template>
  <div class="scan-stepper">
    <p class="scan-stepper__live" aria-live="polite" aria-atomic="true">
      {{ liveMessage }}
    </p>
    <ol class="scan-stepper__list">
      <li
        v-for="item in items"
        :key="item.id"
        class="scan-stepper__step"
        :data-state="item.state"
      >
        <span class="scan-stepper__marker" aria-hidden="true">
          <span v-if="item.state === 'done'">✓</span>
          <span v-else-if="item.state === 'error'">!</span>
          <span v-else-if="item.state === 'cancelled'">×</span>
          <HexLoader v-else-if="item.state === 'active'" size="sm" :label="stepLabels[item.id]" hide-label inline :delay="0" :min-visible="0" />
          <span v-else>○</span>
        </span>
        <span class="scan-stepper__text">
          <span class="scan-stepper__label">{{ stepLabels[item.id] }}</span>
          <span class="scan-stepper__state">{{ stepStateLabel(item.state) }}</span>
          <span v-if="item.state === 'active' && statusLines?.[item.id]" class="scan-stepper__status">
            {{ statusLines[item.id] }}
          </span>
          <span v-else-if="item.state === 'error' && failureReason" class="scan-stepper__status">
            {{ failureReason }}
          </span>
        </span>
      </li>
    </ol>
    <Button
      v-if="canCancel && cancelLabel"
      variant="secondary"
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
</template>

<style scoped>
.scan-stepper {
  display: grid;
  gap: var(--space-3);
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
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.scan-stepper__step {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.scan-stepper__marker {
  inline-size: 1.25rem;
  text-align: center;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.scan-stepper__step[data-state='active'] .scan-stepper__marker {
  color: var(--accent);
}

.scan-stepper__step[data-state='done'] .scan-stepper__marker {
  color: var(--status-success);
}

.scan-stepper__step[data-state='error'] .scan-stepper__marker {
  color: var(--sev-critical-fg);
}

.scan-stepper__step[data-state='cancelled'] .scan-stepper__marker {
  color: var(--color-text-secondary);
}

.scan-stepper__text {
  display: grid;
  gap: var(--space-1);
}

.scan-stepper__label {
  font-weight: var(--font-weight-medium);
}

.scan-stepper__state {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-secondary);
}

.scan-stepper__step[data-state='error'] .scan-stepper__state {
  color: var(--sev-critical-fg);
  font-weight: var(--font-weight-medium);
}

.scan-stepper__status {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-secondary);
}

.scan-stepper__cancelling {
  margin: 0;
  font-size: var(--text-13);
  color: var(--color-text-secondary);
}
</style>
