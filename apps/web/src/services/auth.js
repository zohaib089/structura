import { BRAND, readMigrated, storageKey } from '../../../../packages/brand/src/brand';
const SESSION_SUFFIX = 'auth-session-v2';
const SESSION_KEY = storageKey(SESSION_SUFFIX);
for (const suffix of ['auth-session', 'auth-users', 'auth-verification', 'auth-reset']) {
    localStorage.removeItem(`${BRAND.legacySlug}-${suffix}`);
}
function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(`${BRAND.legacySlug}-${SESSION_SUFFIX}`);
}
async function request(path, payload) {
    try {
        const response = await fetch(`/api/auth/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
            return { success: false, message: result.message ?? 'Authentication request failed.' };
        }
        return result;
    }
    catch {
        return { success: false, message: 'Unable to reach the authentication service. Please try again.' };
    }
}
function saveSession(result) {
    if (!result.user || !result.token || !result.expiresAt)
        return;
    const session = {
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export async function signupUser(payload) {
    return request('signup', payload);
}
export async function loginUser(payload) {
    const result = await request('login', payload);
    saveSession(result);
    return result;
}
export async function requestPasswordReset(email) {
    return request('forgot-password', { email });
}
export async function resetPassword(email, token, password) {
    return request('reset-password', { email, token, password });
}
export async function verifyEmail(email, code) {
    return request('verify-email', { email, code });
}
export async function resendVerificationCode(email) {
    return request('resend-verification', { email });
}
export async function sendOtpCode(email) {
    return request('otp/send', { email });
}
export async function verifyOtp(email, code) {
    const result = await request('otp/verify', { email, code });
    saveSession(result);
    return result;
}
export async function deleteAccount(email, password) {
    const result = await request('delete-account', { email, password });
    if (result.success)
        clearSession();
    return result;
}
export function getCurrentSession() {
    const raw = readMigrated(SESSION_SUFFIX);
    if (!raw)
        return null;
    try {
        const session = JSON.parse(raw);
        if (Date.parse(session.expiresAt) <= Date.now()) {
            clearSession();
            return null;
        }
        return session;
    }
    catch {
        clearSession();
        return null;
    }
}
export async function logoutUser() {
    const session = getCurrentSession();
    if (!session)
        return { success: true, message: 'Signed out successfully.' };
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.token}` }
        });
        const result = await response.json();
        clearSession();
        return response.ok
            ? result
            : { success: false, message: result.message ?? 'The session could not be revoked.' };
    }
    catch {
        clearSession();
        return { success: false, message: 'Signed out locally, but the server could not be reached to revoke the session.' };
    }
}
