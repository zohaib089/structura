/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
const { defineProps, defineEmits, } = {};
const __VLS_props = defineProps();
const __VLS_emit = defineEmits();
const __VLS_ctx = {
    ...{},
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
    /** @type {__VLS_StyleScopedClasses['dashboard-toast']} */ ;
    /** @type {__VLS_StyleScopedClasses['dashboard-toast']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-toast" },
        role: "status",
        'aria-live': "polite",
        'aria-label': (__VLS_ctx.message),
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-toast']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "toast-indicator" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['toast-indicator']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.message);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_ctx.$emit('dismiss'));
                // @ts-ignore
                [message, message, $emit,];
            } },
        type: "button",
        'aria-label': (__VLS_ctx.dismissLabel),
    });
    // @ts-ignore
    [dismissLabel,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
