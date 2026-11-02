/// <reference types="../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import DashboardToast from '../components/dashboard/DashboardToast.vue';
import SyntheticArchitectureDemo from '../components/dashboard/SyntheticArchitectureDemo.vue';
import { getCurrentSession } from '../services/auth';
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../services/locale';
import { dashboardMessages } from '../services/dashboard-messages';
import { createProject, createWorkspace, acceptWorkspaceInvitation, inviteWorkspaceMember, listProjects, listWorkspaceInvitations, listWorkspaceMembers, listWorkspaces, revokeWorkspaceInvitation } from '../services/workspaces';
const route = useRoute();
const router = useRouter();
const locale = computed(() => {
    const routeLocale = route.params.locale;
    if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale))
        return routeLocale;
    return resolvePreferredWebLocale(readLocalePreference(), navigator.languages);
});
const messages = computed(() => dashboardMessages(locale.value));
const activeSection = ref('overview');
const sectionTitle = computed(() => ({
    overview: messages.value.overview,
    projects: messages.value.projects,
    architecture: messages.value.architecture,
    team: messages.value.team
}[activeSection.value]));
const session = getCurrentSession();
const user = session?.user;
const workspaces = ref([]);
const projects = ref([]);
const projectSearch = ref('');
const selectedWorkspaceId = ref('');
const loading = ref(true);
const projectsLoading = ref(false);
const submitting = ref(false);
const error = ref('');
const dashboardLoadError = ref('');
const projectsError = ref('');
const teamLoading = ref(false);
const teamError = ref('');
const teamSubmitting = ref(false);
const inviteEmail = ref('');
const teamMembers = ref([]);
const pendingInvitations = ref([]);
const workspaceName = ref('');
const projectName = ref('');
const projectDescription = ref('');
const toastMessage = ref('');
let toastTimeout;
const selectedWorkspace = computed(() => workspaces.value.find(workspace => workspace.id === selectedWorkspaceId.value) ?? null);
const recentProjects = computed(() => [...projects.value]
    .sort((first, second) => Date.parse(second.updated_at) - Date.parse(first.updated_at))
    .slice(0, 5));
