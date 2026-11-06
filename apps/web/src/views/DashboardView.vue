<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {useRoute, useRouter, RouterLink } from 'vue-router'
import HexLoader from '../components/ui/HexLoader.vue'
import SkeletonTableRows from '../components/ui/skeleton/SkeletonTableRows.vue'
import { useToast } from '../composables/useToast'
import DashboardScansHub from '../components/dashboard/DashboardScansHub.vue'
import ProjectsHomePanel from '../components/dashboard/ProjectsHomePanel.vue'
import OpenProjectPanel from '../components/dashboard/OpenProjectPanel.vue'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../services/locale'
import { dashboardMessages } from '../services/dashboard-messages'
import {
  openProjectPath,
  workspaceRootPath,
  workspaceSettingsPath
} from '../services/dashboard-routes'
import {
  createProject,
  createWorkspace,
  acceptWorkspaceInvitation,
  inviteWorkspaceMember,
  listProjects,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  listWorkspaces,
  revokeWorkspaceInvitation,
  type Project,
  type WorkspaceInvitation,
  type WorkspaceMember,
  type Workspace
} from '../services/workspaces'

const route = useRoute()
const router = useRouter()
const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => dashboardMessages(locale.value))
type DashboardSection =
  | 'projects'
  | 'open-project'
  | 'project'
  | 'scans'
  | 'scan-report'
  | 'workspace-scans'
  | 'settings'

const activeSection = computed<DashboardSection>(() => {
  const section = route.meta.dashboardSection
  if (typeof section === 'string') return section as DashboardSection
  return 'projects'
})

const routeProjectId = computed(() =>
  typeof route.params.projectId === 'string' ? route.params.projectId : ''
)

const routeScanId = computed(() => (typeof route.params.scanId === 'string' ? route.params.scanId : ''))

const currentProjectName = computed(() => {
  const match = projects.value.find(project => project.id === routeProjectId.value)
  return match?.name ?? routeProjectId.value
})

const sectionTitle = computed(() => ({
  projects: messages.value.projects,
  'open-project': messages.value.openProjectNav,
  project: messages.value.projects,
  scans: messages.value.scansNav,
  'scan-report': messages.value.scansNav,
  'workspace-scans': messages.value.scansNav,
  settings: messages.value.settingsNav
}[activeSection.value]))
const workspaces = ref<Workspace[]>([])
const projects = ref<Project[]>([])
const projectSearch = ref('')
const selectedWorkspaceId = ref('')
const loading = ref(true)
const projectsLoading = ref(false)
const submitting = ref(false)
const error = ref('')
const dashboardLoadError = ref('')
const projectsError = ref('')
const teamLoading = ref(false)
const teamError = ref('')
const teamSubmitting = ref(false)
const inviteEmail = ref('')
const teamMembers = ref<WorkspaceMember[]>([])
const pendingInvitations = ref<WorkspaceInvitation[]>([])
const workspaceName = ref('')
const projectName = ref('')
const projectDescription = ref('')
const toast = useToast()
const selectedWorkspace = computed(() =>
  workspaces.value.find(workspace => workspace.id === selectedWorkspaceId.value) ?? null
)
function showToast(message: string) {
  toast.success(message, { dismissLabel: messages.value.dismissNotification })
}

async function loadProjects(workspaceId: string) {
  projects.value = await listProjects(workspaceId)
}

async function reloadProjectsForWorkspace() {
  projectsError.value = ''
  projectSearch.value = ''
  projects.value = []
  if (!selectedWorkspaceId.value) return
  projectsLoading.value = true
  try {
    await loadProjects(selectedWorkspaceId.value)
  } catch (cause) {
    projectsError.value = cause instanceof Error ? cause.message : messages.value.loadProjectsError
  } finally {
    projectsLoading.value = false
  }
}

async function onWorkspacePickerChange() {
  await reloadProjectsForWorkspace()
  if (selectedWorkspaceId.value) {
    await router.push(workspaceRootPath(locale.value, selectedWorkspaceId.value))
  }
}

