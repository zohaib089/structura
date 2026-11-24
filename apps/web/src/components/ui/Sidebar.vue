<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, type Component } from 'vue'
import { Check, ChevronsUpDown, PanelLeftClose, PanelLeftOpen } from '@lucide/vue'
import BrandMark from '../brand/BrandMark.vue'
import AccessibleTip from './AccessibleTip.vue'
import { BRAND } from '../../../../../packages/brand/src/brand'

export interface SidebarNavItem {
  id: string
  label: string
  to: string
  active: boolean
  /** Lucide icon shown beside the label (and alone in the collapsed rail). */
  icon?: Component
  /** Section heading the item sits under; consecutive items share one heading. */
  group?: string
}

export interface SidebarWorkspace {
  id: string
  name: string
  to: string
  /** Shown under the name in the switcher (e.g. the member role). */
  meta?: string
}

const props = withDefaults(
  defineProps<{
    workspaceName: string
    navItems: SidebarNavItem[]
    appNavigationLabel: string
    workspaceLabel: string
    workspaces?: SidebarWorkspace[]
    currentWorkspaceId?: string
    switchWorkspaceLabel?: string
    /** Desktop icon rail: labels hide, icons and tooltips stay. */
    collapsed?: boolean
    collapseLabel?: string
    expandLabel?: string
    userName?: string
    userEmail?: string
  }>(),
  {
    workspaces: () => [],
    currentWorkspaceId: '',
    switchWorkspaceLabel: undefined,
    collapsed: false,
    collapseLabel: undefined,
    expandLabel: undefined,
    userName: '',
    userEmail: ''
  }
)

const emit = defineEmits<{
  openWorkspaceMenu: []
  toggleCollapsed: []
}>()

const groups = computed(() => {
  const out: { label: string; items: SidebarNavItem[] }[] = []
  for (const item of props.navItems) {
    const label = item.group ?? ''
    const last = out[out.length - 1]
    if (last && last.label === label) last.items.push(item)
    else out.push({ label, items: [item] })
  }
  return out
})

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '·'
}

const menuOpen = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
function toggleMenu() {
  emit('openWorkspaceMenu')
  if (!props.workspaces.length) return
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) {
    void nextTick(() => menu.value?.querySelector<HTMLElement>('[aria-current="true"], a')?.focus())
    document.addEventListener('pointerdown', onOutside, true)
  } else document.removeEventListener('pointerdown', onOutside, true)
}
function closeMenu(returnFocus = true) {
  if (!menuOpen.value) return
  menuOpen.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  if (returnFocus) void nextTick(() => trigger.value?.focus())
}
function onOutside(event: PointerEvent) {
  const target = event.target as Node | null
  if (target && (menu.value?.contains(target) || trigger.value?.contains(target))) return
  closeMenu(false)
}
function onMenuKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    closeMenu()
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  const links = [...(menu.value?.querySelectorAll<HTMLElement>('a') ?? [])]
  const at = links.indexOf(document.activeElement as HTMLElement)
  const next = links[(at + (event.key === 'ArrowDown' ? 1 : links.length - 1)) % links.length]
  next?.focus()
}
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true))

const toggleLabel = computed(() => (props.collapsed ? props.expandLabel : props.collapseLabel))
</script>

