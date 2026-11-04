<script setup lang="ts">
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ViewerApp from '../viewer/ViewerApp.vue'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../services/locale'
import '../viewer/viewer-base.css'

const route = useRoute()

const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
</script>

<template>
  <ViewerApp :locale="locale" boot-sample />
</template>