async function handleCreateWorkspace() {
  submitting.value = true
  error.value = ''
  try {
    const workspace = await createWorkspace(workspaceName.value)
    workspaces.value = [...workspaces.value, workspace]
    selectedWorkspaceId.value = workspace.id
    workspaceName.value = ''
    projects.value = []
    showToast(messages.value.workspaceCreated)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : messages.value.createWorkspaceError
  } finally {
    submitting.value = false
  }
}

async function handleCreateProject() {
  if (!selectedWorkspaceId.value) return
  submitting.value = true
  error.value = ''
  try {
    const project = await createProject(
      selectedWorkspaceId.value,
      projectName.value,
      projectDescription.value
    )
    projects.value = [project, ...projects.value]
    projectName.value = ''
    projectDescription.value = ''
    showToast(messages.value.projectCreated)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : messages.value.createProjectError
  } finally {
    submitting.value = false
  }
}

async function loadTeam() {
  if (!selectedWorkspaceId.value) return
  teamLoading.value = true
  teamError.value = ''
  try {
    teamMembers.value = await listWorkspaceMembers(selectedWorkspaceId.value)
    pendingInvitations.value = selectedWorkspace.value?.role === 'owner' || selectedWorkspace.value?.role === 'admin'
      ? await listWorkspaceInvitations(selectedWorkspaceId.value)
      : []
  } catch (cause) {
    teamError.value = cause instanceof Error ? cause.message : messages.value.loadProjectsError
  } finally {
    teamLoading.value = false
  }
}

async function handleInviteMember() {
  if (!selectedWorkspaceId.value) return
  teamSubmitting.value = true
  teamError.value = ''
  try {
    const invitation = await inviteWorkspaceMember(selectedWorkspaceId.value, inviteEmail.value)
    pendingInvitations.value = [...pendingInvitations.value, invitation]
    inviteEmail.value = ''
    showToast(messages.value.inviteSuccess)
  } catch (cause) {
    teamError.value = cause instanceof Error ? cause.message : messages.value.createProjectError
  } finally {
    teamSubmitting.value = false
  }
}

async function handleRevokeInvitation(invitationId: string) {
  if (!selectedWorkspaceId.value) return
  teamError.value = ''
  try {
    await revokeWorkspaceInvitation(selectedWorkspaceId.value, invitationId)
    pendingInvitations.value = pendingInvitations.value.filter(invitation => invitation.id !== invitationId)
  } catch (cause) {
    teamError.value = cause instanceof Error ? cause.message : messages.value.loadProjectsError
  }
}

async function loadDashboard() {
  loading.value = true
  error.value = ''
  dashboardLoadError.value = ''
  try {
    const invitationToken = typeof route.query.invitation === 'string' ? route.query.invitation : ''
    workspaces.value = await listWorkspaces()
    const routeWorkspaceId =
      typeof route.params.workspace === 'string' ? route.params.workspace : ''
    if (routeWorkspaceId && routeWorkspaceId !== 'pending') {
      selectedWorkspaceId.value = routeWorkspaceId
    } else if (!workspaces.value.some(workspace => workspace.id === selectedWorkspaceId.value)) {
      selectedWorkspaceId.value = workspaces.value[0]?.id ?? ''
    }

    if (invitationToken) {
      const { workspaceId } = await acceptWorkspaceInvitation(invitationToken)
      showToast(messages.value.invitationAccepted)
      const query = { ...route.query }
      delete query.invitation
      selectedWorkspaceId.value = workspaceId
      await router.replace({
        path: workspaceSettingsPath(locale.value, workspaceId),
        query,
        hash: route.hash
      })
      await loadTeam()
      return
    }

    projects.value = selectedWorkspaceId.value
      ? await listProjects(selectedWorkspaceId.value)
      : []
    if (activeSection.value === 'settings') await loadTeam()
  } catch (cause) {
    dashboardLoadError.value = cause instanceof Error ? cause.message : messages.value.loadWorkspaceError
  } finally {
    loading.value = false
  }
}

watch([activeSection, selectedWorkspaceId], ([section]) => {
  if (section === 'settings' && !loading.value) void loadTeam()
})