<template>
  <aside class="sidebar" :class="{ 'is-rail': collapsed }" :data-collapsed="collapsed ? 'true' : 'false'">
    <div class="brand-row">
      <BrandMark :size="26" />
      <span class="product-name" dir="ltr">{{ BRAND.name }}</span>
      <slot name="brand-action" />
    </div>

    <div class="workspace-switcher">
      <button
        ref="trigger"
        type="button"
        class="workspace-trigger"
        data-testid="workspace-switcher"
        :aria-haspopup="workspaces.length ? 'menu' : undefined"
        :aria-expanded="workspaces.length ? menuOpen : undefined"
        :title="collapsed ? `${workspaceLabel}: ${workspaceName}` : (switchWorkspaceLabel ?? workspaceLabel)"
        @click="toggleMenu"
      >
        <span class="workspace-avatar" aria-hidden="true">{{ initials(workspaceName) }}</span>
        <span class="workspace-copy">
          <span class="workspace-label">{{ workspaceLabel }}</span>
          <span class="workspace-name" role="heading" aria-level="2"><bdi>{{ workspaceName }}</bdi></span>
        </span>
        <ChevronsUpDown v-if="workspaces.length" class="workspace-chevron" :size="14" aria-hidden="true" />
      </button>
      <div
        v-if="menuOpen"
        ref="menu"
        class="workspace-menu"
        role="menu"
        data-testid="workspace-menu"
        :aria-label="switchWorkspaceLabel ?? workspaceLabel"
        @keydown="onMenuKey"
      >
        <RouterLink
          v-for="ws in workspaces"
          :key="ws.id"
          :to="ws.to"
          role="menuitem"
          class="workspace-option"
          :aria-current="ws.id === currentWorkspaceId ? 'true' : undefined"
          @click="closeMenu(false)"
        >
          <span class="workspace-avatar small" aria-hidden="true">{{ initials(ws.name) }}</span>
          <span class="workspace-copy">
            <span class="workspace-name"><bdi>{{ ws.name }}</bdi></span>
            <span v-if="ws.meta" class="workspace-label">{{ ws.meta }}</span>
          </span>
          <Check v-if="ws.id === currentWorkspaceId" :size="14" aria-hidden="true" />
        </RouterLink>
      </div>
    </div>

    <nav class="sidebar-nav" :aria-label="appNavigationLabel">
      <div v-for="(group, gi) in groups" :key="gi" class="nav-group">
        <p v-if="group.label" class="nav-group-label">{{ group.label }}</p>
        <template v-for="item in group.items" :key="item.id">
          <AccessibleTip v-if="collapsed" :text="item.label" side="start">
            <RouterLink
              :to="item.to"
              class="nav-link"
              :class="{ active: item.active }"
              :data-testid="`nav-${item.id}`"
              :aria-current="item.active ? 'page' : undefined"
              :aria-label="item.label"
            >
              <component :is="item.icon" v-if="item.icon" class="nav-icon" :size="18" aria-hidden="true" />
              <span class="nav-label">{{ item.label }}</span>
            </RouterLink>
          </AccessibleTip>
          <RouterLink
            v-else
            :to="item.to"
            class="nav-link"
            :class="{ active: item.active }"
            :data-testid="`nav-${item.id}`"
            :aria-current="item.active ? 'page' : undefined"
          >
            <component :is="item.icon" v-if="item.icon" class="nav-icon" :size="18" aria-hidden="true" />
            <span class="nav-label">{{ item.label }}</span>
          </RouterLink>
        </template>
      </div>
    </nav>

    <div class="sidebar-footer">
      <slot name="footer" />
      <AccessibleTip v-if="toggleLabel" :text="toggleLabel" :side="collapsed ? 'start' : 'below'">
        <button
          type="button"
          class="rail-toggle"
          data-testid="sidebar-rail-toggle"
          :aria-expanded="!collapsed"
          aria-controls="app-shell-sidebar"
          :aria-label="toggleLabel"
          @click="emit('toggleCollapsed')"
        >
          <PanelLeftOpen v-if="collapsed" :size="18" aria-hidden="true" />
          <PanelLeftClose v-else :size="18" aria-hidden="true" />
          <span class="nav-label">{{ toggleLabel }}</span>
        </button>
      </AccessibleTip>
      <div v-if="userName" class="user-card" data-testid="sidebar-user" :title="collapsed ? userName : undefined">
        <span class="user-avatar" aria-hidden="true">{{ initials(userName) }}</span>
        <span class="user-copy">
          <span class="user-name"><bdi>{{ userName }}</bdi></span>
          <span v-if="userEmail" class="user-email" dir="ltr">{{ userEmail }}</span>
        </span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: var(--shell-sidebar-width);
  height: 100%;
  min-height: 0;
  overflow: hidden auto;
  padding: var(--space-3) var(--space-3) var(--space-3);
  background: var(--color-surface);
  border-inline-end: 1px solid var(--color-border);
}

