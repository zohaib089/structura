<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '../components/layout/Navbar.vue'
import DashboardToast from '../components/dashboard/DashboardToast.vue'
import SyntheticArchitectureDemo from '../components/dashboard/SyntheticArchitectureDemo.vue'
import { getCurrentSession } from '../services/auth'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../services/locale'
import { dashboardMessages } from '../services/dashboard-messages'
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
type DashboardSection = 'overview' | 'projects' | 'architecture' | 'team'
const activeSection = ref<DashboardSection>('overview')
const sectionTitle = computed(() => ({
  overview: messages.value.overview,
  projects: messages.value.projects,
  architecture: messages.value.architecture,
  team: messages.value.team
}[activeSection.value]))
const session = getCurrentSession()
const user = session?.user
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
const toastMessage = ref('')
let toastTimeout: ReturnType<typeof setTimeout> | undefined
const selectedWorkspace = computed(() =>
  workspaces.value.find(workspace => workspace.id === selectedWorkspaceId.value) ?? null
)
const recentProjects = computed(() =>
  [...projects.value]
    .sort((first, second) => Date.parse(second.updated_at) - Date.parse(first.updated_at))
    .slice(0, 5)
)
const filteredProjects = computed(() => {
  const search = projectSearch.value.trim().toLocaleLowerCase(locale.value)
  if (!search) return projects.value
  return projects.value.filter(project =>
    `${project.name} ${project.description}`.toLocaleLowerCase(locale.value).includes(search)
  )
})

function formatDate(value: string) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(value))
}

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    toastMessage.value = ''
    toastTimeout = undefined
  }, 5000)
}

function dismissToast() {
  toastMessage.value = ''
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = undefined
}

async function loadProjects(workspaceId: string) {
  projects.value = await listProjects(workspaceId)
}

async function selectWorkspace() {
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
    if (invitationToken) {
      activeSection.value = 'team'
      await acceptWorkspaceInvitation(invitationToken)
      showToast(messages.value.invitationAccepted)
      const query = { ...route.query }
      delete query.invitation
      await router.replace({ path: route.path, query, hash: route.hash })
    }

    workspaces.value = await listWorkspaces()
    if (!workspaces.value.some(workspace => workspace.id === selectedWorkspaceId.value)) {
      selectedWorkspaceId.value = workspaces.value[0]?.id ?? ''
    }
    projects.value = selectedWorkspaceId.value
      ? await listProjects(selectedWorkspaceId.value)
      : []
    if (activeSection.value === 'team') await loadTeam()
  } catch (cause) {
    dashboardLoadError.value = cause instanceof Error ? cause.message : messages.value.loadWorkspaceError
  } finally {
    loading.value = false
  }
}

watch([activeSection, selectedWorkspaceId], ([section]) => {
  if (section === 'team' && !loading.value) void loadTeam()
})

onMounted(loadDashboard)
onBeforeUnmount(() => {
  if (toastTimeout) clearTimeout(toastTimeout)
})
</script>

