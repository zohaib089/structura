<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import {
  GRAPH_QA_MAX_QUESTION_LENGTH,
  askScanQuestion,
  citationAriaLabel,
  citationDisplay,
  hasHostedAskContext,
  type GraphQaAnswer
} from '../../../api/scan-ask'
import Button from '../../ui/Button.vue'
import Input from '../../ui/Input.vue'

const props = defineProps<{
  workspaceId?: string | null
  scanId?: string | null
  graphHref: (path?: string) => RouteLocationRaw
  title: string
  hint: string
  inputLabel: string
  placeholder: string
  buttonLabel: string
  thinkingLabel: string
  starters: readonly string[]
  citationsTitle: string
  followUpsTitle: string
  openLabel: string
  charCount: (used: number, max: number) => string
  tooLong: string
}>()

const visible = computed(() => hasHostedAskContext(props.workspaceId, props.scanId))

const question = ref('')
const loading = ref(false)
const error = ref('')
const answer = ref<GraphQaAnswer | null>(null)
const liveStatus = ref('')
let requestId = 0

const questionLength = computed(() => question.value.length)
const nearLimit = computed(() => questionLength.value >= Math.floor(GRAPH_QA_MAX_QUESTION_LENGTH * 0.8))
const canSubmit = computed(() => question.value.trim().length > 0 && !loading.value)

const citations = computed(() =>
  (answer.value?.citations ?? []).map((citation, index) => {
    const shown = citationDisplay(citation)
    return {
      key: `${citation.kind}:${citation.path}:${citation.startLine ?? ''}:${citation.endLine ?? ''}:${index}`,
      path: citation.path,
      kind: citation.kind,
      title: shown.title,
      detail: shown.detail,
      range: shown.range,
      ariaLabel: citationAriaLabel(citation, props.openLabel)
    }
  })
)

function setQuestion(value: string) {
  question.value = value.length > GRAPH_QA_MAX_QUESTION_LENGTH
    ? value.slice(0, GRAPH_QA_MAX_QUESTION_LENGTH)
    : value
}

async function submit(text?: string) {
  if (!visible.value) return
  const next = (text ?? question.value).trim()
  if (!next) return
  if (next.length > GRAPH_QA_MAX_QUESTION_LENGTH) {
    error.value = props.tooLong
    liveStatus.value = props.tooLong
    return
  }

  const workspaceId = props.workspaceId!.trim()
  const scanId = props.scanId!.trim()
  const id = ++requestId
  question.value = next
  loading.value = true
  error.value = ''
  liveStatus.value = props.thinkingLabel

  try {
    const result = await askScanQuestion(workspaceId, scanId, next)
    if (id !== requestId) return
    answer.value = result
    liveStatus.value = result.answer
  } catch (cause) {
    if (id !== requestId) return
    const message = cause instanceof Error && cause.message
      ? cause.message
      : 'We could not answer that just now. Please try again.'
    error.value = message
    liveStatus.value = message
  } finally {
    if (id === requestId) loading.value = false
  }
}

function onSubmit() {
  void submit()
}

function onStarter(text: string) {
  if (loading.value) return
  setQuestion(text)
  void submit(text)
}
</script>