watch(
  () => route.params.workspace,
  workspaceId => {
    if (typeof workspaceId === 'string' && workspaceId !== 'pending') {
      selectedWorkspaceId.value = workspaceId
      if (!loading.value) void reloadProjectsForWorkspace()
    }
  }
)

onMounted(loadDashboard)
</script>

<template>
  <div class="dashboard-page" :class="{ 'dashboard-page--fill': activeSection === 'scan-report' }">
    <section class="dashboard-content">
      <div v-if="activeSection !== 'projects'" class="page-header">
        <div>
          <h1>{{ sectionTitle }}</h1>
        </div>
        <label v-if="workspaces.length > 1" class="workspace-picker">
          <span class="sr-only">{{ messages.selectWorkspace }}</span>
          <select
            v-model="selectedWorkspaceId"
            :disabled="projectsLoading"
            @change="onWorkspacePickerChange"
          >
            <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
              {{ workspace.name }}
            </option>
          </select>
        </label>
      </div>

        <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
        <SkeletonTableRows v-if="loading" :rows="4" :label="messages.loadingWorkspaces" />
        <div v-else-if="dashboardLoadError" class="state-card error-state" role="alert">
          <p>{{ dashboardLoadError }}</p>
          <button class="primary-button" type="button" @click="loadDashboard">{{ messages.retry }}</button>
        </div>

        <template v-else-if="!loading">
          <section v-if="workspaces.length === 0" class="state-card">
            <p class="eyebrow">{{ messages.getStarted }}</p>
            <h2>{{ messages.createFirstWorkspace }}</h2>
            <p>{{ messages.workspaceDescription }}</p>
            <form class="inline-form" @submit.prevent="handleCreateWorkspace">
              <label class="sr-only" for="workspace-name">{{ messages.workspaceName }}</label>
              <input
                id="workspace-name"
                v-model="workspaceName"
                maxlength="120"
                :placeholder="messages.workspacePlaceholder"
                required
              >
              <button class="primary-button" type="submit" :disabled="submitting">
                <HexLoader v-if="submitting" size="sm" :label="messages.creating" hide-label inline :delay="0" :min-visible="0" />
                {{ submitting ? messages.creating : messages.createWorkspace }}
              </button>
            </form>
          </section>

          <section v-else-if="activeSection === 'open-project' && selectedWorkspaceId" class="open-project-section">
            <OpenProjectPanel
              :workspace-id="selectedWorkspaceId"
              :locale="locale"
            />
          </section>

          <ProjectsHomePanel
            v-else-if="activeSection === 'projects' && selectedWorkspaceId"
            :locale="locale"
            :workspace-id="selectedWorkspaceId"
            :workspace-name="selectedWorkspace?.name ?? ''"
            :projects="projects"
            :loading="projectsLoading"
            :error="projectsError"
            :can-create="selectedWorkspace?.role === 'owner' || selectedWorkspace?.role === 'admin'"
            :search="projectSearch"
            :project-name="projectName"
            :project-description="projectDescription"
            :submitting="submitting"
            @update:search="projectSearch = $event"
            @update:project-name="projectName = $event"
            @update:project-description="projectDescription = $event"
            @retry="reloadProjectsForWorkspace"
            @create="handleCreateProject"
          />

          <section
            v-else-if="activeSection === 'project' && selectedWorkspaceId"
            class="project-summary"
            data-testid="project-summary"
          >
            <header class="project-summary__header">
              <div>
                <p class="eyebrow">{{ messages.projects }}</p>
                <h2>{{ currentProjectName }}</h2>
                <p class="project-summary__blurb">{{ messages.projectSummaryBlurb }}</p>
              </div>
              <RouterLink
                class="project-summary__cta"
                :to="openProjectPath(locale, selectedWorkspaceId)"
              >
                {{ messages.scanAProject }}
              </RouterLink>
            </header>
            <DashboardScansHub
              :workspace-id="selectedWorkspaceId"
              :locale="locale"
              compact
              :initial-scan-id="routeScanId || null"
              :project-id="routeProjectId || null"
              :initial-insight-view="routeScanId ? 'report' : 'graph'"
            />
          </section>

          <DashboardScansHub
            v-else-if="
              (activeSection === 'workspace-scans'
                || activeSection === 'scans'
                || activeSection === 'scan-report')
              && selectedWorkspaceId
            "
            :workspace-id="selectedWorkspaceId"
            :locale="locale"
            :compact="false"
            :initial-scan-id="routeScanId || null"
            :project-id="routeProjectId || null"
            :initial-insight-view="routeScanId ? 'report' : 'graph'"
          />

          <section v-else-if="activeSection === 'settings'" class="team-section">
            <p class="eyebrow">{{ selectedWorkspace?.name }}</p>
            <p v-if="selectedWorkspace" class="role-summary">
              <strong>{{ messages.workspaceRole }}:</strong>
              {{ selectedWorkspace.role === 'owner' ? messages.roleOwner : selectedWorkspace.role === 'admin' ? messages.roleAdmin : messages.roleMember }}
            </p>
            <div v-if="teamError" class="state-card error-state" role="alert">
              <p>{{ teamError }}</p>
              <button class="primary-button" type="button" @click="loadTeam">{{ messages.retry }}</button>
            </div>
            <div v-else-if="teamLoading" class="state-card" role="status">{{ messages.loadingWorkspaces }}</div>

            <template v-else-if="!teamError">
              <section class="team-panel">
                <h2>{{ messages.teamMembers }}</h2>
                <p v-if="teamMembers.length === 0">{{ messages.noTeamMembers }}</p>
                <ul v-else class="team-list">
                  <li v-for="member in teamMembers" :key="member.id" class="team-item">
                    <div><strong>{{ member.full_name }}</strong><span>{{ member.email }}</span></div>
                    <span class="member-role">{{ member.role === 'owner' ? messages.roleOwner : member.role === 'admin' ? messages.roleAdmin : messages.roleMember }}</span>
                  </li>
                </ul>
              </section>

              <form
                v-if="selectedWorkspace?.role === 'owner' || selectedWorkspace?.role === 'admin'"
                class="team-panel invite-form"
                @submit.prevent="handleInviteMember"
              >
                <h2>{{ messages.sendInvitation }}</h2>
                <label>
                  {{ messages.inviteEmailLabel }}
                  <input v-model="inviteEmail" type="email" maxlength="254" autocomplete="email" required>
                </label>
                <button class="primary-button" type="submit" :disabled="teamSubmitting">
                  <HexLoader v-if="teamSubmitting" size="sm" :label="messages.sendInvitation" hide-label inline :delay="0" :min-visible="0" />
                  {{ messages.sendInvitation }}
                </button>
              </form>

              <section v-if="selectedWorkspace?.role === 'owner' || selectedWorkspace?.role === 'admin'" class="team-panel">
                <h2>{{ messages.pendingInvitations }}</h2>
                <p v-if="pendingInvitations.length === 0">{{ messages.noPendingInvitations }}</p>
                <ul v-else class="team-list">
                  <li v-for="invitation in pendingInvitations" :key="invitation.id" class="team-item">
                    <div>
                      <strong>{{ invitation.email }}</strong>
                      <span>{{ messages.invitedBy }} {{ invitation.inviter_name }} · {{ messages.expiresAt }} {{ new Date(invitation.expires_at).toLocaleDateString(locale) }}</span>
                    </div>
                    <button class="secondary-button" type="button" @click="handleRevokeInvitation(invitation.id)">
                      {{ messages.revokeInvitation }}
                    </button>
                  </li>
                </ul>
              </section>
            </template>
          </section>

        </template>
      </section>
  </div>
