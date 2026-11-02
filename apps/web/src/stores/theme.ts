import { readMigrated, storageKey } from '../../../../packages/brand/src/brand'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<'light' | 'dark'>('dark')

  const saved = readMigrated('theme')
  if (saved === 'dark' || saved === 'light') {
    theme.value = saved
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  // Apply theme to HTML
  watch(theme, (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem(storageKey('theme'), newTheme)
  }, { immediate: true })

  return { theme, toggleTheme }
})