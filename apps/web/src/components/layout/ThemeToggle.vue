<script setup lang="ts">
/** Icon-only theme switch shared by every header. Accessible name comes from the caller's locale messages. */
import { Moon, Sun } from '@lucide/vue'
import { computed } from 'vue'
import { useThemeStore } from '../../stores/theme'

const props = defineProps<{ label: string }>()
const themeStore = useThemeStore()
const isDark = computed(() => themeStore.theme === 'dark')
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="props.label"
    :title="props.label"
    :aria-pressed="isDark"
    data-testid="theme-toggle"
    @click="themeStore.toggleTheme()"
  >
    <Sun v-if="isDark" :size="16" aria-hidden="true" />
    <Moon v-else :size="16" aria-hidden="true" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--header-control-h, 32px);
  block-size: var(--header-control-h, 32px);
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--r-sm, 6px);
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
}
.theme-toggle:hover { background: var(--gray-3, var(--color-surface-raised)); }
.theme-toggle:focus-visible {
  outline: 2px solid var(--color-brand-amber-ui, currentColor);
  outline-offset: 2px;
}
</style>