</template>

<style scoped>
.dashboard-page {
  color: var(--color-text-primary);
}

.dashboard-page--fill {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-block-size: 0;
  block-size: 100%;
}

.dashboard-page--fill .dashboard-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-block-size: 0;
}

.dashboard-page--fill .page-header {
  flex-shrink: 0;
}

.dashboard-page--fill :deep(.scans-hub--report) {
  flex: 1 1 auto;
  min-block-size: 0;
}

.dashboard-content {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-eyebrow {
  margin: 0 0 var(--space-1);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.page-header h1 {
  margin: 0;
  font-size: var(--text-20);
  line-height: var(--text-20-lh);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
}

.eyebrow {
  margin: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.feedback {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--r-md);
}

.feedback.error {
  border: 1px solid color-mix(in srgb, var(--color-danger) var(--alpha-40), var(--color-border));
  background: color-mix(in srgb, var(--color-danger) var(--alpha-08), transparent);
  color: var(--color-danger);
}

.projects-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.overview-section {
  display: grid;
  gap: var(--space-5);
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-5);
  border-block: 1px solid var(--color-border);
}

.overview-stat {
  display: grid;
  align-content: space-between;
  gap: var(--space-4);
  min-height: 6rem;
  padding: var(--space-4) var(--space-5);
  border-inline-end: 1px solid var(--color-border);
}

.overview-stat:last-child {
  border-inline-end: 0;
}

.overview-stat span {
  color: var(--color-text-secondary);
}

.overview-stat strong {
  font-size: var(--text-24);
  line-height: var(--text-24-lh);
  font-variant-numeric: tabular-nums;
}

.overview-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.recent-projects .section-heading h2 {
  margin: 0;
}

.role-summary {
  color: var(--color-text-secondary);
}

.feature-state {
  display: grid;
  gap: var(--space-3);
}

.feature-state h2,
.feature-state p {
  margin: 0;
}

.team-section {
  display: grid;
  gap: var(--space-4);
}

.team-section > p {
  margin: 0;
}

.team-panel {
  display: grid;
  gap: var(--space-3);
  padding-block: var(--space-5);
  border-block: 1px solid var(--color-border);
}

.team-panel h2 {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
}

.team-panel label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
}

