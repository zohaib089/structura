<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Scan } from '../../api/scans'
import { createGitScan, createUploadScan } from '../../api/scans'
import { zipBrowserFiles, zipDirectoryHandle } from '../../services/folder-zip'
import { validateZipUpload } from '../../services/upload-archive'
import { parseGitRemoteUrl, validateGitRemoteUrl } from '../../services/git-remote-url'
import { pollScanUntilTerminal } from '../../services/scan-poll'
import { scanMessages } from '../../services/scan-messages'
import { dashboardMessages } from '../../services/dashboard-messages'
import ErrorState from '../ui/ErrorState.vue'
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
const busy = ref(false)
const phase = ref<'idle' | 'zipping' | 'uploading' | 'polling'>('idle')
const error = ref('')
const folderInput = ref<HTMLInputElement | null>(null)
const zipInput = ref<HTMLInputElement | null>(null)

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
  await runScan(async () =>
    createGitScan(props.workspaceId, parsed.url, branch.value.trim() || undefined)
  )
}

async function runScan(create: () => Promise<Scan>) {
  error.value = ''
  busy.value = true
  phase.value = 'uploading'
  try {
    const scan = await create()
    phase.value = 'polling'
    const finished = await pollScanUntilTerminal(props.workspaceId, scan.id)
    if (finished.status === 'failed') {
      error.value = finished.errorMessage ?? messages.value.scanFailed
    }
    emit('scanFinished', finished)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : messages.value.scanFailed
  } finally {
    busy.value = false
    phase.value = 'idle'
  }
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

  await uploadZipFile(file)
}

async function uploadZipFile(file: File) {
  await runScan(async () => createUploadScan(props.workspaceId, file, file.name))
}

async function onFolderInput(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  input.value = ''
  if (!files?.length) return
  await uploadFiles(files)
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
    await uploadDirectoryHandle(handle)
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') return
    error.value = cause instanceof Error ? cause.message : messages.value.scanFailed
    busy.value = false
    phase.value = 'idle'
  }
}

async function uploadDirectoryHandle(handle: FileSystemDirectoryHandle) {
  error.value = ''
  busy.value = true
  phase.value = 'zipping'
  try {
    const archive = await zipDirectoryHandle(handle, handle.name || 'project')
    phase.value = 'uploading'
    await runScan(async () => createUploadScan(props.workspaceId, archive, archive.name))
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : messages.value.scanFailed
    busy.value = false
    phase.value = 'idle'
  }
}

async function uploadFiles(files: FileList) {
  error.value = ''
  busy.value = true
  phase.value = 'zipping'
  try {
    const archive = await zipBrowserFiles(files)
    phase.value = 'uploading'
    await runScan(async () => createUploadScan(props.workspaceId, archive, archive.name))
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : messages.value.scanFailed
    busy.value = false
    phase.value = 'idle'
  }
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
        @click="tab = 'local'"
      >
        {{ messages.sourceLocal }}
      </button>
      <button
        type="button"
        role="tab"
        class="source-tab"
        :aria-selected="tab === 'github'"
        @click="tab = 'github'"
      >
        {{ messages.sourceGithub }}
      </button>
      <button
        type="button"
        role="tab"
        class="source-tab"
        :aria-selected="tab === 'gitlab'"
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
        <button type="button" class="primary-button" :disabled="!canSubmit" @click="pickDirectoryHandle">
          {{ messages.chooseFolder }}
        </button>
        <button type="button" class="primary-button" :disabled="!canSubmit" @click="openZipPicker">
          {{ messages.chooseZip }}
        </button>
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
      <button class="primary-button" type="submit" :disabled="!canSubmit">
        {{ busy ? messages.scanning : messages.startScan }}
      </button>
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
      <button class="primary-button" type="submit" :disabled="!canSubmit">
        {{ busy ? messages.scanning : messages.startScan }}
      </button>
    </form>

    <p v-if="busy" class="progress" role="status">
      {{ phase === 'zipping' ? messages.uploadProgress : messages.scanning }}
    </p>
    <ErrorState
      v-if="error"
      :message="error"
      :retry-label="sharedMessages.retry"
      @retry="error = ''"
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

.primary-button {
  justify-self: start;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: var(--color-accent-gradient-soft);
  color: var(--color-text-on-accent);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: wait;
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
