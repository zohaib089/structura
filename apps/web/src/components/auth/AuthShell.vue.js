/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { BrainCircuit, GitBranch, ShieldCheck, Sparkles } from '@lucide/vue';
const { defineProps, } = {};
const __VLS_props = defineProps({
    accountType: {
        type: String,
        default: 'individual'
    },
    eyebrow: {
        type: String,
        default: 'Access your workspace'
    },
    title: {
        type: String,
        default: 'Welcome back'
    },
    subtitle: {
        type: String,
        default: ''
    },
    promoMessages: {
        type: Object,
        default: () => ({
            individualAccess: 'Individual access',
            enterpriseAccess: 'Enterprise access',
            promoTitle: 'Ship faster with architecture clarity.',
            promoDescription: 'Map dependencies, understand system impact, and give every teammate shared context before they touch production.',
            mapFeatureTitle: 'Real-time system maps',
            mapFeatureDescription: 'Live dependency understanding for even the most complex stacks.',
            onboardingFeatureTitle: 'Secure team onboarding',
            onboardingFeatureDescription: 'Verification and sign-in codes delivered securely to your inbox.',
            contextFeatureTitle: 'AI-powered context',
            contextFeatureDescription: 'Ask questions and get answers grounded in your codebase.'
        })
    }
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    void {};
    /** @type {__VLS_StyleScopedClasses['auth-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['auth-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['promo-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['promo-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['promo-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['form-topline']} */ ;
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    /** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
    /** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
    /** @type {__VLS_StyleScopedClasses['auth-shell']} */ ;
    /** @type {__VLS_StyleScopedClasses['promo-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['auth-shell']} */ ;
    /** @type {__VLS_StyleScopedClasses['promo-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['auth-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['auth-shell']} */ ;
    /** @type {__VLS_StyleScopedClasses['promo-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['promo-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['auth-shell']} */ ;
    /** @type {__VLS_StyleScopedClasses['promo-mark']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "auth-page" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-page']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "auth-shell" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-shell']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "promo-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['promo-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "promo-mark" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['promo-mark']} */ ;
    let __VLS_0;
    /** @ts-ignore @type { | typeof GitBranch} */
    GitBranch;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        // @ts-ignore
        size: (22), strokeWidth: (1.8),
    }));
    const __VLS_2 = __VLS_1({
        size: (22),
        strokeWidth: (1.8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "promo-badge" },
    });
    /** @type {__VLS_StyleScopedClasses['promo-badge']} */ ;
    let __VLS_5;
    /** @ts-ignore @type { | typeof Sparkles} */
    Sparkles;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        // @ts-ignore
        size: (14),
    }));
    const __VLS_7 = __VLS_6({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    (__VLS_ctx.accountType === 'enterprise' ? __VLS_ctx.promoMessages.enterpriseAccess : __VLS_ctx.promoMessages.individualAccess);
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    (__VLS_ctx.promoMessages.promoTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.promoMessages.promoDescription);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "feature-list" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-list']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "feature-item" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "feature-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-icon']} */ ;
    let __VLS_10;
    /** @ts-ignore @type { | typeof GitBranch} */
    GitBranch;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        // @ts-ignore
        size: (18),
    }));
    const __VLS_12 = __VLS_11({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.promoMessages.mapFeatureTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.promoMessages.mapFeatureDescription);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "feature-item" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "feature-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-icon']} */ ;
    let __VLS_15;
    /** @ts-ignore @type { | typeof ShieldCheck} */
    ShieldCheck;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
        // @ts-ignore
        size: (18),
    }));
    const __VLS_17 = __VLS_16({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.promoMessages.onboardingFeatureTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.promoMessages.onboardingFeatureDescription);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "feature-item" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "feature-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-icon']} */ ;
    let __VLS_20;
    /** @ts-ignore @type { | typeof BrainCircuit} */
    BrainCircuit;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
        // @ts-ignore
        size: (18),
    }));
    const __VLS_22 = __VLS_21({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.promoMessages.contextFeatureTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.promoMessages.contextFeatureDescription);
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "form-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "form-topline" },
    });
    /** @type {__VLS_StyleScopedClasses['form-topline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    let __VLS_25;
    /** @ts-ignore @type { | typeof Sparkles} */
    Sparkles;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
        // @ts-ignore
        size: (14),
    }));
    const __VLS_27 = __VLS_26({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    (__VLS_ctx.eyebrow);
    var __VLS_30 = {};
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-header" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    (__VLS_ctx.title);
    if (__VLS_ctx.subtitle) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.subtitle);
    }
    var __VLS_32 = {};
    var __VLS_31 = __VLS_30, __VLS_33 = __VLS_32;
    // @ts-ignore
    [accountType, promoMessages, promoMessages, promoMessages, promoMessages, promoMessages, promoMessages, promoMessages, promoMessages, promoMessages, promoMessages, eyebrow, title, subtitle, subtitle,];
    return {
        __VLS_Slots: {},
    };
};
void [__VLS_template, {}];
const __VLS_base = (await import('vue')).defineComponent({
    props: {
        accountType: {
            type: String,
            default: 'individual'
        },
        eyebrow: {
            type: String,
            default: 'Access your workspace'
        },
        title: {
            type: String,
            default: 'Welcome back'
        },
        subtitle: {
            type: String,
            default: ''
        },
        promoMessages: {
            type: Object,
            default: () => ({
                individualAccess: 'Individual access',
                enterpriseAccess: 'Enterprise access',
                promoTitle: 'Ship faster with architecture clarity.',
                promoDescription: 'Map dependencies, understand system impact, and give every teammate shared context before they touch production.',
                mapFeatureTitle: 'Real-time system maps',
                mapFeatureDescription: 'Live dependency understanding for even the most complex stacks.',
                onboardingFeatureTitle: 'Secure team onboarding',
                onboardingFeatureDescription: 'Verification and sign-in codes delivered securely to your inbox.',
                contextFeatureTitle: 'AI-powered context',
                contextFeatureDescription: 'Ask questions and get answers grounded in your codebase.'
            })
        }
    },
});
const __VLS_export = {};
export default {};
