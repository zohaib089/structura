/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { Moon, Sun } from '@lucide/vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useThemeStore } from '../../stores/theme';
import LocaleSwitcher from './LocaleSwitcher.vue';
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale';
import { navigationMessages } from '../../services/navigation-messages';
import { getCurrentSession, logoutUser } from '../../services/auth';
const route = useRoute();
const router = useRouter();
const themeStore = useThemeStore();
const locale = computed(() => {
    const routeLocale = route.params.locale;
    if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale))
        return routeLocale;
    return resolvePreferredWebLocale(readLocalePreference(), navigator.languages);
});
const messages = computed(() => navigationMessages(locale.value));
const showLandingLinks = computed(() => route.name === 'home' || route.name === 'localized-home');
const isAuthenticated = computed(() => Boolean(route.fullPath) && getCurrentSession() !== null);
async function handleLogout() {
    const result = await logoutUser();
    await router.push({
        path: `/${locale.value}/auth/login`,
        query: result.success ? {} : { notice: result.message }
    });
}
const __VLS_ctx = {};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_withDotValue(messages, {});
    __VLS_withDotValue(showLandingLinks, {});
    __VLS_withDotValue(themeStore, {});
    __VLS_withDotValue(isAuthenticated, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['logo-mark']} */ ;
    /** @type {__VLS_StyleScopedClasses['nav-links']} */ ;
    /** @type {__VLS_StyleScopedClasses['nav-links']} */ ;
    /** @type {__VLS_StyleScopedClasses['theme-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-login']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-signup']} */ ;
    /** @type {__VLS_StyleScopedClasses['container']} */ ;
    /** @type {__VLS_StyleScopedClasses['nav-links']} */ ;
    /** @type {__VLS_StyleScopedClasses['nav-links']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-login']} */ ;
    /** @type {__VLS_StyleScopedClasses['theme-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-login']} */ ;
    /** @type {__VLS_StyleScopedClasses['logo-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['logo-mark']} */ ;
    /** @type {__VLS_StyleScopedClasses['logo-mark']} */ ;
    /** @type {__VLS_StyleScopedClasses['nav-links']} */ ;
    /** @type {__VLS_StyleScopedClasses['navbar']} */ ;
    /** @type {__VLS_StyleScopedClasses['container']} */ ;
    /** @type {__VLS_StyleScopedClasses['logo-text']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-login']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-side']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-signup']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "navbar" },
    });
    /** @type {__VLS_StyleScopedClasses['navbar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "container" },
    });
    /** @type {__VLS_StyleScopedClasses['container']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "logo-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['logo-wrap']} */ ;
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        // @ts-ignore
        to: (`/${__VLS_unwrap(locale, {})}`), ...{ class: "logo" }, 'aria-label': (messages.value.home),
    }));
    const __VLS_2 = __VLS_1({
        to: (`/${__VLS_unwrap(locale, {})}`),
        ...{ class: "logo" },
        'aria-label': (messages.value.home),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['logo']} */ ;
    var __VLS_3;
    const { default: __VLS_5 } = __VLS_nonNull(__VLS_3.slots);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "logo-icon" },
        'aria-label': "Structura logo",
    });
    /** @type {__VLS_StyleScopedClasses['logo-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "logo-mark" },
    });
    /** @type {__VLS_StyleScopedClasses['logo-mark']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "logo-text" },
    });
    /** @type {__VLS_StyleScopedClasses['logo-text']} */ ;
    // @ts-ignore
    [locale, messages,];
    if (showLandingLinks.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
            ...{ class: "nav-links" },
            'aria-label': (messages.value.mainNavigation),
        });
        /** @type {__VLS_StyleScopedClasses['nav-links']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: "#what",
        });
        (messages.value.whatIsIt);
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: "#how",
        });
        (messages.value.howItWorks);
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: "#services",
        });
        (messages.value.services);
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: "#reviews",
        });
        (messages.value.reviews);
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: "#contact",
        });
        (messages.value.contact);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "right-side" },
    });
    /** @type {__VLS_StyleScopedClasses['right-side']} */ ;
    const __VLS_6 = LocaleSwitcher;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    // @ts-ignore
    }));
    const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (themeStore.value.toggleTheme) },
        ...{ class: "theme-btn" },
        'aria-label': (messages.value.toggleTheme),
    });
    /** @type {__VLS_StyleScopedClasses['theme-btn']} */ ;
    if (themeStore.value.theme === 'dark') {
        let __VLS_11;
        /** @ts-ignore @type { | typeof Sun} */
        Sun;
        // @ts-ignore
        const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
            // @ts-ignore
            size: (18),
        }));
        const __VLS_13 = __VLS_12({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    }
    else {
        let __VLS_16;
        /** @ts-ignore @type { | typeof Moon} */
        Moon;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
            // @ts-ignore
            size: (18),
        }));
        const __VLS_18 = __VLS_17({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    }
    if (isAuthenticated.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (handleLogout) },
            type: "button",
            ...{ class: "btn-signup" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-signup']} */ ;
        (messages.value.logOut);
    }
    else {
        let __VLS_21;
        /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            // @ts-ignore
            to: (`/${__VLS_unwrap(locale, {})}/auth/login`), ...{ class: "btn-login" },
        }));
        const __VLS_23 = __VLS_22({
            to: (`/${__VLS_unwrap(locale, {})}/auth/login`),
            ...{ class: "btn-login" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        /** @type {__VLS_StyleScopedClasses['btn-login']} */ ;
        var __VLS_24;
        const { default: __VLS_26 } = __VLS_nonNull(__VLS_24.slots);
        (messages.value.logIn);
        // @ts-ignore
        [locale, messages, messages, messages, messages, messages, messages, messages, messages, messages, showLandingLinks, themeStore, themeStore, isAuthenticated,];
        let __VLS_27;
        /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
            // @ts-ignore
            to: (`/${__VLS_unwrap(locale, {})}/auth/signup?plan=enterprise`), ...{ class: "btn-signup" },
        }));
        const __VLS_29 = __VLS_28({
            to: (`/${__VLS_unwrap(locale, {})}/auth/signup?plan=enterprise`),
            ...{ class: "btn-signup" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        /** @type {__VLS_StyleScopedClasses['btn-signup']} */ ;
        var __VLS_30;
        const { default: __VLS_32 } = __VLS_nonNull(__VLS_30.slots);
        (messages.value.launchApp);
        // @ts-ignore
        [locale, messages,];
    }
    // @ts-ignore
    [];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