<template>
  <div class="dashboard-page">
    <Navbar />
    <DashboardToast
      v-if="toastMessage"
      :message="toastMessage"
      :dismiss-label="messages.dismissNotification"
      @dismiss="dismissToast"
    />

    <main class="dashboard-shell">
      <aside class="sidebar">
        <div class="brand-block">
          <div class="brand-mark">S</div>
          <div>
            <p class="eyebrow">{{ messages.workspace }}</p>
            <h2>Structura</h2>
          </div>
        </div>

        <nav class="sidebar-nav" :aria-label="messages.dashboardNavigation">
          <button
            type="button"
            class="nav-item"
            :class="{ active: activeSection === 'overview' }"
            :aria-current="activeSection === 'overview' ? 'page' : undefined"
            @click="activeSection = 'overview'"
          >{{ messages.overview }}</button>
          <button
            type="button"
            class="nav-item"
            :class="{ active: activeSection === 'projects' }"
            :aria-current="activeSection === 'projects' ? 'page' : undefined"
            @click="activeSection = 'projects'"
          >{{ messages.projects }}</button>
          <button
            type="button"
            class="nav-item"
            :class="{ active: activeSection === 'architecture' }"
            :aria-current="activeSection === 'architecture' ? 'page' : undefined"
            @click="activeSection = 'architecture'"
          >{{ messages.architecture }}</button>
          <button
            type="button"
            class="nav-item"
            :class="{ active: activeSection === 'team' }"
            :aria-current="activeSection === 'team' ? 'page' : undefined"
            @click="activeSection = 'team'"
          >{{ messages.team }}</button>
        </nav>
      </aside>

      <section class="content-panel">
        <div class="top-row">
          <div>
            <p class="eyebrow muted">{{ messages.workspaceOverview }}</p>
            <h1>{{ sectionTitle }}</h1>
          </div>
          <label v-if="workspaces.length > 1" class="workspace-picker">
            <span class="sr-only">{{ messages.selectWorkspace }}</span>
            <select v-model="selectedWorkspaceId" :disabled="projectsLoading" @change="selectWorkspace">
              <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
                {{ workspace.name }}
              </option>
            </select>
          </label>
        </div>

        <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
        <div v-if="loading" class="loading-skeleton state-card" role="status" :aria-label="messages.loadingWorkspaces">
          <span class="sr-only">{{ messages.loadingWorkspaces }}</span>
          <div class="skeleton-line skeleton-title" aria-hidden="true" />
          <div class="skeleton-line skeleton-copy" aria-hidden="true" />
          <div class="skeleton-line skeleton-copy short" aria-hidden="true" />
          <div class="skeleton-card" aria-hidden="true" />
        </div>
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
                <span v-if="submitting" class="button-loader" aria-hidden="true" />
                {{ submitting ? messages.creating : messages.createWorkspace }}
              </button>
            </form>
          </section>

          <section v-else-if="activeSection === 'overview'" class="overview-section">
            <div class="state-card">
              <p class="eyebrow">{{ selectedWorkspace?.name }}</p>
              <h2>{{ user?.fullName || messages.operator }}</h2>
              <p>{{ messages.overviewDescription }}</p>
              <div class="overview-stats">
                <article class="overview-stat">
                  <span>{{ messages.projectCount }}</span>
                  <strong>{{ projects.length }}</strong>
                </article>
                <article class="overview-stat">
                  <span>{{ messages.workspaceRole }}</span>
                  <strong>{{ selectedWorkspace?.role === 'owner' ? messages.roleOwner : selectedWorkspace?.role === 'admin' ? messages.roleAdmin : messages.roleMember }}</strong>
                </article>
                <article class="overview-stat">
                  <span>{{ messages.workspaceCount }}</span>
                  <strong>{{ workspaces.length }}</strong>
                </article>
              </div>
              <div class="overview-actions">
                <button class="primary-button" type="button" @click="activeSection = 'projects'">
                  {{ messages.openProjects }}
                </button>
                <button class="secondary-button" type="button" @click="activeSection = 'architecture'">
                  {{ messages.architecture }}
                </button>
                <button class="secondary-button" type="button" @click="activeSection = 'team'">
                  {{ messages.team }}
                </button>
              </div>
            </div>

            <section class="state-card recent-projects" :aria-label="messages.recentProjects">
              <div class="section-heading">
                <h2>{{ messages.recentProjects }}</h2>
                <button class="secondary-button" type="button" @click="activeSection = 'projects'">
                  {{ messages.openProjects }}
                </button>
              </div>
              <p v-if="projectsError" class="feedback error" role="alert">{{ projectsError }}</p>
              <p v-else-if="projectsLoading" role="status">{{ messages.loadingWorkspaces }}</p>
              <p v-else-if="recentProjects.length === 0">{{ messages.noProjects }}</p>
              <ul v-else class="project-list">
                <li v-for="project in recentProjects" :key="project.id" class="project-item">
                  <div class="project-item-heading">
                    <h3>{{ project.name }}</h3>
                    <time :datetime="project.updated_at">{{ messages.lastUpdated }} · {{ formatDate(project.updated_at) }}</time>
                  </div>
                  <p>{{ project.description || messages.noDescription }}</p>
                </li>
              </ul>
            </section>
          </section>

          <section v-else-if="activeSection === 'projects'" class="projects-section">
            <div class="section-heading">
              <div>
                <p class="eyebrow">{{ messages.projects }}</p>
                <h2>{{ selectedWorkspace?.name }}</h2>
              </div>
            </div>

            <label class="project-search">
              <span class="sr-only">{{ messages.searchProjects }}</span>
              <input v-model="projectSearch" type="search" :placeholder="messages.searchProjects">
            </label>

            <div v-if="projectsError" class="state-card error-state" role="alert">
              <p>{{ projectsError }}</p>
              <button class="primary-button" type="button" @click="selectWorkspace">{{ messages.retry }}</button>
            </div>
            <div v-else-if="projectsLoading" class="project-skeleton" role="status" :aria-label="messages.loadingWorkspaces">
              <span class="sr-only">{{ messages.loadingWorkspaces }}</span>
              <div v-for="item in 2" :key="item" class="skeleton-card" aria-hidden="true" />
            </div>
            <div v-else-if="projects.length === 0" class="state-card">
              <h3>{{ messages.noProjects }}</h3>
              <p>{{ messages.createProjectPrompt }}</p>
            </div>
            <div v-else-if="filteredProjects.length === 0" class="state-card">
              <p>{{ messages.noMatchingProjects }}</p>
            </div>
            <ul v-else class="project-list">
              <li v-for="project in filteredProjects" :key="project.id" class="project-item">
                <div class="project-item-heading">
                <h3>{{ project.name }}</h3>
                  <time :datetime="project.updated_at">{{ messages.lastUpdated }} · {{ formatDate(project.updated_at) }}</time>
                </div>
                <p>{{ project.description || messages.noDescription }}</p>
              </li>
            </ul>

            <form
              v-if="selectedWorkspace?.role === 'owner' || selectedWorkspace?.role === 'admin'"
              class="project-form"
              @submit.prevent="handleCreateProject"
            >
              <h3>{{ messages.createProject }}</h3>
              <label>
                {{ messages.projectName }}
                <input v-model="projectName" maxlength="120" required>
              </label>
              <label>
                {{ messages.description }} <span class="optional-label">{{ messages.optional }}</span>
                <textarea v-model="projectDescription" maxlength="2000" rows="3" />
              </label>
              <button class="primary-button" type="submit" :disabled="submitting">
                <span v-if="submitting" class="button-loader" aria-hidden="true" />
                {{ submitting ? messages.creating : messages.createProject }}
              </button>
            </form>
          </section>

          <section v-else-if="activeSection === 'architecture'" class="feature-state">
            <p class="eyebrow">{{ selectedWorkspace?.name }}</p>
            <p>{{ messages.architectureDescription }}</p>
            <SyntheticArchitectureDemo :messages="messages" />
          </section>

          <section v-else class="team-section">
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
                  <span v-if="teamSubmitting" class="button-loader" aria-hidden="true" />
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
    </main>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-full), transparent), var(--color-surface));
  color: var(--color-text-primary);
}

