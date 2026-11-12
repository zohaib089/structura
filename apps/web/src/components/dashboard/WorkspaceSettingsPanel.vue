<script setup lang="ts">
/**
 * Workspace settings — identity, members, and email invitations.
 * The API can list members, invite by email (role is always member), and revoke
 * a pending invitation. It cannot rename a workspace, change roles, or remove members.
 */
import { computed, ref, watch } from 'vue'
import { useToast } from '../../composables/useToast'
import { dashboardMessages } from '../../services/dashboard-messages'
import type { WebLocale } from '../../services/locale'
import {
  inviteWorkspaceMember,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  revokeWorkspaceInvitation,
  type Workspace,
  type WorkspaceInvitation,
  type WorkspaceMember
} from '../../services/workspaces'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import EmptyState from '../ui/EmptyState.vue'
import ErrorState from '../ui/ErrorState.vue'
import Input from '../ui/Input.vue'
import SkeletonTableRows from '../ui/skeleton/SkeletonTableRows.vue'
import Table from '../ui/Table.vue'

const props = defineProps<{
  locale: WebLocale
  workspaceId: string
  workspaceName: string
  role: Workspace['role']
  createdAt: string
}>()

const messages = computed(() => dashboardMessages(props.locale))
const toast = useToast()

const members = ref<WorkspaceMember[]>([])
const invitations = ref<WorkspaceInvitation[]>([])
const loading = ref(true)
const loadError = ref<{ message: string; details?: string } | null>(null)
const inviteError = ref<{ message: string; details?: string } | null>(null)
const revokeError = ref<{ message: string; details?: string } | null>(null)
const email = ref('')
const emailError = ref('')
const submitting = ref(false)
const revokingId = ref('')
const failedRevokeId = ref('')

const canManage = computed(() => props.role === 'owner' || props.role === 'admin')

const roleLabel = computed(() => labelForRole(props.role))

let requestSeq = 0

function labelForRole(role: Workspace['role']) {
  if (role === 'owner') return messages.value.roleOwner
  if (role === 'admin') return messages.value.roleAdmin
  return messages.value.roleMember
}

function formatDate(value: string) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return ''
  return new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium' }).format(time)
}

function presentError(cause: unknown, fallback: string) {
  const raw = cause instanceof Error ? cause.message.trim() : ''
  if (!raw) return { message: fallback }
  const technical = /\/api\/|\bHTTP\b|\bstatus \d|\bTypeError\b|\bSyntaxError\b/i.test(raw) || raw.length > 220
  if (technical) return { message: fallback, details: raw }
  return { message: raw }
}

const INVITE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emailProblem(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return messages.value.settingsEmailRequired
  if (normalized.length > 254 || !INVITE_EMAIL.test(normalized)) return messages.value.settingsEmailInvalid
  return ''
}

function onEmailBlur() {
  emailError.value = emailProblem(email.value)
}