<template>
  <section
    v-if="visible"
    class="block"
    data-testid="ask-about-project"
    aria-labelledby="report-ask-title"
  >
    <div class="block__head">
      <h3 id="report-ask-title" class="block__title">{{ title }}</h3>
    </div>
    <p class="hint">{{ hint }}</p>

    <div class="card">
      <form class="form" data-testid="ask-form" @submit.prevent="onSubmit">
        <Input
          id="report-ask-input"
          :model-value="question"
          :label="inputLabel"
          :placeholder="placeholder"
          :disabled="loading"
          :maxlength="GRAPH_QA_MAX_QUESTION_LENGTH"
          data-testid="ask-input"
          @update:model-value="setQuestion"
        />
        <p v-if="nearLimit" class="count" data-testid="ask-char-count">
          {{ charCount(questionLength, GRAPH_QA_MAX_QUESTION_LENGTH) }}
        </p>
        <Button
          class="submit"
          variant="primary"
          type="submit"
          :disabled="!canSubmit"
          :loading="loading"
          data-testid="ask-submit"
        >
          {{ loading ? thinkingLabel : buttonLabel }}
        </Button>
      </form>

      <ul v-if="starters.length" class="chips" data-testid="ask-starters">
        <li v-for="starter in starters" :key="starter">
          <button
            type="button"
            class="chip"
            :disabled="loading"
            :aria-label="starter"
            @click="onStarter(starter)"
          >
            {{ starter }}
          </button>
        </li>
      </ul>
    </div>

    <div class="status" aria-live="polite" aria-atomic="true" data-testid="ask-live">
      <span class="sr-only">{{ liveStatus }}</span>
      <p v-if="loading" class="thinking" data-testid="ask-thinking">{{ thinkingLabel }}</p>
      <p v-else-if="error" class="error" data-testid="ask-error" role="alert">{{ error }}</p>
      <div v-else-if="answer" class="result" data-testid="ask-answer">
        <p class="answer">{{ answer.answer }}</p>
        <div v-if="citations.length" class="citations">
          <h4 class="subhead">{{ citationsTitle }}</h4>
          <ul class="cites" data-testid="ask-citations">
            <li v-for="item in citations" :key="item.key">
              <RouterLink
                class="cite"
                :to="graphHref(item.path)"
                :title="openLabel"
                :aria-label="item.ariaLabel"
                :data-citation-kind="item.kind"
                :data-citation-path="item.path"
              >
                <span class="cite__body">
                  <span class="cite__name">{{ item.title }}</span>
                  <span v-if="item.detail" class="cite__path" dir="ltr">{{ item.detail }}</span>
                </span>
                <span v-if="item.range" class="cite__range">{{ item.range }}</span>
              </RouterLink>
            </li>
          </ul>
        </div>
        <div v-if="answer.suggestions.length" class="followups">
          <h4 class="subhead">{{ followUpsTitle }}</h4>
          <ul class="chips" data-testid="ask-followups">
            <li v-for="suggestion in answer.suggestions" :key="suggestion">
              <button
                type="button"
                class="chip"
                :disabled="loading"
                :aria-label="suggestion"
                @click="onStarter(suggestion)"
              >
                {{ suggestion }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.block {
  padding-block: var(--space-5);
  border-block-end: 1px solid var(--color-border);
  min-inline-size: 0;
  max-inline-size: 100%;
}
.block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}
.block__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}
.hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.card {
  margin-block-start: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--color-brand-navy) 8%, var(--color-surface-raised));
  min-inline-size: 0;
  max-inline-size: 100%;
}
.form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: var(--space-3);
  row-gap: var(--space-2);
  align-items: end;
  min-inline-size: 0;
}
.form :deep(.ui-input-field) {
  grid-column: 1;
  grid-row: 1;
}
.submit {
  grid-column: 2;
  grid-row: 1;
  min-inline-size: 5.5rem;
}
.count {
  grid-column: 1;
  grid-row: 2;
  margin: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
  min-inline-size: 0;
  max-inline-size: 100%;
}
.chip {
  display: inline-flex;
  align-items: center;
  max-inline-size: 100%;
  min-block-size: 1.75rem;
  padding: 0.2rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--color-brand-amber-ui) 45%, var(--color-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-brand-amber-ui) 12%, var(--color-surface-raised));
  color: var(--color-text-primary);
  font: inherit;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.chip:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-brand-amber-ui) 22%, var(--color-surface-raised));
}
.chip:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.chip:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.status,
.result,
.citations,
.followups {
  min-inline-size: 0;
  max-inline-size: 100%;
}
.status {
  margin-block-start: var(--space-4);
}
.thinking,
.error,
.answer {
  margin: 0;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}
.thinking {
  color: var(--color-text-secondary);
}
.error {
  color: var(--color-danger);
}
.answer {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  min-inline-size: 0;
  max-inline-size: 48rem;
}
.subhead {
  margin: var(--space-4) 0 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}
.cites {
  display: grid;
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
  min-inline-size: 0;
}
.cite {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--space-3);
  padding-block: var(--space-2);
  padding-inline: var(--space-2);
  margin-inline: calc(var(--space-2) * -1);
  color: inherit;
  text-decoration: none;
  border-radius: var(--r-sm, 6px);
  min-inline-size: 0;
}
.cite:hover {
  background: color-mix(in srgb, var(--color-brand-navy) 10%, transparent);
}
.cite:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.cite__body {
  display: grid;
  gap: 1px;
  min-inline-size: 0;
}
.cite__name {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
  overflow-wrap: anywhere;
}
.cite__path {
  font-family: var(--font-family-mono);
  font-size: var(--text-12);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.cite__range {
  flex-shrink: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
@media (max-width: 760px) {
  .form {
    grid-template-columns: 1fr;
  }
  .form :deep(.ui-input-field),
  .submit,
  .count {
    grid-column: 1;
  }
  .form :deep(.ui-input-field) {
    grid-row: auto;
  }
  .count {
    grid-row: auto;
  }
  .submit {
    grid-row: auto;
    justify-self: start;
  }
  .cite {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