.dashboard-shell {
  width: calc(100% - var(--space-8));
  margin: var(--space-28) auto var(--space-8);
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: var(--space-6);
}

.sidebar,
.content-panel {
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
  border-radius: var(--radius-2xl);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-80), transparent);
  box-shadow: var(--shadow-md);
}

.sidebar {
  padding: var(--space-5) var(--space-4);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-2) var(--space-5);
  border-bottom: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  font-weight: var(--font-weight-extrabold);
  background: var(--color-accent-gradient);
  color: var(--color-text-on-accent);
}

.eyebrow {
  margin: 0;
  font-size: var(--font-size-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--color-accent-primary);
}

.eyebrow.muted {
  color: var(--color-text-secondary);
}

.brand-block h2,
.top-row h1 {
  margin: 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

.nav-item {
  width: 100%;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  text-align: start;
  padding: var(--space-3) var(--space-3);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.nav-item.active {
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent);
  color: var(--color-text-primary);
}

.content-panel {
  padding: var(--space-6);
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.top-row h1 {
  margin-top: var(--space-2);
  font-size: clamp(var(--font-size-3xl), 2.5vw, var(--font-size-5xl));
  letter-spacing: var(--tracking-tighter);
}

.feedback {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
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
}

.overview-stat {
  display: grid;
  align-content: space-between;
  gap: var(--space-4);
  min-height: 6rem;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-50), transparent);
}

.overview-stat span {
  color: var(--color-text-secondary);
}

.overview-stat strong {
  font-size: var(--font-size-2xl);
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
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent);
}

.team-panel h2 {
  margin: 0;
  font-size: var(--font-size-xl);
}

.team-panel label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
}

.team-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.team-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
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
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
}

.secondary-button {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
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
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent);
}

.loading-skeleton,
.project-skeleton {
  display: grid;
  gap: var(--space-3);
}

.skeleton-line,
.skeleton-card {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-text-secondary) var(--alpha-08), transparent),
    color-mix(in srgb, var(--color-text-secondary) var(--alpha-20), transparent),
    color-mix(in srgb, var(--color-text-secondary) var(--alpha-08), transparent)
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer var(--duration-pulse) ease-in-out infinite;
}

.skeleton-line {
  height: 1rem;
  width: min(24rem, 80%);
  border-radius: var(--radius-sm);
}

.skeleton-title {
  height: 1.75rem;
  width: min(18rem, 60%);
}

.skeleton-line.short {
  width: min(14rem, 45%);
}

.skeleton-card {
  min-height: 5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.button-loader {
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-inline-end: var(--space-2);
  vertical-align: -0.15em;
  border: 2px solid currentColor;
  border-inline-end-color: transparent;
  border-radius: 50%;
  animation: loader-spin var(--duration-slow) linear infinite;
}

@keyframes skeleton-shimmer {
  to { background-position: -200% 0; }
}

@keyframes loader-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-line,
  .skeleton-card,
  .button-loader {
    animation: none;
  }
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
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}

.primary-button {
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: var(--color-accent-gradient-soft);
  color: var(--color-text-on-accent);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  white-space: nowrap;
}

.primary-button:disabled {
  cursor: wait;
  opacity: 0.7;
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
  font-size: var(--font-size-sm);
}

.project-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.project-item {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-50), transparent);
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
  font-size: var(--font-size-sm);
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
  .dashboard-shell {
    grid-template-columns: 1fr;
    margin-top: var(--space-24);
  }

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

  .project-item-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .team-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
