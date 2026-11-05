<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'
import type { Scan } from '../../api/scans'
import { createGitScan, createUploadScan } from '../../api/scans'
import { zipBrowserFiles, zipDirectoryHandle } from '../../services/folder-zip'
import { validateZipUpload } from '../../services/upload-archive'
import { scanMessages } from '../../services/scan-messages'
import { dashboardMessages } from '../../services/dashboard-messages'
import { scanReportPath } from '../../services/dashboard-routes'
import { useScanRun } from '../../composables/useScanRun'
import { useToast } from '../../composables/useToast'
import { formatByteSize } from '../../viewer/text'
import { isScanInFlight } from '../../services/scan-step-display'
import ErrorState from '../ui/ErrorState.vue'
import ScanStepper from '../ui/ScanStepper.vue'
import OpenFolderSource from './open/OpenFolderSource.vue'
import OpenZipSource from './open/OpenZipSource.vue'
import OpenGitSource from './open/OpenGitSource.vue'
import type { WebLocale } from '../../services/locale'

const props = defineProps<{
  workspaceId: string
  locale: WebLocale
  disabled?: boolean
  /** Optional project used when navigating to the report after a successful scan. */
  projectId?: string | null
  /** When true, hide the page title (used inside DashboardScansHub which already has a header). */
  embedded?: boolean
}>()

const emit = defineEmits<{
  scanFinished: [scan: Scan]
}>()

type SourceTab = 'folder' | 'zip' | 'git'

const router = useRouter()
const toast = useToast()
const messages = computed(() => scanMessages(props.locale))
const sharedMessages = computed(() => dashboardMessages(props.locale))
const tab = ref<SourceTab>('folder')
const folderSource = ref<{ openBrowse: () => void } | null>(null)

const {
  activeScan,
  preparing,
  localPhase,
  cancelling,
  error,
  lastFailedPhase,
  phaseElapsedMs,
  prepareDetail,
  runAfterCreate,
  runWithPrepare,
  cancelActiveScan,
  retryLastRun
} = useScanRun({
  workspaceId: toRef(props, 'workspaceId'),
  scanFailedMessage: messages.value.scanFailed,
  onFinished(scan) {
    emit('scanFinished', scan)
    if (scan.status === 'succeeded') {
      const projectId = props.projectId?.trim() || 'default'
      const reportPath = scanReportPath(props.locale, props.workspaceId, projectId, scan.id)
      toast.success(messages.value.scanCompleteToast, {
        action: {
          label: messages.value.viewReportAction,
          onAction: () => {
            void router.push(reportPath)
          }
        },
        focusAction: true
      })
      void router.push(reportPath)
    }
  }
})

const busy = computed(
  () =>
    preparing.value ||
    localPhase.value !== 'idle' ||
    cancelling.value ||
    (activeScan.value !== null && isScanInFlight(activeScan.value.status))
)

const showStepper = computed(
  () => activeScan.value !== null || localPhase.value !== 'idle' || Boolean(lastFailedPhase.value && error.value)
)

const canSubmit = computed(() => !busy.value && !props.disabled && props.workspaceId.length > 0)

const statusLines = computed(() => {
  const base = messages.value.scanStepStatusLines()
  if (prepareDetail.value) {
    return { ...base, prepare: prepareDetail.value }
  }
  return base
})

const zipHint = computed(() => messages.value.zipHint(messages.value.archiveLimitLabel))

async function startGitScan(payload: { url: string; branch?: string }) {
  await runAfterCreate(async () => createGitScan(props.workspaceId, payload.url, payload.branch))
}

async function onZipFile(file: File) {
  const issue = validateZipUpload(file)
  if (issue === 'invalid') {
    error.value = messages.value.invalidZipUpload
    return
  }
  if (issue === 'too-large') {
    error.value = messages.value.zipUploadTooLarge(
      formatByteSize(file.size, props.locale),
      messages.value.archiveLimitLabel
    )
    return
  }

  await runAfterCreate(async () => createUploadScan(props.workspaceId, file, file.name))
}

async function onFolderFiles(files: FileList) {
  let archive: File | undefined
  await runWithPrepare(
    async () => {
      archive = await zipBrowserFiles(files)
    },
    async () => createUploadScan(props.workspaceId, archive!, archive!.name)
  )
}

async function pickDirectoryHandle() {
  if (!('showDirectoryPicker' in window)) {
    folderSource.value?.openBrowse()
    return
  }
  try {
    const picker = window.showDirectoryPicker
    if (!picker) {
      folderSource.value?.openBrowse()
      return
    }
    const handle = await picker.call(window)
    let archive: File | undefined
    await runWithPrepare(
      async () => {
        archive = await zipDirectoryHandle(handle, handle.name || 'project')
      },
      async () => createUploadScan(props.workspaceId, archive!, archive!.name),
      `Zipping ${handle.name || 'folder'}…`
    )
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') return
    error.value = cause instanceof Error ? cause.message : messages.value.scanFailed
  }
}

function onRetry() {
  error.value = ''
  retryLastRun()
}

</script>

