<script setup lang="ts">
import { computed } from 'vue'
import type { ScanStep } from '../../api/scans'
import {
  buildScanStepperItems,
  scanStepperLiveMessage,
  type ScanStepperItem
} from '../../services/scan-step-display'
import type { Scan } from '../../api/scans'
import Button from './Button.vue'

const props = defineProps<{
  scan: Scan
  stepLabels: Record<ScanStep, string>
  queuedLabel: string
  terminalLabels: Record<'succeeded' | 'failed' | 'cancelled', string>
  cancelling?: boolean
  failedStep?: ScanStep | null
  cancelLabel?: string
  cancellingLabel?: string
  showCancel?: boolean
}>()

const emit = defineEmits<{ cancel: [] }>()

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
          <span v-else-if="item.state === 'active'" class="scan-stepper__pulse">●</span>
          <span v-else>○</span>
        </span>
        <span class="scan-stepper__text">
          <span class="scan-stepper__label">{{ stepLabels[item.id] }}</span>
          <span class="scan-stepper__state">{{ stepStateLabel(item.state) }}</span>
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

.scan-stepper__pulse {
  display: inline-block;
  animation: scan-stepper-pulse var(--duration-slow) ease-in-out infinite;
}

.scan-stepper__cancelling {
  margin: 0;
  font-size: var(--text-13);
  color: var(--color-text-secondary);
}

@media (prefers-reduced-motion: reduce) {
  .scan-stepper__pulse {
    animation: none;
  }
}

@keyframes scan-stepper-pulse {
  50% {
    opacity: 0.45;
  }
}
</style>