async function load() {
  const seq = ++requestSeq
  const workspaceId = props.workspaceId
  if (!workspaceId) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  inviteError.value = null
  revokeError.value = null
  try {
    const nextMembers = await listWorkspaceMembers(workspaceId)
    const nextInvitations = props.role === 'owner' || props.role === 'admin'
      ? await listWorkspaceInvitations(workspaceId)
      : []
    if (seq !== requestSeq) return
    members.value = nextMembers
    invitations.value = nextInvitations
  } catch (cause) {
    if (seq !== requestSeq) return
    members.value = []
    invitations.value = []
    loadError.value = presentError(cause, messages.value.settingsLoadError)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

async function submitInvite() {
  emailError.value = emailProblem(email.value)
  if (emailError.value || submitting.value || !canManage.value) return
  submitting.value = true
  inviteError.value = null
  try {
    const invitation = await inviteWorkspaceMember(props.workspaceId, email.value.trim())
    invitations.value = [...invitations.value, invitation]
    email.value = ''
    emailError.value = ''
    toast.success(messages.value.inviteSuccess, { dismissLabel: messages.value.dismissNotification })
  } catch (cause) {
    inviteError.value = presentError(cause, messages.value.settingsInviteError)
  } finally {
    submitting.value = false
  }
}

async function revoke(invitationId: string) {
  if (!invitationId || revokingId.value) return
  failedRevokeId.value = invitationId
  revokingId.value = invitationId
  revokeError.value = null
  try {
    await revokeWorkspaceInvitation(props.workspaceId, invitationId)
    invitations.value = invitations.value.filter(invitation => invitation.id !== invitationId)
  } catch (cause) {
    revokeError.value = presentError(cause, messages.value.settingsRevokeError)
  } finally {
    revokingId.value = ''
  }
}

watch(email, () => {
  inviteError.value = null
})

watch(() => [props.workspaceId, props.role] as const, () => {
  void load()
}, { immediate: true })
</script>

<template>
  <section class="settings" data-testid="workspace-settings" :aria-label="messages.settingsNav">
    <p class="settings__lead">{{ messages.settingsLead }}</p>

    <dl class="settings__facts">
      <div v-if="workspaceName">
        <dt>{{ messages.workspaceName }}</dt>
        <dd>{{ workspaceName }}</dd>
      </div>
      <div>
        <dt>{{ messages.workspaceRole }}</dt>
        <dd>
          <Badge>{{ roleLabel }}</Badge>
        </dd>
      </div>
      <div v-if="formatDate(createdAt)">
        <dt>{{ messages.settingsCreated }}</dt>
        <dd>
          <time :datetime="createdAt">{{ formatDate(createdAt) }}</time>
        </dd>
      </div>
      <div v-if="!loading && !loadError">
        <dt>{{ messages.settingsMembersStat }}</dt>
        <dd data-testid="settings-member-count">{{ members.length }}</dd>
      </div>
      <div v-if="canManage && !loading && !loadError">
        <dt>{{ messages.pendingInvitations }}</dt>
        <dd data-testid="settings-pending-count">{{ invitations.length }}</dd>
      </div>
    </dl>

    <p class="settings__limits">{{ messages.settingsLimits }}</p>

    <ErrorState
      v-if="loadError"
      :message="loadError.message"
      :details="loadError.details"
      :details-label="messages.settingsDetails"
      :retry-label="messages.retry"
      data-testid="settings-load-error"
      @retry="load"
    />
    <SkeletonTableRows
      v-else-if="loading"
      :rows="5"
      :label="messages.loadingWorkspaces"
      data-testid="settings-loading"
    />

    <template v-else>
      <section class="settings__section" :aria-label="messages.teamMembers">
        <h2>{{ messages.teamMembers }}</h2>
        <EmptyState
          v-if="members.length === 0"
          :title="messages.noTeamMembers"
          data-testid="settings-members-empty"
        />
        <Table
          v-else
          :caption="messages.teamMembers"
          data-testid="settings-members"
        >
          <thead>
            <tr>
              <th scope="col">{{ messages.projectsColName }}</th>
              <th scope="col">{{ messages.settingsColEmail }}</th>
              <th scope="col">{{ messages.settingsColRole }}</th>
              <th scope="col">{{ messages.settingsJoined }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in members" :key="member.id">
              <td>{{ member.full_name }}</td>
              <td class="settings__email">{{ member.email }}</td>
              <td>{{ labelForRole(member.role) }}</td>
              <td>
                <time :datetime="member.created_at">{{ formatDate(member.created_at) }}</time>
              </td>
            </tr>
          </tbody>
        </Table>
      </section>

      <section v-if="canManage" class="settings__section" :aria-label="messages.sendInvitation">
        <h2>{{ messages.sendInvitation }}</h2>
        <form class="settings__invite" data-testid="settings-invite" novalidate @submit.prevent="submitInvite">
          <div class="settings__invite-row">
            <Input
              v-model="email"
              type="email"
              :label="messages.inviteEmailLabel"
              :hint="messages.settingsInviteHint"
              :error="emailError"
              autocomplete="email"
              :maxlength="254"
              :disabled="submitting"
              @blur="onEmailBlur"
            />
            <div class="settings__invite-action">
              <Button variant="primary" size="sm" type="submit" :loading="submitting">
                {{ messages.sendInvitation }}
              </Button>
            </div>
          </div>
        </form>
        <ErrorState
          v-if="inviteError"
          :message="inviteError.message"
          :details="inviteError.details"
          :details-label="messages.settingsDetails"
          :retry-label="messages.retry"
          data-testid="settings-invite-error"
          @retry="submitInvite"
        />
      </section>
      <p v-else class="settings__limits">{{ messages.settingsAdminsOnly }}</p>

      <section v-if="canManage" class="settings__section" :aria-label="messages.pendingInvitations">
        <h2>{{ messages.pendingInvitations }}</h2>
        <ErrorState
          v-if="revokeError"
          :message="revokeError.message"
          :details="revokeError.details"
          :details-label="messages.settingsDetails"
          :retry-label="messages.retry"
          data-testid="settings-revoke-error"
          @retry="revoke(failedRevokeId)"
        />
        <p v-if="invitations.length === 0" class="settings__empty" data-testid="settings-invitations-empty">
          {{ messages.noPendingInvitations }}
        </p>
        <Table
          v-else
          :caption="messages.pendingInvitations"
          data-testid="settings-invitations"
        >
          <thead>
            <tr>
              <th scope="col">{{ messages.settingsColEmail }}</th>
              <th scope="col">{{ messages.settingsColRole }}</th>
              <th scope="col">{{ messages.invitedBy }}</th>
              <th scope="col">{{ messages.expiresAt }}</th>
              <th scope="col"><span class="sr-only">{{ messages.revokeInvitation }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invitation in invitations" :key="invitation.id">
              <td class="settings__email">{{ invitation.email }}</td>
              <td>{{ labelForRole(invitation.role) }}</td>
              <td>{{ invitation.inviter_name }}</td>
              <td>
                <time :datetime="invitation.expires_at">{{ formatDate(invitation.expires_at) }}</time>
              </td>
              <td>
                <Button
                  variant="danger"
                  size="sm"
                  type="button"
                  :loading="revokingId === invitation.id"
                  :disabled="Boolean(revokingId)"
                  @click="revoke(invitation.id)"
                >
                  {{ messages.revokeInvitation }}
                </Button>
              </td>
            </tr>
          </tbody>
        </Table>
      </section>
    </template>
  </section>
</template>

<style scoped>
.settings {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.settings__lead,
.settings__limits,
.settings__empty {
  margin: 0;
  max-inline-size: 46rem;
  color: var(--color-text-secondary);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.settings__limits,
.settings__empty {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}

.settings__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  margin: 0;
  border-block: 1px solid var(--color-border);
}

.settings__facts > div {
  display: grid;
  align-content: space-between;
  gap: var(--space-2);
  min-block-size: 4.5rem;
  padding: var(--space-3) var(--space-4);
  border-inline-end: 1px solid var(--color-border);
}

.settings__facts > div:last-child {
  border-inline-end: 0;
}

.settings__facts dt {
  margin: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.settings__facts dd {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}

.settings__section {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.settings__section h2 {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
  font-weight: var(--font-weight-semibold);
}

.settings__invite-row {
  display: grid;
  grid-template-columns: minmax(0, 28rem) auto;
  gap: var(--space-3);
  align-items: end;
}

.settings__invite-action {
  align-self: start;
  margin-block-start: calc(var(--text-14-lh) + var(--space-1));
}

.settings__email {
  overflow-wrap: anywhere;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .settings__invite-row {
    grid-template-columns: 1fr;
  }

  .settings__invite-action {
    margin-block-start: 0;
  }

  .settings__facts > div {
    border-inline-end: 0;
    border-block-end: 1px solid var(--color-border);
  }

  .settings__facts > div:last-child {
    border-block-end: 0;
  }
}
</style>