.team-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  overflow: hidden;
}

.team-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-block-end: 1px solid var(--color-border);
}

.team-item:last-child {
  border-block-end: 0;
}

.team-item > div {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.team-item span {
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.member-role {
  flex: 0 0 auto;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--r-full);
  border: 1px solid var(--color-border);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.section-heading h2,
.state-card h2,
.state-card h3,
.project-item h3,
.project-form h3 {
  margin: var(--space-2) 0;
}

.state-card,
.project-form {
  padding: var(--space-5);
  border-block: 1px solid var(--color-border);
}

.state-card p,
.project-item p {
  color: var(--color-text-secondary);
}

.error-state {
  border-color: color-mix(in srgb, var(--color-danger) var(--alpha-40), var(--color-border));
}

.inline-form {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.dashboard-page input,
.dashboard-page select,
.dashboard-page textarea {
  width: 100%;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-md);
  padding: var(--space-3);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font: inherit;
}

.project-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.project-form label {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: var(--color-text-secondary);
}

.optional-label {
  font-size: var(--text-13);
}

.project-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  overflow: hidden;
}

.project-item {
  padding: var(--space-4);
  border-block-end: 1px solid var(--color-border);
  background: transparent;
}

.project-item:last-child {
  border-block-end: 0;
}

.project-item h3,
.project-item p {
  margin: 0;
}

.project-item-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.project-item-heading time {
  color: var(--color-text-secondary);
  font-size: var(--text-13);
  white-space: nowrap;
}

.project-item p {
  margin-top: var(--space-2);
}

.project-search {
  display: block;
  max-width: 32rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 920px) {
  .inline-form {
    flex-direction: column;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .overview-stats {
    grid-template-columns: 1fr;
  }

  .overview-stat {
    border-inline-end: 0;
    border-block-end: 1px solid var(--color-border);
  }

  .overview-stat:last-child {
    border-block-end: 0;
  }

  .project-item-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .team-item {
    align-items: flex-start;
    flex-direction: column;
  }
}

.project-summary {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.project-summary__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.project-summary__header h2 {
  margin: var(--space-1) 0;
  font-size: var(--text-24, 1.5rem);
  line-height: 1.25;
}

.project-summary__blurb {
  margin: 0;
  max-inline-size: 42rem;
  color: var(--color-text-secondary);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.project-summary__cta {
  display: inline-flex;
  align-items: center;
  min-block-size: 1.75rem;
  padding-inline: var(--space-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--button-primary-border);
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
  font-size: var(--text-14);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}

.project-summary__cta:hover {
  background: var(--button-primary-hover-bg);
}

.eyebrow {
  margin: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
