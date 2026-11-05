<script setup lang="ts">
import { ref } from 'vue'
import Button from '../../ui/Button.vue'

defineProps<{
  disabled?: boolean
  dropTitle: string
  browseLabel: string
  hint: string
}>()

const emit = defineEmits<{
  pickDirectory: []
  folderFiles: [files: FileList]
}>()

const folderInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)

function openBrowse() {
  folderInput.value?.click()
}

function onFolderInput(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  input.value = ''
  if (!files?.length) return
  emit('folderFiles', files)
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false
  if (event.dataTransfer?.items) {
    // Folder drops via drag are unreliable across browsers; prefer the directory picker.
    emit('pickDirectory')
    return
  }
  emit('pickDirectory')
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

defineExpose({ openBrowse })
</script>

<template>
  <div class="open-source" data-testid="open-folder-source">
    <input
      ref="folderInput"
      class="sr-only"
      type="file"
      webkitdirectory
      multiple
      :disabled="disabled"
      @change="onFolderInput"
    >
    <div
      class="open-source__drop"
      :class="{ 'open-source__drop--active': dragOver }"
      role="button"
      tabindex="0"
      :aria-disabled="disabled || undefined"
      @click="!disabled && emit('pickDirectory')"
      @keydown.enter.prevent="!disabled && emit('pickDirectory')"
      @keydown.space.prevent="!disabled && emit('pickDirectory')"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div class="open-source__icon" aria-hidden="true">📁</div>
      <p class="open-source__title">
        <strong>{{ dropTitle }}</strong>
        or
        <Button
          variant="secondary"
          size="sm"
          type="button"
          :disabled="disabled"
          @click.stop="openBrowse"
        >
          {{ browseLabel }}
        </Button>
      </p>
      <p class="open-source__hint">{{ hint }}</p>
    </div>
  </div>
</template>

<style scoped>
.open-source__drop {
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--r-md);
  padding: var(--space-8) var(--space-5);
  text-align: center;
  background: var(--color-surface);
  cursor: pointer;
}

.open-source__drop:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.open-source__drop--active {
  border-color: var(--color-brand-amber-ui);
  background: color-mix(in srgb, var(--color-brand-amber-ui) 8%, var(--color-surface));
}

.open-source__icon {
  font-size: 1.375rem;
  opacity: 0.55;
  margin-bottom: var(--space-2);
}

.open-source__title {
  margin: 0 0 var(--space-2);
  color: var(--color-text-primary);
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
}

.open-source__hint {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
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
