<script setup lang="ts">
import Sidebar, { type SidebarNavItem } from './Sidebar.vue'
import TopBar from './TopBar.vue'
import { Menu, X } from '@lucide/vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { BreadcrumbItem } from './Breadcrumbs.vue'

withDefaults(
  defineProps<{
    workspaceName: string
    navItems: SidebarNavItem[]
    breadcrumbs: BreadcrumbItem[]
    appNavigationLabel: string
    workspaceLabel: string
    skipToContentLabel: string
    commandPaletteLabel: string
    commandPaletteHint: string
    /** Graph routes fill the content pane edge-to-edge (mock `.content.flush`). */
    flushContent?: boolean
    /** Keep shell padding but lock the pane height so embedded graph can flex-fill. */
    fillContent?: boolean
  }>(),
  { flushContent: false, fillContent: false }
)

/** Below 900px the sidebar becomes an off-canvas drawer opened from the top bar. */
const navOpen = ref(false)
const route = useRoute()
watch(() => route?.fullPath, () => { navOpen.value = false })
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') navOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--nav-open': navOpen }">
    <a class="skip-link" href="#app-main-content">{{ skipToContentLabel }}</a>
    <div v-if="navOpen" class="shell-backdrop" aria-hidden="true" @click="navOpen = false" />
    <Sidebar
      id="app-shell-sidebar"
      class="shell-sidebar"
      :workspace-name="workspaceName"
      :nav-items="navItems"
      :app-navigation-label="appNavigationLabel"
      :workspace-label="workspaceLabel"
      @open-workspace-menu="$emit('openWorkspaceMenu')"
    >
      <template #footer>
        <slot name="sidebar-footer" />
      </template>
    </Sidebar>

    <div class="shell-main">
      <TopBar
        :breadcrumbs="breadcrumbs"
        :command-palette-label="commandPaletteLabel"
        :command-palette-hint="commandPaletteHint"
      >
        <template #leading>
          <button
            type="button"
            class="shell-menu-button"
            data-testid="shell-menu-button"
            aria-controls="app-shell-sidebar"
            :aria-expanded="navOpen"
            :aria-label="appNavigationLabel"
            :title="appNavigationLabel"
            @click="navOpen = !navOpen"
          >
            <X v-if="navOpen" :size="18" aria-hidden="true" />
            <Menu v-else :size="18" aria-hidden="true" />
          </button>
        </template>
        <template #actions>
          <slot name="top-actions" />
        </template>
      </TopBar>
      <main
        id="app-main-content"
        class="shell-content"
        :class="{
          'shell-content--flush': flushContent,
          'shell-content--fill': fillContent && !flushContent
        }"
        tabindex="-1"
      >
        <div class="shell-content-body">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  emits: ['openWorkspaceMenu']
}
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--shell-sidebar-width) minmax(0, 1fr);
  align-items: stretch;
  width: 100%;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: var(--color-canvas);
  color: var(--color-text-primary);
}

.shell-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.shell-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: var(--space-5) var(--space-6);
}

.shell-content-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.shell-content--flush {
  padding: 0;
  overflow: hidden;
}

.shell-content--fill {
  overflow: hidden;
}

.skip-link {
  position: absolute;
  inset-inline-start: var(--space-3);
  top: var(--space-3);
  z-index: var(--z-skip-link, 60);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--r-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  text-decoration: none;
  transform: translateY(-200%);
  transition: transform var(--dur-1) var(--easing-product);
}

.skip-link:focus {
  transform: translateY(0);
}

.shell-menu-button {
  display: none;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: var(--header-control-h);
  block-size: var(--header-control-h);
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
}
.shell-menu-button:focus-visible {
  outline: 2px solid var(--color-brand-amber-ui);
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .app-shell { grid-template-columns: minmax(0, 1fr); }
  .shell-menu-button { display: inline-flex; }
  .shell-sidebar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    z-index: 70;
    inline-size: min(var(--shell-sidebar-width), 85vw);
    visibility: hidden;
    transform: translateX(-100%);
    transition: transform var(--dur-1, 150ms) var(--easing-product, ease), visibility 0s linear var(--dur-1, 150ms);
    box-shadow: var(--shadow-md);
  }
  [dir='rtl'] .shell-sidebar { transform: translateX(100%); }
  .app-shell--nav-open .shell-sidebar {
    visibility: visible;
    transform: none;
    transition: transform var(--dur-1, 150ms) var(--easing-product, ease);
  }
  .shell-backdrop {
    position: fixed;
    inset: 0;
    z-index: 65;
    background: color-mix(in srgb, #000 45%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .shell-sidebar { transition: none; }
}
</style>
