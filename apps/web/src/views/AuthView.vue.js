/// <reference types="../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthField from '../components/auth/AuthField.vue';
import AuthShell from '../components/auth/AuthShell.vue';
import Navbar from '../components/layout/Navbar.vue';
import { authCoreMessages } from '../services/auth-core-messages';
import { deleteAccount, loginUser, requestPasswordReset, resendVerificationCode, resetPassword, sendOtpCode, signupUser, verifyEmail, verifyOtp } from '../services/auth';
import { isSupportedWebLocale, localizedPath, readLocalePreference, resolvePreferredWebLocale } from '../services/locale';
const route = useRoute();
const router = useRouter();
const routeLocale = computed(() => {
    const locale = route.params.locale;
    if (typeof locale === 'string' && isSupportedWebLocale(locale))
        return locale;
    return resolvePreferredWebLocale(readLocalePreference(), navigator.languages);
});
const coreMessages = computed(() => authCoreMessages(routeLocale.value));
const accountType = ref((route.query.plan === 'enterprise') ? 'enterprise' : 'individual');
const fullName = ref('');
const email = ref('');
const company = ref('');
const password = ref('');
const confirmPassword = ref('');
const resetPasswordValue = ref('');
const confirmResetPassword = ref('');
const rememberMe = ref(true);
const acceptTerms = ref(true);
const verificationCode = ref('');
const otpCode = ref('');
const deletePassword = ref('');
const deleteConfirmed = ref(false);
const verificationSent = ref(false);
const isSubmitting = ref(false);
const formMessage = ref('');
const formError = ref('');
const activeView = computed(() => {
    const value = route.params.view;
    if (value === 'signup' || value === 'forgot-password' || value === 'reset-password' || value === 'verify-email' || value === 'otp' || value === 'delete-account') {
        return value;
    }
    return 'login';
});
const routeEmail = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''));
watch(() => route.query.plan, (plan) => {
    if (plan === 'enterprise') {
        accountType.value = 'enterprise';
        return;
    }
    accountType.value = 'individual';
}, { immediate: true });
watch(routeEmail, (value) => {
    if (value) {
        email.value = value;
    }
}, { immediate: true });
watch(() => route.params.view, () => {
    formMessage.value = '';
    formError.value = '';
    verificationSent.value = false;
}, { immediate: true });
watch(() => route.query.notice, (notice) => {
    if (typeof notice === 'string')
        formMessage.value = notice;
}, { immediate: true });
function setAccountType(type) {
    accountType.value = type;
    const query = {
        ...(type === 'enterprise' ? { plan: 'enterprise' } : {}),
        ...(typeof route.query.invitation === 'string' ? { invitation: route.query.invitation } : {})
    };
    router.replace({ path: localizedPath(routeLocale.value, `/auth/${activeView.value}`), query });
}
function setView(view) {
    const query = {
        ...(accountType.value === 'enterprise' ? { plan: 'enterprise' } : {}),
        ...(typeof route.query.invitation === 'string' ? { invitation: route.query.invitation } : {})
    };
    router.push({ path: localizedPath(routeLocale.value, `/auth/${view}`), query });
}
async function handleResendCode() {
    formError.value = '';
    formMessage.value = '';
    isSubmitting.value = true;
    try {
        const result = await resendVerificationCode(email.value);
        if (!result.success) {
            formError.value = result.message;
            return;
        }
        formMessage.value = result.message;
    }
    finally {
        isSubmitting.value = false;
    }
}
async function handleOtpFlow() {
    formError.value = '';
    formMessage.value = '';
    isSubmitting.value = true;
    try {
        const result = await sendOtpCode(email.value);
        if (!result.success) {
            formError.value = result.message;
            return;
        }
        formMessage.value = result.message;
        router.push({ path: localizedPath(routeLocale.value, '/auth/otp'), query: { email: email.value, plan: accountType.value === 'enterprise' ? 'enterprise' : undefined } });
    }
    finally {
        isSubmitting.value = false;
    }
}
async function handleSubmit() {
    formError.value = '';
    formMessage.value = '';
    isSubmitting.value = true;
    try {
        if (activeView.value === 'login') {
            const result = await loginUser({ email: email.value, password: password.value });
            if (!result.success) {
                formError.value = result.message;
                return;
            }
            formMessage.value = result.message;
            const invitation = typeof route.query.invitation === 'string' ? route.query.invitation : '';
            router.push({
                path: localizedPath(routeLocale.value, '/dashboard'),
                query: invitation ? { invitation } : {}
            });
            return;
        }
        if (activeView.value === 'signup') {
            if (!acceptTerms.value) {
                formError.value = coreMessages.value.acceptTermsError;
                return;
            }
            if (password.value !== confirmPassword.value) {
                formError.value = coreMessages.value.passwordsMismatch;
                return;
            }
            const result = await signupUser({
                fullName: fullName.value,
                email: email.value,
                company: company.value,
                accountType: accountType.value,
                password: password.value
            });
            if (!result.success) {
                formError.value = result.message;
                return;
            }
            formMessage.value = coreMessages.value.signupSuccess;
            router.push({
                path: localizedPath(routeLocale.value, '/auth/verify-email'),
                query: {
                    email: email.value,
                    plan: accountType.value === 'enterprise' ? 'enterprise' : undefined,
                    invitation: typeof route.query.invitation === 'string' ? route.query.invitation : undefined
                }
            });
            return;
        }
        if (activeView.value === 'forgot-password') {
            const result = await requestPasswordReset(email.value);
            if (!result.success) {
                formError.value = result.message;
                return;
            }
            verificationSent.value = true;
            formMessage.value = result.message;
            return;
        }
        if (activeView.value === 'reset-password') {
            if (resetPasswordValue.value !== confirmResetPassword.value) {
                formError.value = coreMessages.value.passwordsMismatch;
                return;
            }
            const token = typeof route.query.token === 'string' ? route.query.token : '';
            const result = await resetPassword(email.value, token, resetPasswordValue.value);
            if (!result.success) {
                formError.value = result.message;
                return;
            }
            formMessage.value = result.message;
            router.push({
                path: localizedPath(routeLocale.value, '/auth/login'),
                query: typeof route.query.invitation === 'string' ? { invitation: route.query.invitation } : {}
            });
            return;
        }
        if (activeView.value === 'verify-email') {
            const result = await verifyEmail(email.value, verificationCode.value);
            if (!result.success) {
                formError.value = result.message;
                return;
            }
            formMessage.value = result.message;
            router.push({
                path: localizedPath(routeLocale.value, '/auth/login'),
                query: typeof route.query.invitation === 'string'
                    ? { invitation: route.query.invitation }
                    : {}
            });
        }
        if (activeView.value === 'otp') {
            const result = await verifyOtp(email.value, otpCode.value);
            if (!result.success) {
                formError.value = result.message;
                return;
            }
            formMessage.value = result.message;
            router.push(localizedPath(routeLocale.value, '/dashboard'));
        }
        if (activeView.value === 'delete-account') {
            if (!deleteConfirmed.value) {
                formError.value = coreMessages.value.confirmDeleteWarning;
                return;
            }
            const result = await deleteAccount(email.value, deletePassword.value);
            if (!result.success) {
                formError.value = result.message;
                return;
            }
            formMessage.value = result.message;
            router.push(localizedPath(routeLocale.value, '/auth/login'));
        }
    }
    finally {
        isSubmitting.value = false;
    }
}
const activeTitle = computed(() => activeView.value === 'login'
    ? coreMessages.value.loginTitle
    : activeView.value === 'signup'
        ? coreMessages.value.signupTitle
        : activeView.value === 'forgot-password'
            ? coreMessages.value.forgotPasswordTitle
            : activeView.value === 'reset-password'
                ? coreMessages.value.resetPasswordTitle
                : activeView.value === 'verify-email'
                    ? coreMessages.value.verifyEmailTitle
                    : activeView.value === 'otp'
                        ? coreMessages.value.otpTitle
                        : coreMessages.value.deleteAccountTitle);
