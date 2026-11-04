<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import type { Scan } from '../../api/scans'
import { createGitScan, createUploadScan } from '../../api/scans'
import { zipBrowserFiles, zipDirectoryHandle } from '../../services/folder-zip'
import { validateZipUpload } from '../../services/upload-archive'
import { parseGitRemoteUrl, validateGitRemoteUrl } from '../../services/git-remote-url'
import { scanMessages } from '../../services/scan-messages'
import { dashboardMessages } from '../../services/dashboard-messages'
import { useScanRun } from '../../composables/useScanRun'
import { isScanInFlight } from '../../services/scan-step-display'
import ErrorState from '../ui/ErrorState.vue'
import ScanStepper from '../ui/ScanStepper.vue'
import Button from '../ui/Button.vue'
import type { WebLocale } from '../../services/locale'

const props = defineProps<{
  workspaceId: string
  locale: WebLocale
  disabled?: boolean
}>()

const emit = defineEmits<{
  scanFinished: [scan: Scan]
}>()

type SourceTab = 'local' | 'github' | 'gitlab'

const messages = computed(() => scanMessages(props.locale))
const sharedMessages = computed(() => dashboardMessages(props.locale))
const tab = ref<SourceTab>('local')
const githubUrl = ref('')
const gitlabUrl = ref('')
const branch = ref('')
const folderInput = ref<HTMLInputElement | null>(null)
const zipInput = ref<HTMLInputElement | null>(null)

const {
  activeScan,
  preparing,
  cancelling,
  error,
  lastFailedStep,
  runAfterCreate,
  runWithPrepare,
  cancelActiveScan,
  retryLastRun
} = useScanRun({
  workspaceId: toRef(props, 'workspaceId'),
  scanFailedMessage: messages.value.scanFailed,
  onFinished(scan) {
    emit('scanFinished', scan)
  }
})

const busy = computed(
  () =>
    preparing.value ||
    cancelling.value ||
    (activeScan.value !== null && isScanInFlight(activeScan.value.status))
)

const canSubmit = computed(() => !busy.value && !props.disabled && props.workspaceId.length > 0)

async function startGitScan(kind: 'github' | 'gitlab') {
  const raw = kind === 'github' ? githubUrl.value : gitlabUrl.value
  const validation = validateGitRemoteUrl(raw, kind)
  if (validation) {
    error.value = kind === 'github' ? messages.value.invalidGithubUrl : messages.value.invalidGitlabUrl
    return
  }
  const parsed = parseGitRemoteUrl(raw)
  if (!parsed) {
    error.value = kind === 'github' ? messages.value.invalidGithubUrl : messages.value.invalidGitlabUrl
    return
  }
  await runAfterCreate(async () =>
    createGitScan(props.workspaceId, parsed.url, branch.value.trim() || undefined)
  )
}

function openFolderPicker() {
  folderInput.value?.click()
}

function openZipPicker() {
  zipInput.value?.click()
}

async function onZipInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const issue = validateZipUpload(file)
  if (issue === 'invalid') {
    error.value = messages.value.invalidZipUpload
    return
  }
  if (issue === 'too-large') {
    error.value = messages.value.zipUploadTooLarge
    return
  }

  await runAfterCreate(async () => createUploadScan(props.workspaceId, file, file.name))
}

