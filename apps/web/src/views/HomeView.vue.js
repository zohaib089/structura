/// <reference types="../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import Navbar from '../components/layout/Navbar.vue';
import FooterSection from '../components/layout/FooterSection.vue';
import HeroSection from '../components/landing/HeroSection.vue';
import WhatIsSection from '../components/landing/WhatIsSection.vue';
import HowItWorks from '../components/landing/HowItWorks.vue';
import ServicesSection from '../components/landing/ServicesSection.vue';
import ClientsSection from '../components/landing/ClientsSection.vue';
import ReviewsSection from '../components/landing/ReviewsSection.vue';
import ContactSection from '../components/landing/ContactSection.vue';
import { onMounted, onUnmounted, ref } from 'vue';
const motionReady = ref(false);
let revealObserver;
onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window))
        return;
    motionReady.value = true;
    revealObserver = new IntersectionObserver((entries, observer) => {
        for (const entry of entries) {
            if (!entry.isIntersecting)
                continue;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    }, { threshold: 0.12 });
    document.querySelectorAll('.landing-page > section:not(.hero)').forEach((section) => {
        revealObserver?.observe(section);
    });
});
onUnmounted(() => revealObserver?.disconnect());
const __VLS_ctx = {};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    void {};
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature']} */ ;
    /** @type {__VLS_StyleScopedClasses['step']} */ ;
    /** @type {__VLS_StyleScopedClasses['card']} */ ;
    /** @type {__VLS_StyleScopedClasses['review']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature']} */ ;
    /** @type {__VLS_StyleScopedClasses['step']} */ ;
    /** @type {__VLS_StyleScopedClasses['card']} */ ;
    /** @type {__VLS_StyleScopedClasses['review']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature']} */ ;
    /** @type {__VLS_StyleScopedClasses['step']} */ ;
    /** @type {__VLS_StyleScopedClasses['card']} */ ;
    /** @type {__VLS_StyleScopedClasses['review']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['feature']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['step']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['card']} */ ;
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-visible']} */ ;
    /** @type {__VLS_StyleScopedClasses['review']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "landing-page" },
        ...{ class: ({ 'motion-ready': __VLS_unwrap(motionReady, {}) }) },
    });
    /** @type {__VLS_StyleScopedClasses['landing-page']} */ ;
    /** @type {__VLS_StyleScopedClasses['motion-ready']} */ ;
    const __VLS_0 = Navbar;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    // @ts-ignore
    }));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const __VLS_5 = HeroSection;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    // @ts-ignore
    }));
    const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
    const __VLS_10 = WhatIsSection;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
    // @ts-ignore
    }));
    const __VLS_12 = __VLS_11({}, ...__VLS_functionalComponentArgsRest(__VLS_11));
    const __VLS_15 = HowItWorks;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
    // @ts-ignore
    }));
    const __VLS_17 = __VLS_16({}, ...__VLS_functionalComponentArgsRest(__VLS_16));
    const __VLS_20 = ServicesSection;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
    // @ts-ignore
    }));
    const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
    const __VLS_25 = ClientsSection;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
    // @ts-ignore
    }));
    const __VLS_27 = __VLS_26({}, ...__VLS_functionalComponentArgsRest(__VLS_26));
    const __VLS_30 = ReviewsSection;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
    // @ts-ignore
    }));
    const __VLS_32 = __VLS_31({}, ...__VLS_functionalComponentArgsRest(__VLS_31));
    const __VLS_35 = ContactSection;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35({
    // @ts-ignore
    }));
    const __VLS_37 = __VLS_36({}, ...__VLS_functionalComponentArgsRest(__VLS_36));
    const __VLS_40 = FooterSection;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent1(__VLS_40, new __VLS_40({
    // @ts-ignore
    }));
    const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
    // @ts-ignore
    [motionReady,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
