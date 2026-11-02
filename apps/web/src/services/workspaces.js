import { getCurrentSession } from './auth';
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function isTimestamp(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function parseWorkspace(value) {
    if (!isRecord(value) ||
        !isNonEmptyString(value.id) ||
        value.id.trim() !== value.id ||
        !isNonEmptyString(value.name) ||
        value.name.trim() !== value.name ||
        value.name.length > 120 ||
        (value.role !== 'owner' && value.role !== 'admin' && value.role !== 'member') ||
        !isTimestamp(value.created_at) ||
        !isTimestamp(value.updated_at)) {
        throw new Error('The workspace response was invalid.');
    }
    return {
        id: value.id,
        name: value.name,
        role: value.role,
        created_at: value.created_at,
        updated_at: value.updated_at
    };
}
function parseProject(value) {
    if (!isRecord(value) ||
        !isNonEmptyString(value.id) ||
        value.id.trim() !== value.id ||
        !isNonEmptyString(value.name) ||
        value.name.trim() !== value.name ||
        value.name.length > 120 ||
        typeof value.description !== 'string' ||
        value.description.length > 2000 ||
        !isTimestamp(value.created_at) ||
        !isTimestamp(value.updated_at)) {
        throw new Error('The project response was invalid.');
    }
    return {
        id: value.id,
        name: value.name,
        description: value.description,
        created_at: value.created_at,
        updated_at: value.updated_at
    };
}
function parseWorkspaceMember(value) {
    if (!isRecord(value) ||
        !isNonEmptyString(value.id) ||
        !isNonEmptyString(value.full_name) ||
        !isNonEmptyString(value.email) ||
        (value.role !== 'owner' && value.role !== 'admin' && value.role !== 'member') ||
        !isTimestamp(value.created_at)) {
        throw new Error('The workspace member response was invalid.');
    }
    return {
        id: value.id,
        full_name: value.full_name,
        email: value.email,
        role: value.role,
        created_at: value.created_at
    };
}
function parseInvitation(value) {
    if (!isRecord(value) ||
        !isNonEmptyString(value.id) ||
        !isNonEmptyString(value.email) ||
        value.role !== 'member' ||
        !isTimestamp(value.created_at) ||
        !isTimestamp(value.expires_at) ||
        !isNonEmptyString(value.inviter_name)) {
        throw new Error('The workspace invitation response was invalid.');
    }
    return {
        id: value.id,
        email: value.email,
        role: value.role,
        created_at: value.created_at,
        expires_at: value.expires_at,
        inviter_name: value.inviter_name
    };
}
async function request(path, method = 'GET', payload) {
    const session = getCurrentSession();
    if (!session)
        throw new Error('Your session has expired. Please sign in again.');
    const response = await fetch(`/api${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${session.token}`,
            ...(payload ? { 'Content-Type': 'application/json' } : {})
        },
        ...(payload ? { body: JSON.stringify(payload) } : {})
    });
    let result;
    try {
        result = await response.json();
    }
    catch (cause) {
        if (cause instanceof SyntaxError) {
            throw new Error(`The API returned invalid JSON (HTTP ${response.status}).`);
        }
        throw cause;
    }
    if (!isRecord(result)) {
        throw new Error(`The API response was invalid (HTTP ${response.status}).`);
    }
    if (!response.ok || result.success !== true) {
        const message = typeof result.message === 'string' ? result.message : null;
        throw new Error(message ?? `Request failed with status ${response.status}.`);
    }
    return result;
}
function parseUniqueRecords(records, parse, getId, label) {
    const parsed = records.map(parse);
    const ids = new Set();
    for (const record of parsed) {
        const id = getId(record);
        if (ids.has(id))
            throw new Error(`The ${label} response contained duplicate records.`);
        ids.add(id);
    }
    return parsed;
}
export async function listWorkspaces() {
    const result = await request('/workspaces');
    if (!Array.isArray(result.workspaces))
        throw new Error('The workspace response was invalid.');
    return parseUniqueRecords(result.workspaces, parseWorkspace, workspace => workspace.id, 'workspace');
}
export async function createWorkspace(name) {
    const result = await request('/workspaces', 'POST', { name });
    return parseWorkspace(result.workspace);
}
export async function listProjects(workspaceId) {
    const result = await request(`/workspaces/${encodeURIComponent(workspaceId)}/projects`);
    if (!Array.isArray(result.projects))
        throw new Error('The project response was invalid.');
    return parseUniqueRecords(result.projects, parseProject, project => project.id, 'project');
}
export async function createProject(workspaceId, name, description) {
    const result = await request(`/workspaces/${encodeURIComponent(workspaceId)}/projects`, 'POST', { name, description });
    return parseProject(result.project);
}
export async function listWorkspaceMembers(workspaceId) {
    const result = await request(`/workspaces/${encodeURIComponent(workspaceId)}/members`);
    if (!Array.isArray(result.members))
        throw new Error('The workspace member response was invalid.');
    return parseUniqueRecords(result.members, parseWorkspaceMember, member => member.id, 'workspace member');
}
export async function listWorkspaceInvitations(workspaceId) {
    const result = await request(`/workspaces/${encodeURIComponent(workspaceId)}/invitations`);
    if (!Array.isArray(result.invitations))
        throw new Error('The workspace invitation response was invalid.');
    return parseUniqueRecords(result.invitations, parseInvitation, invitation => invitation.id, 'workspace invitation');
}
export async function inviteWorkspaceMember(workspaceId, email) {
    const result = await request(`/workspaces/${encodeURIComponent(workspaceId)}/invitations`, 'POST', { email });
    return parseInvitation(result.invitation);
}
export async function revokeWorkspaceInvitation(workspaceId, invitationId) {
    await request(`/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitationId)}`, 'DELETE');
}
export async function acceptWorkspaceInvitation(token) {
    const result = await request('/workspace-invitations/accept', 'POST', { token });
    if (!isNonEmptyString(result.workspaceId)) {
        throw new Error('The workspace invitation acceptance response was invalid.');
    }
    return { workspaceId: result.workspaceId };
}