async function onFolderInput(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  input.value = ''
  if (!files?.length) return
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
    openFolderPicker()
    return
  }
  try {
    const picker = window.showDirectoryPicker
    if (!picker) {
      openFolderPicker()
      return
    }
    const handle = await picker.call(window)
    let archive: File | undefined
    await runWithPrepare(
      async () => {
        archive = await zipDirectoryHandle(handle, handle.name || 'project')
      },
      async () => createUploadScan(props.workspaceId, archive!, archive!.name)
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
  <section class="open-project" :aria-label="messages.openProjectTitle">
    <h2>{{ messages.openProjectTitle }}</h2>
    <div class="source-tabs" role="tablist" :aria-label="messages.openProjectTitle">
      <button
        type="button"
        role="tab"
        class="source-tab"
        :aria-selected="tab === 'local'"
        :disabled="busy"
        @click="tab = 'local'"
      >
        {{ messages.sourceLocal }}
      </button>
      <button
        type="button"
        role="tab"
        class="source-tab"
        :aria-selected="tab === 'github'"
        :disabled="busy"
        @click="tab = 'github'"
      >
        {{ messages.sourceGithub }}
      </button>
      <button
        type="button"
        role="tab"
        class="source-tab"
        :aria-selected="tab === 'gitlab'"
        :disabled="busy"
        @click="tab = 'gitlab'"
      >
        {{ messages.sourceGitlab }}
      </button>
    </div>

    <div v-if="tab === 'local'" class="source-panel" role="tabpanel">
      <p>{{ messages.localHint }}</p>
      <input
        ref="folderInput"
        class="sr-only"
        type="file"
        webkitdirectory
        multiple
        :disabled="!canSubmit"
        @change="onFolderInput"
      >
      <input
        ref="zipInput"
        class="sr-only"
        type="file"
        accept=".zip,application/zip"
        :disabled="!canSubmit"
        @change="onZipInput"
      >
      <div class="local-actions">
        <Button variant="primary" size="md" :disabled="!canSubmit" @click="pickDirectoryHandle">
          {{ messages.chooseFolder }}
        </Button>
        <Button variant="primary" size="md" :disabled="!canSubmit" @click="openZipPicker">
          {{ messages.chooseZip }}
        </Button>
      </div>
    </div>

    <form v-else-if="tab === 'github'" class="source-panel" role="tabpanel" @submit.prevent="startGitScan('github')">
      <label>
        {{ messages.githubUrlLabel }}
        <input v-model="githubUrl" type="url" inputmode="url" autocomplete="off" required :disabled="!canSubmit">
      </label>
      <label>
        {{ messages.branchLabel }}
        <span class="optional">{{ messages.branchOptional }}</span>
        <input v-model="branch" maxlength="200" :disabled="!canSubmit">
      </label>
      <Button variant="primary" size="md" type="submit" :loading="busy" :disabled="!canSubmit">
        {{ busy ? messages.scanning : messages.startScan }}
      </Button>
    </form>

    <form v-else class="source-panel" role="tabpanel" @submit.prevent="startGitScan('gitlab')">
      <label>
        {{ messages.gitlabUrlLabel }}
        <input v-model="gitlabUrl" type="url" inputmode="url" autocomplete="off" required :disabled="!canSubmit">
      </label>
      <label>
        {{ messages.branchLabel }}
        <span class="optional">{{ messages.branchOptional }}</span>
        <input v-model="branch" maxlength="200" :disabled="!canSubmit">
      </label>
      <Button variant="primary" size="md" type="submit" :loading="busy" :disabled="!canSubmit">
        {{ busy ? messages.scanning : messages.startScan }}
      </Button>
    </form>

    <p v-if="preparing" class="progress" role="status">{{ messages.uploadProgress }}</p>

    <ScanStepper
      v-if="activeScan"
      :scan="activeScan"
      :step-labels="messages.scanStepLabels()"
      :queued-label="messages.scanStepQueued"
      :terminal-labels="messages.scanStepTerminalLabels()"
      :failed-step="lastFailedStep"
      :cancelling="cancelling"
      :cancel-label="messages.scanCancel"
      :cancelling-label="messages.scanCancelling"
      show-cancel
      @cancel="cancelActiveScan"
    />

    <ErrorState
      v-if="error"
      :message="error"
      :retry-label="sharedMessages.retry"
      @retry="onRetry"
    />
  </section>
</template>

<style scoped>
.open-project {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent);
}

.open-project h2 {
  margin: 0;
}

.source-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.source-tab {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  padding: var(--space-2) var(--space-3);
  font: inherit;
  cursor: pointer;
}

.source-tab:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.source-tab[aria-selected='true'] {
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-40), var(--color-border));
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
}

.source-panel {
  display: grid;
  gap: var(--space-3);
}

.local-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.source-panel label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
}

.optional {
  font-size: var(--font-size-sm);
}

.source-panel input {
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}

.progress {
  margin: 0;
  color: var(--color-text-secondary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