const filteredProjects = computed(() => {
    const search = projectSearch.value.trim().toLocaleLowerCase(locale.value);
    if (!search)
        return projects.value;
    return projects.value.filter(project => `${project.name} ${project.description}`.toLocaleLowerCase(locale.value).includes(search));
});
function formatDate(value) {
    return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(value));
}
function showToast(message) {
    toastMessage.value = message;
    if (toastTimeout)
        clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastMessage.value = '';
        toastTimeout = undefined;
    }, 5000);
}
function dismissToast() {
    toastMessage.value = '';
    if (toastTimeout)
        clearTimeout(toastTimeout);
    toastTimeout = undefined;
}
async function loadProjects(workspaceId) {
    projects.value = await listProjects(workspaceId);
}
async function selectWorkspace() {
    projectsError.value = '';
    projectSearch.value = '';
    projects.value = [];
    if (!selectedWorkspaceId.value)
        return;
    projectsLoading.value = true;
    try {
        await loadProjects(selectedWorkspaceId.value);
    }
    catch (cause) {
        projectsError.value = cause instanceof Error ? cause.message : messages.value.loadProjectsError;
    }
    finally {
        projectsLoading.value = false;
    }
}
async function handleCreateWorkspace() {
    submitting.value = true;
    error.value = '';
    try {
        const workspace = await createWorkspace(workspaceName.value);
        workspaces.value = [...workspaces.value, workspace];
        selectedWorkspaceId.value = workspace.id;
        workspaceName.value = '';
        projects.value = [];
        showToast(messages.value.workspaceCreated);
    }
    catch (cause) {
        error.value = cause instanceof Error ? cause.message : messages.value.createWorkspaceError;
    }
    finally {
        submitting.value = false;
    }
}
async function handleCreateProject() {
    if (!selectedWorkspaceId.value)
        return;
    submitting.value = true;
    error.value = '';
    try {
        const project = await createProject(selectedWorkspaceId.value, projectName.value, projectDescription.value);
        projects.value = [project, ...projects.value];
        projectName.value = '';
        projectDescription.value = '';
        showToast(messages.value.projectCreated);
    }
    catch (cause) {
        error.value = cause instanceof Error ? cause.message : messages.value.createProjectError;
    }
    finally {
        submitting.value = false;
    }
}
async function loadTeam() {
    if (!selectedWorkspaceId.value)
        return;
    teamLoading.value = true;
    teamError.value = '';
    try {
        teamMembers.value = await listWorkspaceMembers(selectedWorkspaceId.value);
        pendingInvitations.value = selectedWorkspace.value?.role === 'owner' || selectedWorkspace.value?.role === 'admin'
            ? await listWorkspaceInvitations(selectedWorkspaceId.value)
            : [];
    }
    catch (cause) {
        teamError.value = cause instanceof Error ? cause.message : messages.value.loadProjectsError;
    }
    finally {
        teamLoading.value = false;
    }
}
async function handleInviteMember() {
    if (!selectedWorkspaceId.value)
        return;
    teamSubmitting.value = true;
    teamError.value = '';
    try {
        const invitation = await inviteWorkspaceMember(selectedWorkspaceId.value, inviteEmail.value);
        pendingInvitations.value = [...pendingInvitations.value, invitation];
        inviteEmail.value = '';
        showToast(messages.value.inviteSuccess);
    }
    catch (cause) {
        teamError.value = cause instanceof Error ? cause.message : messages.value.createProjectError;
    }
    finally {
        teamSubmitting.value = false;
    }
}
async function handleRevokeInvitation(invitationId) {
    if (!selectedWorkspaceId.value)
        return;
    teamError.value = '';
    try {
        await revokeWorkspaceInvitation(selectedWorkspaceId.value, invitationId);
        pendingInvitations.value = pendingInvitations.value.filter(invitation => invitation.id !== invitationId);
    }
    catch (cause) {
        teamError.value = cause instanceof Error ? cause.message : messages.value.loadProjectsError;
    }
}
async function loadDashboard() {
    loading.value = true;
    error.value = '';
    dashboardLoadError.value = '';
    try {
        const invitationToken = typeof route.query.invitation === 'string' ? route.query.invitation : '';
        if (invitationToken) {
            activeSection.value = 'team';
            await acceptWorkspaceInvitation(invitationToken);
            showToast(messages.value.invitationAccepted);
            const query = { ...route.query };
            delete query.invitation;
            await router.replace({ path: route.path, query, hash: route.hash });
        }
        workspaces.value = await listWorkspaces();
        if (!workspaces.value.some(workspace => workspace.id === selectedWorkspaceId.value)) {
            selectedWorkspaceId.value = workspaces.value[0]?.id ?? '';
        }
        projects.value = selectedWorkspaceId.value
            ? await listProjects(selectedWorkspaceId.value)
            : [];
        if (activeSection.value === 'team')
            await loadTeam();
    }
    catch (cause) {
        dashboardLoadError.value = cause instanceof Error ? cause.message : messages.value.loadWorkspaceError;
    }
    finally {
        loading.value = false;
    }
}
watch([activeSection, selectedWorkspaceId], ([section]) => {
    if (section === 'team' && !loading.value)
        void loadTeam();
});
onMounted(loadDashboard);
onBeforeUnmount(() => {
    if (toastTimeout)
        clearTimeout(toastTimeout);
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_withDotValue(toastMessage, {});
    __VLS_withDotValue(messages, {});
    __VLS_withDotValue(activeSection, {});
    __VLS_withDotValue(workspaces, {});
    __VLS_withDotValue(error, {});
    __VLS_withDotValue(loading, {});
    __VLS_withDotValue(dashboardLoadError, {});
    __VLS_withDotValue(submitting, {});
    __VLS_withDotValue(selectedWorkspace, {});
    __VLS_withDotValue(user, {});
    __VLS_withDotValue(projects, {});
    __VLS_withDotValue(projectsError, {});
    __VLS_withDotValue(projectsLoading, {});
    __VLS_withDotValue(recentProjects, {});
    __VLS_withDotValue(filteredProjects, {});
    __VLS_withDotValue(teamError, {});
    __VLS_withDotValue(teamLoading, {});
    __VLS_withDotValue(teamMembers, {});
    __VLS_withDotValue(teamSubmitting, {});
    __VLS_withDotValue(pendingInvitations, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    /** @type {__VLS_StyleScopedClasses['brand-block']} */ ;
    /** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['feedback']} */ ;
    /** @type {__VLS_StyleScopedClasses['overview-stat']} */ ;
    /** @type {__VLS_StyleScopedClasses['overview-stat']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature-state']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature-state']} */ ;
    /** @type {__VLS_StyleScopedClasses['team-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['team-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['team-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['team-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['team-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
    /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
    /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-form']} */ ;
    /** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
    /** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
    /** @type {__VLS_StyleScopedClasses['skeleton-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
    /** @type {__VLS_StyleScopedClasses['skeleton-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['button-loader']} */ ;
    /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['dashboard-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['dashboard-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['dashboard-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-form']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-form']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-item-heading']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['dashboard-shell']} */ ;
    /** @type {__VLS_StyleScopedClasses['inline-form']} */ ;
    /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
    /** @type {__VLS_StyleScopedClasses['overview-stats']} */ ;
    /** @type {__VLS_StyleScopedClasses['project-item-heading']} */ ;
    /** @type {__VLS_StyleScopedClasses['team-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-page" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-page']} */ ;
    const __VLS_0 = Navbar;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    // @ts-ignore
    }));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    if (toastMessage.value) {
        const __VLS_5 = DashboardToast;
        // @ts-ignore
        const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
            // @ts-ignore
            ...{ 'onDismiss': {} }, message: (toastMessage.value), dismissLabel: (messages.value.dismissNotification),
        }));
        const __VLS_7 = __VLS_6({
            ...{ 'onDismiss': {} },
            message: (toastMessage.value),
            dismissLabel: (messages.value.dismissNotification),
        }, ...__VLS_functionalComponentArgsRest(__VLS_6));
        let __VLS_10;
        const __VLS_11 = {
            /** @type {typeof __VLS_10.dismiss} */
            onDismiss: (dismissToast),
        };
        void __VLS_11;
        var __VLS_8;
        var __VLS_9;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "dashboard-shell" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-shell']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "sidebar" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "brand-block" },
    });
    /** @type {__VLS_StyleScopedClasses['brand-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "brand-mark" },
    });
    /** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    (messages.value.workspace);
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
        ...{ class: "sidebar-nav" },
        'aria-label': (messages.value.dashboardNavigation),
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (activeSection.value = 'overview');
                // @ts-ignore
                [toastMessage, toastMessage, messages, messages, messages, activeSection,];
            } },
        type: "button",
        ...{ class: "nav-item" },
        ...{ class: ({ active: activeSection.value === 'overview' }) },
        'aria-current': (activeSection.value === 'overview' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (messages.value.overview);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (activeSection.value = 'projects');
                // @ts-ignore
                [messages, activeSection, activeSection, activeSection,];
            } },
        type: "button",
        ...{ class: "nav-item" },
        ...{ class: ({ active: activeSection.value === 'projects' }) },
        'aria-current': (activeSection.value === 'projects' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (messages.value.projects);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (activeSection.value = 'architecture');
                // @ts-ignore
                [messages, activeSection, activeSection, activeSection,];
            } },
        type: "button",
        ...{ class: "nav-item" },
        ...{ class: ({ active: activeSection.value === 'architecture' }) },
        'aria-current': (activeSection.value === 'architecture' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (messages.value.architecture);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (activeSection.value = 'team');
                // @ts-ignore
                [messages, activeSection, activeSection, activeSection,];
            } },
        type: "button",
        ...{ class: "nav-item" },
        ...{ class: ({ active: activeSection.value === 'team' }) },
        'aria-current': (activeSection.value === 'team' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (messages.value.team);
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "content-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "top-row" },
    });
    /** @type {__VLS_StyleScopedClasses['top-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow muted" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    /** @type {__VLS_StyleScopedClasses['muted']} */ ;
    (messages.value.workspaceOverview);
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    (__VLS_unwrap(sectionTitle, {}));
    if (workspaces.value.length > 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "workspace-picker" },
        });
        /** @type {__VLS_StyleScopedClasses['workspace-picker']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "sr-only" },
        });
        /** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
        (messages.value.selectWorkspace);
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            ...{ onChange: (selectWorkspace) },
            value: (__VLS_unwrap(selectedWorkspaceId, {})),
            disabled: (projectsLoading.value),
        });
        const __VLS_12 = __VLS_tryAsConstant((workspaces.value));
        for (const [workspace] of __VLS_vFor(__VLS_nonNull(__VLS_12))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                key: (workspace.id),
                value: (workspace.id),
            });
            (workspace.name);
            // @ts-ignore
            [messages, messages, messages, activeSection, activeSection, sectionTitle, workspaces, workspaces, selectedWorkspaceId, projectsLoading,];
        }
    }
    if (error.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "feedback error" },
            role: "alert",
        });
        /** @type {__VLS_StyleScopedClasses['feedback']} */ ;
        /** @type {__VLS_StyleScopedClasses['error']} */ ;
        (error.value);
    }
    if (loading.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "loading-skeleton state-card" },
            role: "status",
            'aria-label': (messages.value.loadingWorkspaces),
        });
        /** @type {__VLS_StyleScopedClasses['loading-skeleton']} */ ;
        /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "sr-only" },
        });
        /** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
        (messages.value.loadingWorkspaces);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "skeleton-line skeleton-title" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
        /** @type {__VLS_StyleScopedClasses['skeleton-title']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "skeleton-line skeleton-copy" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
        /** @type {__VLS_StyleScopedClasses['skeleton-copy']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "skeleton-line skeleton-copy short" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
        /** @type {__VLS_StyleScopedClasses['skeleton-copy']} */ ;
        /** @type {__VLS_StyleScopedClasses['short']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "skeleton-card" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['skeleton-card']} */ ;
    }
    else if (dashboardLoadError.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "state-card error-state" },
            role: "alert",
        });
        /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['error-state']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (dashboardLoadError.value);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (loadDashboard) },
            ...{ class: "primary-button" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
        (messages.value.retry);
    }
    else if (!loading.value) {
        if (workspaces.value.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                ...{ class: "state-card" },
            });
            /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "eyebrow" },
            });
            /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
            (messages.value.getStarted);
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
            (messages.value.createFirstWorkspace);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            (messages.value.workspaceDescription);
            __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
                ...{ onSubmit: (handleCreateWorkspace) },
                ...{ class: "inline-form" },
            });
            /** @type {__VLS_StyleScopedClasses['inline-form']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "sr-only" },
                for: "workspace-name",
            });
            /** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
            (messages.value.workspaceName);
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                id: "workspace-name",
                maxlength: "120",
                placeholder: (messages.value.workspacePlaceholder),
                required: true,
            });
            (__VLS_unwrap(workspaceName, {}));
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ class: "primary-button" },
                type: "submit",
                disabled: (submitting.value),
            });
            /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
            if (submitting.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
                    ...{ class: "button-loader" },
                    'aria-hidden': "true",
                });
                /** @type {__VLS_StyleScopedClasses['button-loader']} */ ;
            }
            (submitting.value ? messages.value.creating : messages.value.createWorkspace);
        }
        else if (activeSection.value === 'overview') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                ...{ class: "overview-section" },
            });
            /** @type {__VLS_StyleScopedClasses['overview-section']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "state-card" },
            });
            /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "eyebrow" },
            });
            /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
            (selectedWorkspace.value?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
            (user.value?.fullName || messages.value.operator);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            (messages.value.overviewDescription);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "overview-stats" },
            });
            /** @type {__VLS_StyleScopedClasses['overview-stats']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                ...{ class: "overview-stat" },
            });
            /** @type {__VLS_StyleScopedClasses['overview-stat']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (messages.value.projectCount);
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (projects.value.length);
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                ...{ class: "overview-stat" },
            });
            /** @type {__VLS_StyleScopedClasses['overview-stat']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (messages.value.workspaceRole);
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (selectedWorkspace.value?.role === 'owner' ? messages.value.roleOwner : selectedWorkspace.value?.role === 'admin' ? messages.value.roleAdmin : messages.value.roleMember);
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                ...{ class: "overview-stat" },
            });
            /** @type {__VLS_StyleScopedClasses['overview-stat']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (messages.value.workspaceCount);
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (workspaces.value.length);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "overview-actions" },
            });
            /** @type {__VLS_StyleScopedClasses['overview-actions']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!!(loading.value))
                            throw 0;
                        if (!!(dashboardLoadError.value))
                            throw 0;
                        if (!(!loading.value))
                            throw 0;
                        if (!!(workspaces.value.length === 0))
                            throw 0;
                        if (!(activeSection.value === 'overview'))
                            throw 0;
                        return (activeSection.value = 'projects');
                        // @ts-ignore
                        [messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, activeSection, activeSection, workspaces, workspaces, error, error, loading, loading, dashboardLoadError, dashboardLoadError, workspaceName, submitting, submitting, submitting, selectedWorkspace, selectedWorkspace, selectedWorkspace, user, projects,];
                    } },
                ...{ class: "primary-button" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
            (messages.value.openProjects);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!!(loading.value))
                            throw 0;
                        if (!!(dashboardLoadError.value))
                            throw 0;
                        if (!(!loading.value))
                            throw 0;
                        if (!!(workspaces.value.length === 0))
                            throw 0;
                        if (!(activeSection.value === 'overview'))
                            throw 0;
                        return (activeSection.value = 'architecture');
                        // @ts-ignore
                        [messages, activeSection,];
                    } },
                ...{ class: "secondary-button" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
            (messages.value.architecture);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!!(loading.value))
                            throw 0;
                        if (!!(dashboardLoadError.value))
                            throw 0;
                        if (!(!loading.value))
                            throw 0;
                        if (!!(workspaces.value.length === 0))
                            throw 0;
                        if (!(activeSection.value === 'overview'))
                            throw 0;
                        return (activeSection.value = 'team');
                        // @ts-ignore
                        [messages, activeSection,];
                    } },
                ...{ class: "secondary-button" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
            (messages.value.team);
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                ...{ class: "state-card recent-projects" },
                'aria-label': (messages.value.recentProjects),
            });
            /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
            /** @type {__VLS_StyleScopedClasses['recent-projects']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "section-heading" },
            });
            /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
            (messages.value.recentProjects);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!!(loading.value))
                            throw 0;
                        if (!!(dashboardLoadError.value))
                            throw 0;
                        if (!(!loading.value))
                            throw 0;
                        if (!!(workspaces.value.length === 0))
                            throw 0;
                        if (!(activeSection.value === 'overview'))
                            throw 0;
                        return (activeSection.value = 'projects');
                        // @ts-ignore
                        [messages, messages, messages, activeSection,];
                    } },
                ...{ class: "secondary-button" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
            (messages.value.openProjects);
            if (projectsError.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "feedback error" },
                    role: "alert",
                });
                /** @type {__VLS_StyleScopedClasses['feedback']} */ ;
                /** @type {__VLS_StyleScopedClasses['error']} */ ;
                (projectsError.value);
            }
            else if (projectsLoading.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    role: "status",
                });
                (messages.value.loadingWorkspaces);
            }
            else if (recentProjects.value.length === 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                (messages.value.noProjects);
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
                    ...{ class: "project-list" },
                });
                /** @type {__VLS_StyleScopedClasses['project-list']} */ ;
                const __VLS_13 = __VLS_tryAsConstant((recentProjects.value));
                for (const [project] of __VLS_vFor(__VLS_nonNull(__VLS_13))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                        key: (project.id),
                        ...{ class: "project-item" },
                    });
                    /** @type {__VLS_StyleScopedClasses['project-item']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "project-item-heading" },
                    });
                    /** @type {__VLS_StyleScopedClasses['project-item-heading']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
                    (project.name);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.time, __VLS_intrinsics.time)({
                        datetime: (project.updated_at),
                    });
                    (messages.value.lastUpdated);
                    (formatDate(project.updated_at));
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                    (project.description || messages.value.noDescription);
                    // @ts-ignore
                    [messages, messages, messages, messages, messages, projectsLoading, projectsError, projectsError, recentProjects, recentProjects,];
                }
            }
        }
        else if (activeSection.value === 'projects') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                ...{ class: "projects-section" },
            });
            /** @type {__VLS_StyleScopedClasses['projects-section']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "section-heading" },
            });
            /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "eyebrow" },
            });
            /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
            (messages.value.projects);
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
            (selectedWorkspace.value?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "project-search" },
            });
            /** @type {__VLS_StyleScopedClasses['project-search']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "sr-only" },
            });
            /** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
            (messages.value.searchProjects);
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "search",
                placeholder: (messages.value.searchProjects),
            });
            (__VLS_unwrap(projectSearch, {}));
            if (projectsError.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "state-card error-state" },
                    role: "alert",
                });
                /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
                /** @type {__VLS_StyleScopedClasses['error-state']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                (projectsError.value);
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (selectWorkspace) },
                    ...{ class: "primary-button" },
                    type: "button",
                });
                /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
                (messages.value.retry);
            }
            else if (projectsLoading.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "project-skeleton" },
                    role: "status",
                    'aria-label': (messages.value.loadingWorkspaces),
                });
                /** @type {__VLS_StyleScopedClasses['project-skeleton']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "sr-only" },
                });
                /** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
                (messages.value.loadingWorkspaces);
                const __VLS_14 = __VLS_tryAsConstant((2));
                for (const [item] of __VLS_vFor(__VLS_nonNull(__VLS_14))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                        key: (item),
                        ...{ class: "skeleton-card" },
                        'aria-hidden': "true",
                    });
                    /** @type {__VLS_StyleScopedClasses['skeleton-card']} */ ;
                    // @ts-ignore
                    [messages, messages, messages, messages, messages, messages, activeSection, projectsLoading, selectedWorkspace, projectsError, projectsError, projectSearch,];
                }
            }
            else if (projects.value.length === 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "state-card" },
                });
                /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
                (messages.value.noProjects);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                (messages.value.createProjectPrompt);
            }
            else if (filteredProjects.value.length === 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "state-card" },
                });
                /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                (messages.value.noMatchingProjects);
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
                    ...{ class: "project-list" },
                });
                /** @type {__VLS_StyleScopedClasses['project-list']} */ ;
                const __VLS_15 = __VLS_tryAsConstant((filteredProjects.value));
                for (const [project] of __VLS_vFor(__VLS_nonNull(__VLS_15))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                        key: (project.id),
                        ...{ class: "project-item" },
                    });
                    /** @type {__VLS_StyleScopedClasses['project-item']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "project-item-heading" },
                    });
                    /** @type {__VLS_StyleScopedClasses['project-item-heading']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
                    (project.name);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.time, __VLS_intrinsics.time)({
                        datetime: (project.updated_at),
                    });
                    (messages.value.lastUpdated);
                    (formatDate(project.updated_at));
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                    (project.description || messages.value.noDescription);
                    // @ts-ignore
                    [messages, messages, messages, messages, messages, projects, filteredProjects, filteredProjects,];
                }
            }
            if (selectedWorkspace.value?.role === 'owner' || selectedWorkspace.value?.role === 'admin') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
                    ...{ onSubmit: (handleCreateProject) },
                    ...{ class: "project-form" },
                });
                /** @type {__VLS_StyleScopedClasses['project-form']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
                (messages.value.createProject);
                __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
                (messages.value.projectName);
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    maxlength: "120",
                    required: true,
                });
                (__VLS_unwrap(projectName, {}));
                __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
                (messages.value.description);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "optional-label" },
                });
                /** @type {__VLS_StyleScopedClasses['optional-label']} */ ;
                (messages.value.optional);
                __VLS_asFunctionalElement1(__VLS_intrinsics.textarea)({
                    value: (__VLS_unwrap(projectDescription, {})),
                    maxlength: "2000",
                    rows: "3",
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ class: "primary-button" },
                    type: "submit",
                    disabled: (submitting.value),
                });
                /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
                if (submitting.value) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
                        ...{ class: "button-loader" },
                        'aria-hidden': "true",
                    });
                    /** @type {__VLS_StyleScopedClasses['button-loader']} */ ;
                }
                (submitting.value ? messages.value.creating : messages.value.createProject);
            }
        }
        else if (activeSection.value === 'architecture') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                ...{ class: "feature-state" },
            });
            /** @type {__VLS_StyleScopedClasses['feature-state']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "eyebrow" },
            });
            /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
            (selectedWorkspace.value?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            (messages.value.architectureDescription);
            const __VLS_16 = SyntheticArchitectureDemo;
            // @ts-ignore
            const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
                // @ts-ignore
                messages: (messages.value),
            }));
            const __VLS_18 = __VLS_17({
                messages: (messages.value),
            }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                ...{ class: "team-section" },
            });
            /** @type {__VLS_StyleScopedClasses['team-section']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "eyebrow" },
            });
            /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
            (selectedWorkspace.value?.name);
            if (selectedWorkspace.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "role-summary" },
                });
                /** @type {__VLS_StyleScopedClasses['role-summary']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                (messages.value.workspaceRole);
                (selectedWorkspace.value.role === 'owner' ? messages.value.roleOwner : selectedWorkspace.value.role === 'admin' ? messages.value.roleAdmin : messages.value.roleMember);
            }
            if (teamError.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "state-card error-state" },
                    role: "alert",
                });
                /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
                /** @type {__VLS_StyleScopedClasses['error-state']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                (teamError.value);
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (loadTeam) },
                    ...{ class: "primary-button" },
                    type: "button",
                });
                /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
                (messages.value.retry);
            }
            else if (teamLoading.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "state-card" },
                    role: "status",
                });
                /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
                (messages.value.loadingWorkspaces);
            }
            else if (!teamError.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                    ...{ class: "team-panel" },
                });
                /** @type {__VLS_StyleScopedClasses['team-panel']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
                (messages.value.teamMembers);
                if (teamMembers.value.length === 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                    (messages.value.noTeamMembers);
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
                        ...{ class: "team-list" },
                    });
                    /** @type {__VLS_StyleScopedClasses['team-list']} */ ;
                    const __VLS_21 = __VLS_tryAsConstant((teamMembers.value));
                    for (const [member] of __VLS_vFor(__VLS_nonNull(__VLS_21))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                            key: (member.id),
                            ...{ class: "team-item" },
                        });
                        /** @type {__VLS_StyleScopedClasses['team-item']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                        (member.full_name);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                        (member.email);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "member-role" },
                        });
                        /** @type {__VLS_StyleScopedClasses['member-role']} */ ;
                        (member.role === 'owner' ? messages.value.roleOwner : member.role === 'admin' ? messages.value.roleAdmin : messages.value.roleMember);
                        // @ts-ignore
                        [messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, messages, activeSection, submitting, submitting, submitting, selectedWorkspace, selectedWorkspace, selectedWorkspace, selectedWorkspace, selectedWorkspace, selectedWorkspace, selectedWorkspace, projectName, projectDescription, teamError, teamError, teamError, teamLoading, teamMembers, teamMembers,];
                    }
                }
                if (selectedWorkspace.value?.role === 'owner' || selectedWorkspace.value?.role === 'admin') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
                        ...{ onSubmit: (handleInviteMember) },
                        ...{ class: "team-panel invite-form" },
                    });
                    /** @type {__VLS_StyleScopedClasses['team-panel']} */ ;
                    /** @type {__VLS_StyleScopedClasses['invite-form']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
                    (messages.value.sendInvitation);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
                    (messages.value.inviteEmailLabel);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                        type: "email",
                        maxlength: "254",
                        autocomplete: "email",
                        required: true,
                    });
                    (__VLS_unwrap(inviteEmail, {}));
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ class: "primary-button" },
                        type: "submit",
                        disabled: (teamSubmitting.value),
                    });
                    /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
                    if (teamSubmitting.value) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
                            ...{ class: "button-loader" },
                            'aria-hidden': "true",
                        });
                        /** @type {__VLS_StyleScopedClasses['button-loader']} */ ;
                    }
                    (messages.value.sendInvitation);
                }
                if (selectedWorkspace.value?.role === 'owner' || selectedWorkspace.value?.role === 'admin') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                        ...{ class: "team-panel" },
                    });
                    /** @type {__VLS_StyleScopedClasses['team-panel']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
                    (messages.value.pendingInvitations);
                    if (pendingInvitations.value.length === 0) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                        (messages.value.noPendingInvitations);
                    }
                    else {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
                            ...{ class: "team-list" },
                        });
                        /** @type {__VLS_StyleScopedClasses['team-list']} */ ;
                        const __VLS_22 = __VLS_tryAsConstant((pendingInvitations.value));
                        for (const [invitation] of __VLS_vFor(__VLS_nonNull(__VLS_22))) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                                key: (invitation.id),
                                ...{ class: "team-item" },
                            });
                            /** @type {__VLS_StyleScopedClasses['team-item']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                            (invitation.email);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                            (messages.value.invitedBy);
                            (invitation.inviter_name);
                            (messages.value.expiresAt);
                            (new Date(invitation.expires_at).toLocaleDateString(__VLS_unwrap(locale, {})));
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        void $event;
                                        if (!!(loading.value))
                                            throw 0;
                                        if (!!(dashboardLoadError.value))
                                            throw 0;
                                        if (!(!loading.value))
                                            throw 0;
                                        if (!!(workspaces.value.length === 0))
                                            throw 0;
                                        if (!!(activeSection.value === 'overview'))
                                            throw 0;
                                        if (!!(activeSection.value === 'projects'))
                                            throw 0;
                                        if (!!(activeSection.value === 'architecture'))
                                            throw 0;
                                        if (!!(teamError.value))
                                            throw 0;
                                        if (!!(teamLoading.value))
                                            throw 0;
                                        if (!(!teamError.value))
                                            throw 0;
                                        if (!(selectedWorkspace.value?.role === 'owner' || selectedWorkspace.value?.role === 'admin'))
                                            throw 0;
                                        if (!!(pendingInvitations.value.length === 0))
                                            throw 0;
                                        return (handleRevokeInvitation(invitation.id));
                                        // @ts-ignore
                                        [messages, messages, messages, messages, messages, messages, messages, selectedWorkspace, selectedWorkspace, selectedWorkspace, selectedWorkspace, inviteEmail, teamSubmitting, teamSubmitting, pendingInvitations, pendingInvitations, locale,];
                                    } },
                                ...{ class: "secondary-button" },
                                type: "button",
                            });
                            /** @type {__VLS_StyleScopedClasses['secondary-button']} */ ;
                            (messages.value.revokeInvitation);
                            // @ts-ignore
                            [messages,];
                        }
                    }
                }
            }
        }
    }
    // @ts-ignore
    [];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
