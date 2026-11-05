<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../../components/ui/AppShell.vue'
import LocaleSwitcher from '../../components/layout/LocaleSwitcher.vue'
import { getCurrentSession, logoutUser } from '../../services/auth'
import { useThemeStore } from '../../stores/theme'
import { dashboardMessages } from '../../services/dashboard-messages'
import { navigationMessages } from '../../services/navigation-messages'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import {
  listWorkspaces,
  type Workspace
} from '../../services/workspaces'
import {
  projectPath,
  rememberLastWorkspaceId,
  scanReportPath,
  workspaceRootPath,
  workspaceScansPath,
  workspaceSettingsPath
} from '../../services/dashboard-routes'

interface SidebarNavItem {
  id: string
  label: string
  to: string
  active: boolean
}

interface BreadcrumbItem {
  label: string
  to?: string
}

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const session = getCurrentSession()
const workspaces = ref<Workspace[]>([])
const loading = ref(true)
const loadError = ref('')

const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})

const messages = computed(() => dashboardMessages(locale.value))
const navMessages = computed(() => navigationMessages(locale.value))

const workspaceParam = computed(() =>
  typeof route.params.workspace === 'string' ? route.params.workspace : ''
)

const projectId = computed(() =>
  typeof route.params.projectId === 'string' ? route.params.projectId : ''
)

const scanId = computed(() => (typeof route.params.scanId === 'string' ? route.params.scanId : ''))

const scanTab = computed(() => (typeof route.params.tab === 'string' ? route.params.tab : ''))

const selectedWorkspace = computed(
  () => workspaces.value.find(workspace => workspace.id === workspaceParam.value) ?? null
)

provide('dashboardWorkspaceId', workspaceParam)
provide('dashboardProjectId', projectId)
provide('dashboardScanId', scanId)

const navItems = computed<SidebarNavItem[]>(() => {
  if (!workspaceParam.value) return []
  const base = locale.value
  const ws = workspaceParam.value
  return [
    {
      id: 'projects',
      label: messages.value.projects,
      to: workspaceRootPath(base, ws),
      active: route.name === 'workspace-projects' || route.name === 'workspace-project'
    },
    {
      id: 'scans',
      label: messages.value.scansNav,
      to: workspaceScansPath(base, ws),
      active:
        route.name === 'workspace-scans'
        ||         route.name === 'project-scans'
        || route.name === 'scan-report'
        || route.name === 'project-graph'
        || route.name === 'open-project'
    },
    {
      id: 'settings',
      label: messages.value.settingsNav,
      to: workspaceSettingsPath(base, ws),
      active: route.name === 'workspace-settings'
    }
  ]
})

const flushContent = computed(
  () => route.name === 'project-graph'
)

const fillContent = computed(
  () => route.name === 'project-graph' || (route.name === 'scan-report' && scanTab.value === 'graph')
)

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = []
  if (selectedWorkspace.value) {
    items.push({
      label: selectedWorkspace.value.name,
      to: workspaceRootPath(locale.value, selectedWorkspace.value.id)
    })
  }
  if (projectId.value) {
    const project = projectId.value
    items.push({
      label: messages.value.projectBreadcrumb,
      to: projectPath(locale.value, workspaceParam.value, project)
    })
  }
  if (scanId.value) {
    items.push({
      label: messages.value.scanBreadcrumb(scanId.value),
      to: scanReportPath(locale.value, workspaceParam.value, projectId.value || 'default', scanId.value)
    })
  }
  if (route.name === 'project-graph' || scanTab.value === 'graph') {
    items.push({ label: messages.value.graphTabBreadcrumb })
  } else if (scanTab.value) {
    items.push({ label: scanTab.value })
  } else if (route.name === 'open-project') {
    items.push({ label: messages.value.openProjectNav })
  } else if (route.name === 'workspace-settings') {
    items.push({ label: messages.value.settingsNav })
  }
  return items
})

async function loadWorkspaces() {
  loading.value = true
  loadError.value = ''
  try {
    workspaces.value = await listWorkspaces()
    if (workspaceParam.value === 'pending' && workspaces.value[0]) {
      await router.replace({
        path: workspaceRootPath(locale.value, workspaces.value[0].id),
        query: route.query,
        hash: route.hash
      })
      return
    }
    if (
      workspaceParam.value &&
      workspaceParam.value !== 'pending' &&
      !workspaces.value.some(workspace => workspace.id === workspaceParam.value)
    ) {
      await router.replace(workspaceRootPath(locale.value, workspaces.value[0]?.id ?? 'pending'))
    }
    if (selectedWorkspace.value) rememberLastWorkspaceId(selectedWorkspace.value.id)
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : messages.value.loadWorkspaceError
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  await logoutUser()
  await router.push(`/${locale.value}/auth/login`)
}

watch(workspaceParam, workspaceId => {
  if (workspaceId && workspaceId !== 'pending') rememberLastWorkspaceId(workspaceId)
})

onMounted(loadWorkspaces)
</script>

<template>
  <AppShell
    :workspace-name="selectedWorkspace?.name ?? messages.loadingWorkspaces"
    :nav-items="navItems"
    :breadcrumbs="breadcrumbs"
    :app-navigation-label="messages.appShellNavigation"
    :workspace-label="messages.workspace"
    :skip-to-content-label="messages.skipToContent"
    :command-palette-label="messages.commandPalette"
    :command-palette-hint="messages.commandPaletteHint"
    :flush-content="flushContent"
    :fill-content="fillContent"
  >
    <template #top-actions>
      <button v-if="session" type="button" class="ghost-button" @click="handleLogout">
        {{ messages.logOut }}
      </button>
    </template>

    <template #sidebar-footer>
      <LocaleSwitcher />
      <button type="button" class="ghost-button" @click="themeStore.toggleTheme()">
        {{ navMessages.toggleTheme }}
      </button>
      <p v-if="session?.user" class="user-meta">{{ session.user.fullName }}</p>
    </template>

    <div v-if="loading" class="state-card" role="status" :aria-label="messages.loadingWorkspaces">
      {{ messages.loadingWorkspaces }}
    </div>
    <div v-else-if="loadError" class="state-card error" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" class="primary-button" @click="loadWorkspaces">{{ messages.retry }}</button>
    </div>
    <RouterView v-else class="shell-route" />
  </AppShell>
</template>

<style scoped>
.shell-route {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.state-card {
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
}

.state-card.error {
  color: var(--color-danger);
}

.ghost-button {
  justify-self: start;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.ghost-button:hover {
  background: var(--gray-3);
  color: var(--color-text-primary);
}

.user-meta {
  margin: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
}

.primary-button {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--button-primary-border);
  border-radius: var(--r-sm);
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
  font-size: var(--text-14);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.primary-button:hover {
  background: var(--button-primary-hover-bg);
}
</style>
