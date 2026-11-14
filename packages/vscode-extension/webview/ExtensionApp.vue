<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BrandMark from '../../../apps/web/src/components/brand/BrandMark.vue'
import ViewerApp from '../../../apps/web/src/viewer/ViewerApp.vue'
import type { GraphDocument } from '../../../apps/web/src/viewer/graph-types'
import { isHostToWebviewMessage, type ViewerState } from '../src/protocol'
import { getVsCodeApi } from './vscode-api'
import { webviewCopy as copy } from './messages'

const vscode = getVsCodeApi()
const state = ref<ViewerState>({ kind: 'loading' })

function applyTheme(theme: 'light' | 'dark' | undefined) {
  const next = theme ?? (document.body.classList.contains('vscode-light') ? 'light' : 'dark')
  document.documentElement.dataset.theme = next
}

function onMessage(event: MessageEvent) {
  const data = event.data
  if (!isHostToWebviewMessage(data)) return
  state.value = data.state
  if (data.state.kind === 'graph') applyTheme(data.state.theme)
  else applyTheme(undefined)
}

window.addEventListener('message', onMessage)
vscode?.postMessage({ type: 'ready' })

const graphDocument = computed(() => {
  if (state.value.kind !== 'graph') return null
  return state.value.graph as GraphDocument
})

const focusPath = computed(() => (state.value.kind === 'graph' ? state.value.focusPath : null))
const shellTheme = computed(() => (state.value.kind === 'graph' ? state.value.theme : null))
const summaries = computed(() => (state.value.kind === 'graph' ? state.value.fileSummaries : undefined))

async function loadFileSummary(path: string): Promise<string | null> {
  return summaries.value?.[path] ?? null
}

function openFile(path: string) {
  vscode?.postMessage({ type: 'openFile', path })
}

function scan() {
  vscode?.postMessage({ type: 'scan' })
}

function showProject() {
  vscode?.postMessage({ type: 'showProjectGraph' })
}

function openFolder() {
  vscode?.postMessage({ type: 'openFolder' })
}

watch(
  state,
  (value) => {
    if (value.kind === 'graph') applyTheme(value.theme)
  },
  { immediate: true }
)
</script>

<template>
  <div class="extension-app" :data-kind="state.kind">
    <ViewerApp
      v-if="state.kind === 'graph' && graphDocument"
      embedded
      :shell-theme="shellTheme"
      :graph-document="graphDocument"
      :focus-path="focusPath"
      :open-inspector-on-focus="false"
      :file-neighborhood="state.kind === 'graph' && state.mode === 'file'"
      :overview-layout="state.kind === 'graph' && state.mode === 'project' ? 'folders' : 'entry'"
      :load-file-summary="loadFileSummary"
      @open-file="openFile"
    />

    <div v-else class="state-screen" role="status">
      <BrandMark :size="48" />
      <template v-if="state.kind === 'empty-folder'">
        <h1>{{ copy.emptyFolderTitle }}</h1>
        <p>{{ copy.emptyFolderBody }}</p>
        <button type="button" class="primary" @click="openFolder">{{ copy.emptyFolderAction }}</button>
      </template>
      <template v-else-if="state.kind === 'empty-file'">
        <h1>{{ copy.emptyFileTitle }}</h1>
        <p>{{ copy.emptyFileBody }}</p>
      </template>
      <template v-else-if="state.kind === 'declined'">
        <h1>{{ copy.declinedTitle }}</h1>
        <p>{{ copy.declinedBody }}</p>
        <button type="button" class="primary" @click="scan">{{ copy.declinedAction }}</button>
      </template>
      <template v-else-if="state.kind === 'loading'">
        <h1>{{ state.message || copy.loadingTitle }}</h1>
        <p>{{ copy.loadingBody }}</p>
        <div class="spinner" aria-hidden="true"></div>
      </template>
      <template v-else-if="state.kind === 'error'">
        <h1>{{ copy.errorTitle }}</h1>
        <p>{{ state.message }}</p>
        <button type="button" class="primary" @click="scan">{{ copy.errorRetry }}</button>
      </template>
      <template v-else-if="state.kind === 'file-missing'">
        <h1>{{ copy.fileMissingTitle }}</h1>
        <p>{{ copy.fileMissingBody(state.path) }}</p>
        <div class="actions">
          <button type="button" class="primary" @click="showProject">{{ copy.fileMissingShowProject }}</button>
          <button type="button" class="ghost" @click="scan">{{ copy.fileMissingRetry }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
html,
body,
#app,
.extension-app {
  margin: 0;
  width: 100%;
  height: 100%;
  min-height: 100%;
}

body {
  overflow: hidden;
  background: var(--color-canvas, #07111f);
  color: var(--color-text-primary, #f4efe4);
  font-family: var(--font-family-sans, "Source Sans 3", "Segoe UI", sans-serif);
}

.extension-app {
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(60% 70% at 50% 48%, color-mix(in srgb, var(--color-brand-navy, #102a43) 28%, transparent) 0%, transparent 72%),
    var(--color-canvas, #07111f);
}

.extension-app .viewer.viewer-embedded {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.state-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 0.75rem;
  max-width: 36rem;
  margin: auto;
  padding: 1.5rem;
}

.state-screen h1 {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.3;
  color: var(--color-text-primary, #f4efe4);
}

.state-screen p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--color-text-secondary, #c9c1b2);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

button.primary,
button.ghost {
  margin-top: 0.5rem;
  padding: 0.45rem 0.9rem;
  border-radius: 0.4rem;
  font: inherit;
  cursor: pointer;
}

button.primary {
  border: 1px solid var(--button-primary-border, #d4a017);
  background: var(--button-primary-bg, #d4a017);
  color: var(--button-primary-fg, #07111f);
}

button.ghost {
  border: 1px solid var(--color-border, #3a4a5c);
  background: transparent;
  color: var(--color-text-primary, #f4efe4);
}

.spinner {
  width: 1.75rem;
  height: 1.75rem;
  margin-top: 0.5rem;
  border: 2px solid color-mix(in srgb, var(--color-brand-amber, #d4a017) 30%, transparent);
  border-top-color: var(--color-brand-amber, #d4a017);
  border-radius: 50%;
  animation: atlasmith-spin 0.8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}

@keyframes atlasmith-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
