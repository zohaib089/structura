<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from '../../ui/Button.vue'
import Input from '../../ui/Input.vue'
import { parseGitRemoteUrl, validateGitRemoteUrl } from '../../../services/git-remote-url'

const props = defineProps<{
  disabled?: boolean
  urlLabel: string
  branchLabel: string
  branchOptional: string
  startLabel: string
  scanningLabel: string
  busy?: boolean
  invalidUrlMessage: string
  urlHint: string
}>()

const emit = defineEmits<{
  submit: [payload: { url: string; branch?: string; kind: 'github' | 'gitlab' }]
}>()

const url = ref('')
const branch = ref('')
const urlError = ref('')
const touched = ref(false)

const detected = computed(() => parseGitRemoteUrl(url.value))
const hostLabel = computed(() => {
  if (!detected.value) return ''
  return detected.value.kind === 'github' ? 'GitHub' : 'GitLab'
})

function validateUrl(): boolean {
  const raw = url.value.trim()
  if (!raw) {
    urlError.value = props.invalidUrlMessage
    return false
  }
  const parsed = parseGitRemoteUrl(raw)
  if (!parsed) {
    urlError.value = props.invalidUrlMessage
    return false
  }
  const issue = validateGitRemoteUrl(raw, parsed.kind)
  if (issue) {
    urlError.value = props.invalidUrlMessage
    return false
  }
  urlError.value = ''
  return true
}

function onBlur() {
  touched.value = true
  validateUrl()
}

watch(url, () => {
  if (touched.value) validateUrl()
})

function onSubmit() {
  touched.value = true
  if (!validateUrl()) return
  const parsed = parseGitRemoteUrl(url.value)
  if (!parsed) return
  emit('submit', {
    url: parsed.url,
    branch: branch.value.trim() || undefined,
    kind: parsed.kind
  })
}
</script>

<template>
  <form class="open-git" data-testid="open-git-source" @submit.prevent="onSubmit">
    <Input
      v-model="url"
      type="url"
      :label="urlLabel"
      :hint="detected ? `${hostLabel} · ${detected.owner}/${detected.repo}` : urlHint"
      :error="touched ? urlError : ''"
      :disabled="disabled"
      placeholder="https://github.com/org/repo"
      @blur="onBlur"
    />
    <Input
      v-model="branch"
      :label="`${branchLabel} ${branchOptional}`"
      :disabled="disabled"
      placeholder="main"
    />
    <Button variant="primary" size="md" type="submit" :loading="busy" :disabled="disabled">
      {{ busy ? scanningLabel : startLabel }}
    </Button>
  </form>
</template>

<style scoped>
.open-git {
  display: grid;
  gap: var(--space-4);
  max-width: 36rem;
}
</style>
