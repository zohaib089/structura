<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HexLoader from './components/ui/HexLoader.vue'
import ToastStack from './components/ui/ToastStack.vue'

const router = useRouter()

// App boot: until the first navigation resolves (lazy route chunk + auth guard), show the lg loader
// on the blank shell background. HexLoader's own 200ms delay keeps fast boots flicker-free.
const booting = ref(true)
// Later navigations keep the current screen mounted; a small status bar (never a blank shell) appears if it is slow.
const navigating = ref(false)

void router.isReady().finally(() => {
  booting.value = false
})
router.beforeEach(() => {
  if (!booting.value) navigating.value = true
})
router.afterEach(() => {
  navigating.value = false
})
router.onError(() => {
  navigating.value = false
  booting.value = false
})

const showRouteLoader = computed(() => navigating.value && !booting.value)
</script>

<template>
  <div v-if="booting" class="app-boot">
    <HexLoader size="lg" stacked label="Starting Atlasmith…" />
  </div>
  <router-view />
  <div class="route-status">
    <HexLoader size="md" label="Loading…" :active="showRouteLoader" />
  </div>
  <ToastStack />
</template>

<style scoped>
.app-boot {
  position: fixed;
  inset: 0;
  z-index: var(--z-toast);
  display: grid;
  place-items: center;
  background: var(--color-canvas);
}
.route-status {
  position: fixed;
  inset-block-end: var(--space-4);
  inset-inline-start: var(--space-4);
  z-index: var(--z-toast);
}
</style>
