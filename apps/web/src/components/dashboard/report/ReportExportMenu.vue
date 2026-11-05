<script setup lang="ts">
/**
 * ReportExportMenu - one "Export" button with the formats scan-report-export.ts supports.
 * Exports respect the filters currently applied; the result is confirmed with a plain-language toast.
 */
import { onBeforeUnmount, ref } from 'vue'
import { ChevronDown, Download } from '@lucide/vue'
import type { FilteredScanReportExport } from '../../../api/scan-report-types'
import { useToast } from '../../../composables/useToast'
import {
  exportFilteredReportJson,
  exportFilteredReportMarkdown
} from '../../../services/scan-report-export'
import type { ScanReportMessages } from '../../../services/scan-report-messages'

type ExportFormat = 'json' | 'markdown'

const props = defineProps<{
  messages: ScanReportMessages
  scanId: string
  /** Built lazily so large reports are only serialised when someone exports. */
  buildPayload: () => FilteredScanReportExport
  findingCount: number
}>()

const toast = useToast()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const busy = ref<ExportFormat | null>(null)

function close(restoreFocus = false) {
  open.value = false
  if (restoreFocus) trigger.value?.focus()
}

function onDocumentPointer(event: Event) {
  if (root.value && event.target instanceof Node && !root.value.contains(event.target)) close()
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    document.addEventListener('pointerdown', onDocumentPointer)
    queueMicrotask(() => root.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus())
  } else {
    document.removeEventListener('pointerdown', onDocumentPointer)
  }
}

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointer))

function filenameFor(format: ExportFormat): string {
  return `scan-report-${props.scanId}.${format === 'json' ? 'json' : 'md'}`
}

function run(format: ExportFormat) {
  busy.value = format
  try {
    const payload = props.buildPayload()
    if (format === 'json') exportFilteredReportJson(payload, props.scanId)
    else exportFilteredReportMarkdown(payload, props.scanId)
    toast.success(props.messages.exportSuccessTitle, {
      body: props.messages.exportSuccessBody(filenameFor(format)),
      key: `report-export-success`
    })
  } catch {
    toast.error(props.messages.exportErrorTitle, {
      body: props.messages.exportErrorBody,
      key: 'report-export-error',
      action: { label: props.messages.exportRetry, onAction: () => run(format) },
      focusAction: true
    })
  } finally {
    busy.value = null
  }
}

function choose(format: ExportFormat) {
  close(true)
  document.removeEventListener('pointerdown', onDocumentPointer)
  run(format)
}

function onMenuKeydown(event: KeyboardEvent) {
  const items = [...(root.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (event.key === 'Escape') {
    event.preventDefault()
    close(true)
    document.removeEventListener('pointerdown', onDocumentPointer)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    items[(index + 1) % items.length]?.focus()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    items[(index - 1 + items.length) % items.length]?.focus()
  }
}
</script>

<template>
  <div ref="root" class="export-menu" @keydown="onMenuKeydown">
    <button
      ref="trigger"
      type="button"
      class="export-menu__trigger"
      aria-haspopup="menu"
      :aria-expanded="open"
      :title="messages.exportMenuTooltip"
      data-testid="report-export-trigger"
      @click="toggle"
    >
      <Download :size="14" aria-hidden="true" />
      <span>{{ messages.exportMenu }}</span>
      <ChevronDown :size="14" aria-hidden="true" />
    </button>
    <div v-if="open" class="export-menu__list" role="menu" :aria-label="messages.exportMenu">
      <p class="export-menu__scope">{{ messages.exportScope(findingCount) }}</p>
      <button
        type="button"
        role="menuitem"
        class="export-menu__item"
        :disabled="busy !== null"
        data-testid="report-export-json"
        @click="choose('json')"
      >
        <span class="export-menu__label">{{ messages.exportJsonLabel }}</span>
        <span class="export-menu__hint">{{ messages.exportJsonHint }}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        class="export-menu__item"
        :disabled="busy !== null"
        data-testid="report-export-markdown"
        @click="choose('markdown')"
      >
        <span class="export-menu__label">{{ messages.exportMarkdownLabel }}</span>
        <span class="export-menu__hint">{{ messages.exportMarkdownHint }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.export-menu {
  position: relative;
}

.export-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-block-size: 2rem;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-size: var(--text-13);
  cursor: pointer;
}

.export-menu__trigger:hover {
  background: var(--gray-3);
}

.export-menu__trigger:focus-visible,
.export-menu__item:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.export-menu__list {
  position: absolute;
  inset-inline-end: 0;
  inset-block-start: calc(100% + var(--space-1));
  z-index: 10;
  display: grid;
  min-inline-size: 16rem;
  padding: var(--space-1);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-md);
  background: var(--color-surface-raised);
  box-shadow: var(--elev-2, 0 8px 24px rgb(0 0 0 / 0.35));
}

.export-menu__scope {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-secondary);
}

.export-menu__item {
  display: grid;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.export-menu__item:hover:not(:disabled) {
  background: var(--gray-3);
}

.export-menu__label {
  font-size: var(--text-13);
  font-weight: var(--font-weight-medium);
}

.export-menu__hint {
  font-size: var(--text-12);
  color: var(--color-text-secondary);
}
</style>
