/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { Eye, EyeOff } from '@lucide/vue';
import { ref, useId } from 'vue';
const { defineProps, defineEmits, withDefaults, } = {};
const props = withDefaults(defineProps(), {
    type: 'text',
    placeholder: '',
    hint: '',
    autocomplete: 'off'
});
const inputId = useId();
const isPasswordVisible = ref(false);
const emit = defineEmits();
function onInput(event) {
    const target = event.target;
    emit('update:modelValue', target.value);
}
const __VLS_defaults = {
    type: 'text',
    placeholder: '',
    hint: '',
    autocomplete: 'off'
};
void __VLS_defaults;
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
    __VLS_withDotValue(isPasswordVisible, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['password-toggle']} */ ;
    /** @type {__VLS_StyleScopedClasses['password-toggle']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "field" },
    });
    /** @type {__VLS_StyleScopedClasses['field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "field-label" },
        for: (__VLS_unwrap(inputId, {})),
    });
    /** @type {__VLS_StyleScopedClasses['field-label']} */ ;
    (props.label);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "input-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['input-wrap']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (onInput) },
        id: (__VLS_unwrap(inputId, {})),
        type: (props.type === 'password' && isPasswordVisible.value ? 'text' : props.type),
        value: (props.modelValue),
        placeholder: (props.placeholder),
        autocomplete: (props.autocomplete),
        ...{ class: ({ 'has-password-toggle': props.type === 'password' }) },
    });
    /** @type {__VLS_StyleScopedClasses['has-password-toggle']} */ ;
    if (props.type === 'password') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!(props.type === 'password'))
                        throw 0;
                    return (isPasswordVisible.value = !isPasswordVisible.value);
                    // @ts-ignore
                    [inputId, inputId, isPasswordVisible, isPasswordVisible, isPasswordVisible,];
                } },
            ...{ class: "password-toggle" },
            type: "button",
            'aria-label': (props.passwordVisibilityLabels
                ? (isPasswordVisible.value ? props.passwordVisibilityLabels.hide : props.passwordVisibilityLabels.show)
                : `${isPasswordVisible.value ? 'Hide' : 'Show'} ${props.label.toLowerCase()}`),
            'aria-pressed': (isPasswordVisible.value),
            'aria-controls': (__VLS_unwrap(inputId, {})),
        });
        /** @type {__VLS_StyleScopedClasses['password-toggle']} */ ;
        if (isPasswordVisible.value) {
            let __VLS_0;
            /** @ts-ignore @type { | typeof EyeOff} */
            EyeOff;
            // @ts-ignore
            const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
                // @ts-ignore
                size: (18), 'aria-hidden': "true",
            }));
            const __VLS_2 = __VLS_1({
                size: (18),
                'aria-hidden': "true",
            }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        }
        else {
            let __VLS_5;
            /** @ts-ignore @type { | typeof Eye} */
            Eye;
            // @ts-ignore
            const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
                // @ts-ignore
                size: (18), 'aria-hidden': "true",
            }));
            const __VLS_7 = __VLS_6({
                size: (18),
                'aria-hidden': "true",
            }, ...__VLS_functionalComponentArgsRest(__VLS_6));
        }
    }
    if (props.hint) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (props.hint);
    }
    // @ts-ignore
    [inputId, isPasswordVisible, isPasswordVisible, isPasswordVisible, isPasswordVisible,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};
