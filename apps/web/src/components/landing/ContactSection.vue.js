/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from 'vue';
const name = ref('');
const email = ref('');
const message = ref('');
const sent = ref(false);
function handleSubmit() {
    if (!name.value || !email.value)
        return;
    sent.value = true;
    name.value = '';
    email.value = '';
    message.value = '';
}
const __VLS_ctx = {};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_withDotValue(sent, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['form']} */ ;
    /** @type {__VLS_StyleScopedClasses['success']} */ ;
    /** @type {__VLS_StyleScopedClasses['success']} */ ;
    /** @type {__VLS_StyleScopedClasses['success']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        id: "contact",
        ...{ class: "section" },
    });
    /** @type {__VLS_StyleScopedClasses['section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "container" },
    });
    /** @type {__VLS_StyleScopedClasses['container']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "badge" },
    });
    /** @type {__VLS_StyleScopedClasses['badge']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "desc" },
    });
    /** @type {__VLS_StyleScopedClasses['desc']} */ ;
    if (!sent.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (handleSubmit) },
            ...{ class: "form" },
        });
        /** @type {__VLS_StyleScopedClasses['form']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            value: (__VLS_unwrap(name, {})),
            type: "text",
            placeholder: "Your name",
            required: true,
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "email",
            placeholder: "Work email",
            required: true,
        });
        (__VLS_unwrap(email, {}));
        __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
            value: (__VLS_unwrap(message, {})),
            placeholder: "Tell us about your project (optional)",
            rows: "4",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            type: "submit",
        });
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "success" },
        });
        /** @type {__VLS_StyleScopedClasses['success']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
    // @ts-ignore
    [sent, name, email, message,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