/* Matches the 56px TopBar so the drawer and header share one baseline (S1). */
.brand-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  box-sizing: border-box;
  block-size: var(--shell-topbar-height);
  margin: calc(-1 * var(--space-3)) calc(-1 * var(--space-3)) var(--space-3);
  padding-inline: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.product-name {
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.workspace-switcher { position: relative; margin-bottom: var(--space-4); }
.workspace-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  inline-size: 100%;
  box-sizing: border-box;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md, 10px);
  background: color-mix(in srgb, var(--color-brand-navy) 8%, var(--color-surface));
  color: inherit;
  text-align: start;
  cursor: pointer;
}
.workspace-trigger:hover { border-color: color-mix(in srgb, var(--color-brand-amber-ui) 55%, var(--color-border)); }
.workspace-trigger:focus-visible,
.nav-link:focus-visible,
.rail-toggle:focus-visible,
.workspace-option:focus-visible { outline: 2px solid var(--color-brand-amber-ui); outline-offset: 2px; }
.workspace-avatar,
.user-avatar {
  display: inline-grid;
  place-items: center;
  flex: none;
  inline-size: 2rem;
  block-size: 2rem;
  border-radius: var(--r-sm);
  background: #12264a;
  color: #fff;
  font-size: var(--text-12);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.02em;
}
.workspace-avatar { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-brand-amber-ui) 60%, transparent); }
.workspace-avatar.small { inline-size: 1.625rem; block-size: 1.625rem; font-size: 11px; }
.workspace-copy, .user-copy { display: grid; min-inline-size: 0; flex: 1 1 auto; }
.workspace-label {
  font-size: 11px;
  line-height: 1.3;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.workspace-name {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  font-weight: var(--font-weight-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.workspace-chevron { flex: none; color: var(--color-text-muted); }
.workspace-menu {
  position: absolute;
  inset-inline: 0;
  inset-block-start: calc(100% + 4px);
  z-index: 80;
  display: grid;
  gap: 2px;
  min-inline-size: 13rem;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md, 10px);
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-md);
}
.workspace-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--r-sm);
  color: var(--color-text-primary);
  text-decoration: none;
}
.workspace-option:hover { background: var(--gray-3); }
.workspace-option[aria-current='true'] { color: var(--color-text-primary); }
.workspace-option svg { flex: none; color: var(--color-brand-amber-ui); }

.sidebar-nav { display: grid; gap: var(--space-4); }
.nav-group { display: grid; gap: 2px; }
.nav-group-label {
  margin: 0 0 var(--space-1);
  padding-inline: var(--space-2);
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.nav-link,
.rail-toggle {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-block-size: 2.25rem;
  box-sizing: border-box;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--color-text-secondary);
  text-decoration: none;
  font: inherit;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}
.nav-icon, .rail-toggle svg { flex: none; }
.nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-link:hover,
.rail-toggle:hover { background: var(--gray-3); color: var(--color-text-primary); }
.nav-link.active {
  background: color-mix(in srgb, var(--color-brand-amber-ui) 14%, transparent);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
}
.nav-link.active .nav-icon { color: var(--color-brand-amber-ui); }
.nav-link.active::before {
  content: '';
  position: absolute;
  inset-block: 6px;
  inset-inline-start: calc(-1 * var(--space-3));
  width: 3px;
  border-radius: 0 var(--r-full) var(--r-full) 0;
  background: var(--color-brand-amber-ui);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: var(--space-3);
  display: grid;
  gap: var(--space-2);
}
.rail-toggle { inline-size: 100%; font-size: var(--text-13); color: var(--color-text-muted); }
.user-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-top: 1px solid var(--color-border);
  margin-inline: calc(-1 * var(--space-3));
  padding-inline: var(--space-3);
  padding-block-start: var(--space-3);
}
.user-avatar { border-radius: var(--r-full); background: #1b3a6b; box-shadow: inset 0 0 0 1.5px var(--color-brand-amber-ui); }
.user-name {
  font-size: var(--text-13);
  font-weight: var(--font-weight-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-email {
  font-size: var(--text-12);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Icon rail (desktop only; the drawer below 900px always shows labels). */
@media (min-width: 901px) {
  .sidebar.is-rail { padding-inline: var(--space-2); }
  .sidebar.is-rail .brand-row { justify-content: center; padding-inline: 0; margin-inline: calc(-1 * var(--space-2)); }
  .sidebar.is-rail .product-name,
  .sidebar.is-rail .workspace-copy,
  .sidebar.is-rail .workspace-chevron,
  .sidebar.is-rail .nav-group-label,
  .sidebar.is-rail .user-copy { display: none; }
  .sidebar.is-rail .nav-label {
    position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
  }
  .sidebar.is-rail .workspace-trigger { justify-content: center; padding: var(--space-1); }
  .sidebar.is-rail .nav-link,
  .sidebar.is-rail .rail-toggle { justify-content: center; padding: 0; }
  .sidebar.is-rail .nav-link.active::before { inset-inline-start: calc(-1 * var(--space-2)); }
  .sidebar.is-rail .nav-group { padding-block-start: var(--space-2); border-top: 1px solid transparent; }
  .sidebar.is-rail .nav-group + .nav-group { border-top-color: var(--color-border); }
  .sidebar.is-rail .user-card { justify-content: center; margin-inline: calc(-1 * var(--space-2)); padding-inline: 0; }
  .sidebar.is-rail .workspace-menu { inset-inline-start: 0; inset-inline-end: auto; }
}
@media (max-width: 900px) {
  .rail-toggle { display: none; }
}
</style>
