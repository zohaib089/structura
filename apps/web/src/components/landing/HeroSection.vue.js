/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ArrowRight, Sparkles } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { checkBackend } from '../../services/api';
const isBackendOnline = ref(false);
const isLoaded = ref(false);
onMounted(async () => {
    setTimeout(() => {
        isLoaded.value = true;
    }, 100);
    const data = await checkBackend();
    isBackendOnline.value = !!data;
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_withDotValue(isBackendOnline, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['badge']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['meta-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['status']} */ ;
    /** @type {__VLS_StyleScopedClasses['meta-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['meta-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['meta-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['status']} */ ;
    /** @type {__VLS_StyleScopedClasses['status']} */ ;
    /** @type {__VLS_StyleScopedClasses['dot']} */ ;
    /** @type {__VLS_StyleScopedClasses['graph-container']} */ ;
    /** @type {__VLS_StyleScopedClasses['center-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['center-core']} */ ;
    /** @type {__VLS_StyleScopedClasses['orbit-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero-inner']} */ ;
    /** @type {__VLS_StyleScopedClasses['left']} */ ;
    /** @type {__VLS_StyleScopedClasses['graph-container']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['graph-container']} */ ;
    /** @type {__VLS_StyleScopedClasses['center-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['center-core']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "hero" },
        ...{ class: ({ loaded: __VLS_unwrap(isLoaded, {}) }) },
    });
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['loaded']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "hero-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['hero-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "glow glow-1" },
    });
    /** @type {__VLS_StyleScopedClasses['glow']} */ ;
    /** @type {__VLS_StyleScopedClasses['glow-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "glow glow-2" },
    });
    /** @type {__VLS_StyleScopedClasses['glow']} */ ;
    /** @type {__VLS_StyleScopedClasses['glow-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "hero-inner" },
    });
    /** @type {__VLS_StyleScopedClasses['hero-inner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "left" },
    });
    /** @type {__VLS_StyleScopedClasses['left']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "badge" },
    });
    /** @type {__VLS_StyleScopedClasses['badge']} */ ;
    let __VLS_0;
    /** @ts-ignore @type { | typeof Sparkles} */
    Sparkles;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        // @ts-ignore
        size: (14),
    }));
    const __VLS_2 = __VLS_1({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "gradient" },
    });
    /** @type {__VLS_StyleScopedClasses['gradient']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "subtitle" },
    });
    /** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "actions" },
    });
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#contact",
        ...{ class: "btn primary" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    let __VLS_5;
    /** @ts-ignore @type { | typeof ArrowRight} */
    ArrowRight;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        // @ts-ignore
        size: (18),
    }));
    const __VLS_7 = __VLS_6({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#how",
        ...{ class: "btn secondary" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "meta-row" },
    });
    /** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "meta-card" },
    });
    /** @type {__VLS_StyleScopedClasses['meta-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "meta-card" },
    });
    /** @type {__VLS_StyleScopedClasses['meta-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "meta-card" },
    });
    /** @type {__VLS_StyleScopedClasses['meta-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "status" },
        ...{ class: ({ online: isBackendOnline.value }) },
    });
    /** @type {__VLS_StyleScopedClasses['status']} */ ;
    /** @type {__VLS_StyleScopedClasses['online']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "dot" },
    });
    /** @type {__VLS_StyleScopedClasses['dot']} */ ;
    (isBackendOnline.value ? 'System Online' : 'System Offline');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "right" },
    });
    /** @type {__VLS_StyleScopedClasses['right']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "graph-container" },
    });
    /** @type {__VLS_StyleScopedClasses['graph-container']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "center-node" },
    });
    /** @type {__VLS_StyleScopedClasses['center-node']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "center-core" },
    });
    /** @type {__VLS_StyleScopedClasses['center-core']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "orbit-node node-1" },
    });
    /** @type {__VLS_StyleScopedClasses['orbit-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "orbit-node node-2" },
    });
    /** @type {__VLS_StyleScopedClasses['orbit-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "orbit-node node-3" },
    });
    /** @type {__VLS_StyleScopedClasses['orbit-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "orbit-node node-4" },
    });
    /** @type {__VLS_StyleScopedClasses['orbit-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "orbit-node node-5" },
    });
    /** @type {__VLS_StyleScopedClasses['orbit-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "orbit-node node-6" },
    });
    /** @type {__VLS_StyleScopedClasses['orbit-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "orbit-node node-7" },
    });
    /** @type {__VLS_StyleScopedClasses['orbit-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-7']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "orbit-node node-8" },
    });
    /** @type {__VLS_StyleScopedClasses['orbit-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-8']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "ring ring-1" },
    });
    /** @type {__VLS_StyleScopedClasses['ring']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "ring ring-2" },
    });
    /** @type {__VLS_StyleScopedClasses['ring']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-2']} */ ;
    // @ts-ignore
    [isLoaded, isBackendOnline, isBackendOnline,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
