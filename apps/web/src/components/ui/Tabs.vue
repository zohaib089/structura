<script setup lang="ts">
import Badge from './Badge.vue'

export interface TabItem {
  id: string
  label: string
  count?: number
  disabled?: boolean
  tabId?: string
  panelId?: string
}

const props = defineProps<{
  modelValue: string
  items: TabItem[]
  ariaLabel: string
}>()

const emit = defineEmits<{ 'update:modelValue': [id: string] }>()

function tabButtonId(item: TabItem) {
  return item.tabId ?? `ui-tab-${item.id}`
}

function tabPanelId(item: TabItem) {
  return item.panelId ?? `ui-panel-${item.id}`
}

function enabledIndices(): number[] {
  return props.items.map((item, index) => (item.disabled ? -1 : index)).filter(index => index >= 0)
}

function select(item: TabItem) {
  if (item.disabled) return
  emit('update:modelValue', item.id)
}

function focusIndex(index: number) {
  const item = props.items[index]
  if (!item || item.disabled) return
  const button = document.getElementById(tabButtonId(item))
  button?.focus()
  select(item)
}

function onKeydown(event: KeyboardEvent, index: number) {
  const enabled = enabledIndices()
  if (enabled.length === 0) return
  const position = enabled.indexOf(index)
  if (position < 0) return

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    focusIndex(enabled[(position + 1) % enabled.length]!)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    focusIndex(enabled[(position - 1 + enabled.length) % enabled.length]!)
  } else if (event.key === 'Home') {
    event.preventDefault()
    focusIndex(enabled[0]!)
  } else if (event.key === 'End') {
    event.preventDefault()
    focusIndex(enabled[enabled.length - 1]!)
  }
}
</script>

<template>
  <div class="ui-tabs" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="(item, index) in items"
      :id="tabButtonId(item)"
      :key="item.id"
      type="button"
      role="tab"
      class="ui-tabs__tab"
      :class="{ 'ui-tabs__tab--active': modelValue === item.id }"
      :aria-selected="modelValue === item.id"
      :aria-controls="tabPanelId(item)"
      :tabindex="modelValue === item.id ? 0 : -1"
      :disabled="item.disabled"
      @click="select(item)"
      @keydown="onKeydown($event, index)"
    >
      <span class="ui-tabs__label">{{ item.label }}</span>
      <Badge v-if="item.count != null" variant="neutral">{{ item.count }}</Badge>
    </button>
  </div>
</template>

<style scoped>
.ui-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  border-bottom: 1px solid var(--color-border);
}

.ui-tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: -1px;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  font-weight: var(--font-weight-medium);
  font-family: inherit;
  cursor: pointer;
  transition:
    color var(--dur-2) var(--easing-product),
    border-color var(--dur-2) var(--easing-product);
}

.ui-tabs__tab:hover:not(:disabled) {
  color: var(--color-text-primary);
}

.ui-tabs__tab:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.ui-tabs__tab--active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-brand-amber-ui);
}

.ui-tabs__tab:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