<template>
  <section class="open-project" :aria-label="messages.openProjectTitle" data-testid="open-project-panel">
    <header v-if="!embedded" class="open-project__header">
      <h1 class="open-project__title">{{ messages.openProjectTitle }}</h1>
      <p class="open-project__hint">{{ messages.openProjectHint }}</p>
    </header>

    <div class="open-project__seg" role="tablist" :aria-label="messages.openProjectTitle">
      <button
        type="button"
        role="tab"
        class="open-project__seg-btn"
        :class="{ 'open-project__seg-btn--active': tab === 'folder' }"
        :aria-selected="tab === 'folder'"
        :disabled="busy"
        @click="tab = 'folder'"
      >
        {{ messages.sourceFolder }}
      </button>
      <button
        type="button"
        role="tab"
        class="open-project__seg-btn"
        :class="{ 'open-project__seg-btn--active': tab === 'zip' }"
        :aria-selected="tab === 'zip'"
        :disabled="busy"
        @click="tab = 'zip'"
      >
        {{ messages.sourceZip }}
      </button>
      <button
        type="button"
        role="tab"
        class="open-project__seg-btn"
        :class="{ 'open-project__seg-btn--active': tab === 'git' }"
        :aria-selected="tab === 'git'"
        :disabled="busy"
        @click="tab = 'git'"
      >
        {{ messages.sourceGit }}
      </button>
    </div>

    <div v-show="tab === 'folder'" role="tabpanel" class="open-project__panel">
      <OpenFolderSource
        ref="folderSource"
        :disabled="!canSubmit"
        :drop-title="messages.folderDropTitle"
        :browse-label="messages.browseLabel"
        :hint="messages.folderHint"
        @pick-directory="pickDirectoryHandle"
        @folder-files="onFolderFiles"
      />
    </div>

    <div v-show="tab === 'zip'" role="tabpanel" class="open-project__panel">
      <OpenZipSource
        :disabled="!canSubmit"
        :drop-title="messages.zipDropTitle"
        :browse-label="messages.browseLabel"
        :hint="zipHint"
        @zip-file="onZipFile"
      />
    </div>

    <div v-show="tab === 'git'" role="tabpanel" class="open-project__panel">
      <OpenGitSource
        :disabled="!canSubmit"
        :busy="busy && tab === 'git'"
        :url-label="messages.gitUrlLabel"
        :branch-label="messages.branchLabel"
        :branch-optional="messages.branchOptional"
        :start-label="messages.startScan"
        :scanning-label="messages.scanning"
        :invalid-url-message="messages.invalidGitUrl"
        :url-hint="messages.gitUrlHint"
        @submit="startGitScan"
      />
    </div>

    <div v-if="showStepper" class="open-project__progress">
      <h2 class="open-project__progress-title">{{ messages.progressHeading }}</h2>
      <ScanStepper
        :scan="activeScan"
        :local-phase="localPhase"
        :step-labels="messages.scanStepLabels()"
        :queued-label="messages.scanStepQueued"
        :status-lines="statusLines"
        :terminal-labels="messages.scanStepTerminalLabels()"
        :failed-phase="lastFailedPhase"
        :phase-elapsed-ms="phaseElapsedMs"
        :cancelling="cancelling"
        :cancel-label="messages.scanCancel"
        :cancelling-label="messages.scanCancelling"
        :failure-reason="error || undefined"
        :retry-label="error ? sharedMessages.retry : undefined"
        show-cancel
        @cancel="cancelActiveScan"
        @retry="onRetry"
      />
    </div>

    <ErrorState
      v-if="error && !showStepper"
      :message="error"
      :retry-label="sharedMessages.retry"
      @retry="onRetry"
    />
  </section>
</template>

<style scoped>
.open-project {
  display: grid;
  gap: var(--space-5);
  width: 100%;
  max-width: none;
  padding: 0;
  border: 0;
  background: transparent;
}

.open-project__header {
  display: grid;
  gap: var(--space-2);
}

.open-project__title {
  margin: 0;
  font-size: var(--text-24, 1.5rem);
  line-height: 1.25;
  font-weight: var(--font-weight-semibold);
}

.open-project__hint {
  margin: 0;
  max-width: 42rem;
  color: var(--color-text-secondary);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.open-project__seg {
  display: inline-flex;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-sm);
  overflow: hidden;
  width: fit-content;
}

.open-project__seg-btn {
  height: 2rem;
  padding: 0 var(--space-4);
  background: transparent;
  border: 0;
  border-right: 1px solid var(--color-border-strong);
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-13);
  font-weight: var(--font-weight-medium);
}

.open-project__seg-btn:last-child {
  border-right: 0;
}

.open-project__seg-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.open-project__seg-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  position: relative;
  z-index: 1;
}

.open-project__seg-btn--active {
  background: var(--gray-3);
  color: var(--color-text-primary);
}

.open-project__panel {
  width: 100%;
}

.open-project__progress {
  display: grid;
  gap: var(--space-3);
  width: 100%;
}

.open-project__progress-title {
  margin: 0;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}
</style>
