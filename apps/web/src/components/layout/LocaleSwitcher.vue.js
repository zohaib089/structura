/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { WEB_LOCALES, isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale';
import { navigationMessages } from '../../services/navigation-messages';
const route = useRoute();
const router = useRouter();
const locale = computed(() => {
    const routeLocale = route.params.locale;
    if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale))
        return routeLocale;
    return resolvePreferredWebLocale(readLocalePreference(), navigator.languages);
});
const messages = computed(() => navigationMessages(locale.value));
async function changeLocale(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !isSupportedWebLocale(target.value))
        return;
    const currentLocale = route.params.locale;
    const suffix = typeof currentLocale === 'string' && isSupportedWebLocale(currentLocale)
        ? route.path.slice(currentLocale.length + 1)
        : route.path === '/' ? '' : route.path;
    await router.push({
        path: `/${target.value}${suffix}`,
        query: route.query,
        hash: route.hash
    });
}
const __VLS_ctx = {};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_withDotValue(messages, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['locale-control']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "locale-control" },
    });
    /** @type {__VLS_StyleScopedClasses['locale-control']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "sr-only" },
    });
    /** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
    (messages.value.language);
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (changeLocale) },
        value: (__VLS_unwrap(locale, {})),
        'aria-label': (messages.value.language),
    });
    const __VLS_0 = __VLS_tryAsConstant((__VLS_unwrap(WEB_LOCALES, {})));
    for (const [item] of __VLS_vFor(__VLS_nonNull(__VLS_0))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (item.tag),
            value: (item.tag),
        });
        (item.nativeName);
        // @ts-ignore
        [messages, messages, locale, WEB_LOCALES,];
    }
    // @ts-ignore
    [];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