const activeSubtitle = computed(() => activeView.value === 'login'
    ? coreMessages.value.loginSubtitle
    : activeView.value === 'signup'
        ? coreMessages.value.signupSubtitle
        : activeView.value === 'forgot-password'
            ? coreMessages.value.forgotPasswordSubtitle
            : activeView.value === 'reset-password'
                ? coreMessages.value.resetPasswordSubtitle
                : activeView.value === 'verify-email'
                    ? coreMessages.value.verifyEmailSubtitle
                    : activeView.value === 'otp'
                        ? coreMessages.value.otpSubtitle
                        : coreMessages.value.deleteAccountSubtitle);
const activeEyebrow = computed(() => activeView.value === 'login'
    ? coreMessages.value.loginEyebrow
    : activeView.value === 'signup'
        ? coreMessages.value.signupEyebrow
        : activeView.value === 'forgot-password'
            ? coreMessages.value.secureRecovery
            : coreMessages.value.verifyIdentity);
const __VLS_ctx = {};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_withDotValue(coreMessages, {});
    __VLS_withDotValue(activeView, {});
    __VLS_withDotValue(accountType, {});
    __VLS_withDotValue(formError, {});
    __VLS_withDotValue(formMessage, {});
    __VLS_withDotValue(isSubmitting, {});
    __VLS_withDotValue(verificationSent, {});
    __VLS_withDotValue(email, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['mode-group']} */ ;
    /** @type {__VLS_StyleScopedClasses['account-type']} */ ;
    /** @type {__VLS_StyleScopedClasses['mode-group']} */ ;
    /** @type {__VLS_StyleScopedClasses['account-type']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    /** @type {__VLS_StyleScopedClasses['checkbox-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
    /** @type {__VLS_StyleScopedClasses['divider']} */ ;
    /** @type {__VLS_StyleScopedClasses['divider']} */ ;
    /** @type {__VLS_StyleScopedClasses['alert']} */ ;
    /** @type {__VLS_StyleScopedClasses['alert']} */ ;
    /** @type {__VLS_StyleScopedClasses['success-box']} */ ;
    /** @type {__VLS_StyleScopedClasses['success-box']} */ ;
    /** @type {__VLS_StyleScopedClasses['inline-actions']} */ ;
    /** @type {__VLS_StyleScopedClasses['mode-switcher']} */ ;
    /** @type {__VLS_StyleScopedClasses['mode-group']} */ ;
    /** @type {__VLS_StyleScopedClasses['account-type']} */ ;
    /** @type {__VLS_StyleScopedClasses['sso-button']} */ ;
    /** @type {__VLS_StyleScopedClasses['mode-group']} */ ;
    /** @type {__VLS_StyleScopedClasses['account-type']} */ ;
    const __VLS_0 = Navbar;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    // @ts-ignore
    }));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const __VLS_5 = AuthShell || AuthShell;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        // @ts-ignore
        accountType: (accountType.value), eyebrow: (__VLS_unwrap(activeEyebrow, {})), title: (__VLS_unwrap(activeTitle, {})), subtitle: (__VLS_unwrap(activeSubtitle, {})), promoMessages: (coreMessages.value),
    }));
    const __VLS_7 = __VLS_6({
        accountType: (accountType.value),
        eyebrow: (__VLS_unwrap(activeEyebrow, {})),
        title: (__VLS_unwrap(activeTitle, {})),
        subtitle: (__VLS_unwrap(activeSubtitle, {})),
        promoMessages: (coreMessages.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    var __VLS_8;
    const { default: __VLS_10 } = __VLS_nonNull(__VLS_8.slots);
    {
        const { top: __VLS_11 } = __VLS_nonNull(__VLS_8.slots);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mode-switcher" },
            'aria-label': (coreMessages.value.modeSelector),
        });
        /** @type {__VLS_StyleScopedClasses['mode-switcher']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mode-group" },
        });
        /** @type {__VLS_StyleScopedClasses['mode-group']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    return (setView('login'));
                    // @ts-ignore
                    [accountType, activeEyebrow, activeTitle, activeSubtitle, coreMessages, coreMessages,];
                } },
            ...{ class: ({ active: activeView.value === 'login' }) },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        (coreMessages.value.logIn);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    return (setView('signup'));
                    // @ts-ignore
                    [coreMessages, activeView,];
                } },
            ...{ class: ({ active: activeView.value === 'signup' }) },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        (coreMessages.value.signUp);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "account-type" },
            'aria-label': (coreMessages.value.accountTypeSelector),
        });
        /** @type {__VLS_StyleScopedClasses['account-type']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    return (setAccountType('individual'));
                    // @ts-ignore
                    [coreMessages, coreMessages, activeView,];
                } },
            ...{ class: ({ active: accountType.value === 'individual' }) },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        (coreMessages.value.individual);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    return (setAccountType('enterprise'));
                    // @ts-ignore
                    [accountType, coreMessages,];
                } },
            ...{ class: ({ active: accountType.value === 'enterprise' }) },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        (coreMessages.value.enterprise);
        // @ts-ignore
        [accountType, coreMessages,];
    }
    if (activeView.value === 'login') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (handleSubmit) },
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        if (formError.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert error" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['error']} */ ;
            (formError.value);
        }
        if (formMessage.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert success" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['success']} */ ;
            (formMessage.value);
        }
        const __VLS_12 = AuthField;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
            // @ts-ignore
            modelValue: (email.value), label: (coreMessages.value.workEmail), type: "email", placeholder: (coreMessages.value.workEmailPlaceholder), autocomplete: "email",
        }));
        const __VLS_14 = __VLS_13({
            modelValue: (email.value),
            label: (coreMessages.value.workEmail),
            type: "email",
            placeholder: (coreMessages.value.workEmailPlaceholder),
            autocomplete: "email",
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        const __VLS_17 = AuthField;
        // @ts-ignore
        const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({
            // @ts-ignore
            modelValue: (__VLS_unwrap(password, {})), label: (coreMessages.value.password), type: "password", placeholder: (coreMessages.value.enterPassword), autocomplete: "current-password", passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }));
        const __VLS_19 = __VLS_18({
            modelValue: (__VLS_unwrap(password, {})),
            label: (coreMessages.value.password),
            type: "password",
            placeholder: (coreMessages.value.enterPassword),
            autocomplete: "current-password",
            passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_18));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "row split" },
        });
        /** @type {__VLS_StyleScopedClasses['row']} */ ;
        /** @type {__VLS_StyleScopedClasses['split']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "checkbox-row" },
        });
        /** @type {__VLS_StyleScopedClasses['checkbox-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "checkbox",
        });
        (__VLS_unwrap(rememberMe, {}));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (coreMessages.value.rememberMe);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!(activeView.value === 'login'))
                        throw 0;
                    return (setView('forgot-password'));
                    // @ts-ignore
                    [coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, activeView, formError, formError, formMessage, formMessage, email, password, rememberMe,];
                } },
            ...{ class: "text-button" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['text-button']} */ ;
        (coreMessages.value.forgotPassword);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "primary-button" },
            type: "submit",
            disabled: (isSubmitting.value),
        });
        /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
        (isSubmitting.value ? coreMessages.value.signingIn : coreMessages.value.signInToDashboard);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "divider" },
        });
        /** @type {__VLS_StyleScopedClasses['divider']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (coreMessages.value.orContinueWith);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (handleOtpFlow) },
            type: "button",
            ...{ class: "text-button" },
        });
        /** @type {__VLS_StyleScopedClasses['text-button']} */ ;
        (coreMessages.value.emailCodeSignIn);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "helper-text" },
        });
        /** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
        (coreMessages.value.ssoUnavailable);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "meta-copy" },
        });
        /** @type {__VLS_StyleScopedClasses['meta-copy']} */ ;
        (coreMessages.value.teamAccessPrompt);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!(activeView.value === 'login'))
                        throw 0;
                    return (setView('signup'));
                    // @ts-ignore
                    [coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, isSubmitting, isSubmitting,];
                } },
            type: "button",
            ...{ class: "inline-link" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-link']} */ ;
        (coreMessages.value.createEnterpriseWorkspace);
    }
    else if (activeView.value === 'signup') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (handleSubmit) },
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        if (formError.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert error" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['error']} */ ;
            (formError.value);
        }
        if (formMessage.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert success" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['success']} */ ;
            (formMessage.value);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "row two-col" },
        });
        /** @type {__VLS_StyleScopedClasses['row']} */ ;
        /** @type {__VLS_StyleScopedClasses['two-col']} */ ;
        const __VLS_22 = AuthField;
        // @ts-ignore
        const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
            // @ts-ignore
            modelValue: (__VLS_unwrap(fullName, {})), label: (coreMessages.value.fullName), placeholder: (coreMessages.value.namePlaceholder),
        }));
        const __VLS_24 = __VLS_23({
            modelValue: (__VLS_unwrap(fullName, {})),
            label: (coreMessages.value.fullName),
            placeholder: (coreMessages.value.namePlaceholder),
        }, ...__VLS_functionalComponentArgsRest(__VLS_23));
        const __VLS_27 = AuthField;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
            // @ts-ignore
            modelValue: (__VLS_unwrap(company, {})), label: (coreMessages.value.company), placeholder: (coreMessages.value.companyPlaceholder),
        }));
        const __VLS_29 = __VLS_28({
            modelValue: (__VLS_unwrap(company, {})),
            label: (coreMessages.value.company),
            placeholder: (coreMessages.value.companyPlaceholder),
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        const __VLS_32 = AuthField;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
            // @ts-ignore
            modelValue: (email.value), label: (coreMessages.value.workEmail), type: "email", placeholder: (coreMessages.value.emailPlaceholder), autocomplete: "email",
        }));
        const __VLS_34 = __VLS_33({
            modelValue: (email.value),
            label: (coreMessages.value.workEmail),
            type: "email",
            placeholder: (coreMessages.value.emailPlaceholder),
            autocomplete: "email",
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "row two-col" },
        });
        /** @type {__VLS_StyleScopedClasses['row']} */ ;
        /** @type {__VLS_StyleScopedClasses['two-col']} */ ;
        const __VLS_37 = AuthField;
        // @ts-ignore
        const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
            // @ts-ignore
            modelValue: (__VLS_unwrap(password, {})), label: (coreMessages.value.password), type: "password", placeholder: (coreMessages.value.createPassword), autocomplete: "new-password", passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }));
        const __VLS_39 = __VLS_38({
            modelValue: (__VLS_unwrap(password, {})),
            label: (coreMessages.value.password),
            type: "password",
            placeholder: (coreMessages.value.createPassword),
            autocomplete: "new-password",
            passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_38));
        const __VLS_42 = AuthField;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
            // @ts-ignore
            modelValue: (__VLS_unwrap(confirmPassword, {})), label: (coreMessages.value.confirm), type: "password", placeholder: (coreMessages.value.repeatPassword), autocomplete: "new-password", passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }));
        const __VLS_44 = __VLS_43({
            modelValue: (__VLS_unwrap(confirmPassword, {})),
            label: (coreMessages.value.confirm),
            type: "password",
            placeholder: (coreMessages.value.repeatPassword),
            autocomplete: "new-password",
            passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "password-meta" },
        });
        /** @type {__VLS_StyleScopedClasses['password-meta']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (coreMessages.value.passwordRequirements);
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "checkbox-row full-width" },
        });
        /** @type {__VLS_StyleScopedClasses['checkbox-row']} */ ;
        /** @type {__VLS_StyleScopedClasses['full-width']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "checkbox",
        });
        (__VLS_unwrap(acceptTerms, {}));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (coreMessages.value.acceptTerms);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "primary-button" },
            type: "submit",
            disabled: (isSubmitting.value),
        });
        /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
        (isSubmitting.value ? coreMessages.value.creatingAccount : accountType.value === 'enterprise' ? coreMessages.value.createEnterpriseAccount : coreMessages.value.createPersonalAccount);
    }
    else if (activeView.value === 'forgot-password') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (handleSubmit) },
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        if (formError.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert error" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['error']} */ ;
            (formError.value);
        }
        if (formMessage.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert success" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['success']} */ ;
            (formMessage.value);
        }
        const __VLS_47 = AuthField;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent1(__VLS_47, new __VLS_47({
            // @ts-ignore
            modelValue: (email.value), label: (coreMessages.value.recoveryEmail), type: "email", placeholder: (coreMessages.value.workEmailPlaceholder), autocomplete: "email",
        }));
        const __VLS_49 = __VLS_48({
            modelValue: (email.value),
            label: (coreMessages.value.recoveryEmail),
            type: "email",
            placeholder: (coreMessages.value.workEmailPlaceholder),
            autocomplete: "email",
        }, ...__VLS_functionalComponentArgsRest(__VLS_48));
        if (!verificationSent.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "helper-text" },
            });
            /** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
            (coreMessages.value.recoveryInstructions);
        }
        if (verificationSent.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "success-box" },
            });
            /** @type {__VLS_StyleScopedClasses['success-box']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (coreMessages.value.resetLinkSent);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            (coreMessages.value.resetLinkInstructions);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "primary-button" },
            type: "submit",
            disabled: (isSubmitting.value),
        });
        /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
        (isSubmitting.value ? coreMessages.value.sending : verificationSent.value ? coreMessages.value.sendAgain : coreMessages.value.sendResetLink);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!!(activeView.value === 'login'))
                        throw 0;
                    if (!!(activeView.value === 'signup'))
                        throw 0;
                    if (!(activeView.value === 'forgot-password'))
                        throw 0;
                    return (setView('login'));
                    // @ts-ignore
                    [accountType, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, activeView, activeView, formError, formError, formError, formError, formMessage, formMessage, formMessage, formMessage, email, email, password, isSubmitting, isSubmitting, isSubmitting, isSubmitting, fullName, company, confirmPassword, acceptTerms, verificationSent, verificationSent, verificationSent,];
                } },
            ...{ class: "text-button back-link" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['text-button']} */ ;
        /** @type {__VLS_StyleScopedClasses['back-link']} */ ;
        (coreMessages.value.backToLogin);
    }
    else if (activeView.value === 'reset-password') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (handleSubmit) },
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        if (formError.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert error" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['error']} */ ;
            (formError.value);
        }
        if (formMessage.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert success" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['success']} */ ;
            (formMessage.value);
        }
        const __VLS_52 = AuthField;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent1(__VLS_52, new __VLS_52({
            // @ts-ignore
            modelValue: (__VLS_unwrap(resetPasswordValue, {})), label: (coreMessages.value.newPassword), type: "password", placeholder: (coreMessages.value.createPassword), autocomplete: "new-password", passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }));
        const __VLS_54 = __VLS_53({
            modelValue: (__VLS_unwrap(resetPasswordValue, {})),
            label: (coreMessages.value.newPassword),
            type: "password",
            placeholder: (coreMessages.value.createPassword),
            autocomplete: "new-password",
            passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        const __VLS_57 = AuthField;
        // @ts-ignore
        const __VLS_58 = __VLS_asFunctionalComponent1(__VLS_57, new __VLS_57({
            // @ts-ignore
            modelValue: (__VLS_unwrap(confirmResetPassword, {})), label: (coreMessages.value.confirmNewPassword), type: "password", placeholder: (coreMessages.value.repeatPassword), autocomplete: "new-password", passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }));
        const __VLS_59 = __VLS_58({
            modelValue: (__VLS_unwrap(confirmResetPassword, {})),
            label: (coreMessages.value.confirmNewPassword),
            type: "password",
            placeholder: (coreMessages.value.repeatPassword),
            autocomplete: "new-password",
            passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_58));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "password-meta" },
        });
        /** @type {__VLS_StyleScopedClasses['password-meta']} */ ;
        (coreMessages.value.passwordRequirements);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "primary-button" },
            type: "submit",
            disabled: (isSubmitting.value),
        });
        /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
        (isSubmitting.value ? coreMessages.value.updatingPassword : coreMessages.value.setNewPassword);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!!(activeView.value === 'login'))
                        throw 0;
                    if (!!(activeView.value === 'signup'))
                        throw 0;
                    if (!!(activeView.value === 'forgot-password'))
                        throw 0;
                    if (!(activeView.value === 'reset-password'))
                        throw 0;
                    return (setView('login'));
                    // @ts-ignore
                    [coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, activeView, formError, formError, formMessage, formMessage, isSubmitting, isSubmitting, resetPasswordValue, confirmResetPassword,];
                } },
            ...{ class: "text-button back-link" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['text-button']} */ ;
        /** @type {__VLS_StyleScopedClasses['back-link']} */ ;
        (coreMessages.value.backToLogin);
    }
    else if (activeView.value === 'verify-email') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (handleSubmit) },
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        if (formError.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert error" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['error']} */ ;
            (formError.value);
        }
        if (formMessage.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert success" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['success']} */ ;
            (formMessage.value);
        }
        const __VLS_62 = AuthField;
        // @ts-ignore
        const __VLS_63 = __VLS_asFunctionalComponent1(__VLS_62, new __VLS_62({
            // @ts-ignore
            modelValue: (__VLS_unwrap(verificationCode, {})), label: (coreMessages.value.verificationCode), placeholder: (coreMessages.value.enterSixDigitCode),
        }));
        const __VLS_64 = __VLS_63({
            modelValue: (__VLS_unwrap(verificationCode, {})),
            label: (coreMessages.value.verificationCode),
            placeholder: (coreMessages.value.enterSixDigitCode),
        }, ...__VLS_functionalComponentArgsRest(__VLS_63));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "helper-text" },
        });
        /** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
        (coreMessages.value.verificationSentTo);
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (email.value || coreMessages.value.yourInbox);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "primary-button" },
            type: "submit",
            disabled: (isSubmitting.value),
        });
        /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
        (isSubmitting.value ? coreMessages.value.verifying : coreMessages.value.verifyEmail);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "inline-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (handleResendCode) },
            ...{ class: "text-button" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['text-button']} */ ;
        (coreMessages.value.resendCode);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!!(activeView.value === 'login'))
                        throw 0;
                    if (!!(activeView.value === 'signup'))
                        throw 0;
                    if (!!(activeView.value === 'forgot-password'))
                        throw 0;
                    if (!!(activeView.value === 'reset-password'))
                        throw 0;
                    if (!(activeView.value === 'verify-email'))
                        throw 0;
                    return (setView('login'));
                    // @ts-ignore
                    [coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, activeView, formError, formError, formMessage, formMessage, email, isSubmitting, isSubmitting, verificationCode,];
                } },
            ...{ class: "text-button" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['text-button']} */ ;
        (coreMessages.value.useAnotherEmail);
    }
    else if (activeView.value === 'otp') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (handleSubmit) },
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        if (formError.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert error" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['error']} */ ;
            (formError.value);
        }
        if (formMessage.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert success" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['success']} */ ;
            (formMessage.value);
        }
        const __VLS_67 = AuthField;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
            // @ts-ignore
            modelValue: (email.value), label: (coreMessages.value.emailAddress), type: "email", placeholder: (coreMessages.value.workEmailPlaceholder), autocomplete: "email",
        }));
        const __VLS_69 = __VLS_68({
            modelValue: (email.value),
            label: (coreMessages.value.emailAddress),
            type: "email",
            placeholder: (coreMessages.value.workEmailPlaceholder),
            autocomplete: "email",
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        const __VLS_72 = AuthField;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
            // @ts-ignore
            modelValue: (__VLS_unwrap(otpCode, {})), label: (coreMessages.value.oneTimePassword), placeholder: (coreMessages.value.enterSixDigitOtp),
        }));
        const __VLS_74 = __VLS_73({
            modelValue: (__VLS_unwrap(otpCode, {})),
            label: (coreMessages.value.oneTimePassword),
            placeholder: (coreMessages.value.enterSixDigitOtp),
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "primary-button" },
            type: "submit",
            disabled: (isSubmitting.value),
        });
        /** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
        (isSubmitting.value ? coreMessages.value.checkingOtp : coreMessages.value.verifyOtp);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "inline-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (handleOtpFlow) },
            ...{ class: "text-button" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['text-button']} */ ;
        (coreMessages.value.sendNewOtp);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!!(activeView.value === 'login'))
                        throw 0;
                    if (!!(activeView.value === 'signup'))
                        throw 0;
                    if (!!(activeView.value === 'forgot-password'))
                        throw 0;
                    if (!!(activeView.value === 'reset-password'))
                        throw 0;
                    if (!!(activeView.value === 'verify-email'))
                        throw 0;
                    if (!(activeView.value === 'otp'))
                        throw 0;
                    return (setView('login'));
                    // @ts-ignore
                    [coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, activeView, formError, formError, formMessage, formMessage, email, isSubmitting, isSubmitting, otpCode,];
                } },
            ...{ class: "text-button" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['text-button']} */ ;
        (coreMessages.value.backToLogin);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (handleSubmit) },
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        if (formError.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert error" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['error']} */ ;
            (formError.value);
        }
        if (formMessage.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert success" },
            });
            /** @type {__VLS_StyleScopedClasses['alert']} */ ;
            /** @type {__VLS_StyleScopedClasses['success']} */ ;
            (formMessage.value);
        }
        const __VLS_77 = AuthField;
        // @ts-ignore
        const __VLS_78 = __VLS_asFunctionalComponent1(__VLS_77, new __VLS_77({
            // @ts-ignore
            modelValue: (email.value), label: (coreMessages.value.accountEmail), type: "email", placeholder: (coreMessages.value.workEmailPlaceholder), autocomplete: "email",
        }));
        const __VLS_79 = __VLS_78({
            modelValue: (email.value),
            label: (coreMessages.value.accountEmail),
            type: "email",
            placeholder: (coreMessages.value.workEmailPlaceholder),
            autocomplete: "email",
        }, ...__VLS_functionalComponentArgsRest(__VLS_78));
        const __VLS_82 = AuthField;
        // @ts-ignore
        const __VLS_83 = __VLS_asFunctionalComponent1(__VLS_82, new __VLS_82({
            // @ts-ignore
            modelValue: (__VLS_unwrap(deletePassword, {})), label: (coreMessages.value.confirmPassword), type: "password", placeholder: (coreMessages.value.enterPassword), autocomplete: "current-password", passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }));
        const __VLS_84 = __VLS_83({
            modelValue: (__VLS_unwrap(deletePassword, {})),
            label: (coreMessages.value.confirmPassword),
            type: "password",
            placeholder: (coreMessages.value.enterPassword),
            autocomplete: "current-password",
            passwordVisibilityLabels: ({ show: coreMessages.value.showPassword, hide: coreMessages.value.hidePassword }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_83));
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "checkbox-row full-width warning-row" },
        });
        /** @type {__VLS_StyleScopedClasses['checkbox-row']} */ ;
        /** @type {__VLS_StyleScopedClasses['full-width']} */ ;
        /** @type {__VLS_StyleScopedClasses['warning-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "checkbox",
        });
        (__VLS_unwrap(deleteConfirmed, {}));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (coreMessages.value.confirmDeleteWarning);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "danger-button" },
            type: "submit",
            disabled: (isSubmitting.value),
        });
        /** @type {__VLS_StyleScopedClasses['danger-button']} */ ;
        (isSubmitting.value ? coreMessages.value.deletingAccount : coreMessages.value.deleteMyAccount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!!(activeView.value === 'login'))
                        throw 0;
                    if (!!(activeView.value === 'signup'))
                        throw 0;
                    if (!!(activeView.value === 'forgot-password'))
                        throw 0;
                    if (!!(activeView.value === 'reset-password'))
                        throw 0;
                    if (!!(activeView.value === 'verify-email'))
                        throw 0;
                    if (!!(activeView.value === 'otp'))
                        throw 0;
                    return (setView('login'));
                    // @ts-ignore
                    [coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, coreMessages, formError, formError, formMessage, formMessage, email, isSubmitting, isSubmitting, deletePassword, deleteConfirmed,];
                } },
            ...{ class: "text-button back-link" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['text-button']} */ ;
        /** @type {__VLS_StyleScopedClasses['back-link']} */ ;
        (coreMessages.value.keepMyAccount);
    }
    // @ts-ignore
    [coreMessages,];
    // @ts-ignore
    [];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
