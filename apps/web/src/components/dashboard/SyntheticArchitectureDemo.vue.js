/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../home/ubuntu/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref } from 'vue';
const { defineProps, } = {};
const props = defineProps();
const nodeIds = ['Web UI', 'API', 'Auth', 'Workspace', 'Inventory', 'Database'];
const edges = [
    { from: 'Web UI', to: 'API' },
    { from: 'API', to: 'Auth' },
    { from: 'API', to: 'Workspace' },
    { from: 'Workspace', to: 'Inventory' },
    { from: 'Auth', to: 'Database' },
    { from: 'Inventory', to: 'Database' }
];
const nodePaths = {
    'Web UI': 'apps/web/src',
    API: 'apps/api/src',
    Auth: 'apps/api/src/auth',
    Workspace: 'apps/api/src/workspaces',
    Inventory: 'apps/api/src/analysis/inventory',
    Database: 'apps/api/src/database'
};
const selectedNode = ref('API');
const selectedNodeLabel = computed(() => selectedNode.value);
const selectedConnections = computed(() => edges.filter(edge => edge.from === selectedNode.value || edge.to === selectedNode.value));
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
    __VLS_withDotValue(selectedNode, {});
    __VLS_withDotValue(nodePaths, {});
    __VLS_withDotValue(selectedConnections, {});
    __VLS_withDotValue(nodeIds, {});
    __VLS_withDotValue(edges, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['demo-banner']} */ ;
    /** @type {__VLS_StyleScopedClasses['demo-banner']} */ ;
    /** @type {__VLS_StyleScopedClasses['demo-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['demo-banner']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-details']} */ ;
    /** @type {__VLS_StyleScopedClasses['graph-node']} */ ;
    /** @type {__VLS_StyleScopedClasses['graph-edges']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-details']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-details']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-connections']} */ ;
    /** @type {__VLS_StyleScopedClasses['node-connections']} */ ;
    /** @type {__VLS_StyleScopedClasses['demo-metrics']} */ ;
    /** @type {__VLS_StyleScopedClasses['demo-metrics']} */ ;
    /** @type {__VLS_StyleScopedClasses['demo-metrics']} */ ;
    /** @type {__VLS_StyleScopedClasses['demo-findings']} */ ;
    /** @type {__VLS_StyleScopedClasses['graph-nodes']} */ ;
    /** @type {__VLS_StyleScopedClasses['graph-edges']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "architecture-demo" },
    });
    /** @type {__VLS_StyleScopedClasses['architecture-demo']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "demo-banner" },
        'aria-labelledby': "demo-title",
    });
    /** @type {__VLS_StyleScopedClasses['demo-banner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    (__VLS_ctx.messages.syntheticDemoLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        id: "demo-title",
    });
    (__VLS_ctx.messages.syntheticDemoTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.messages.syntheticDemoDescription);
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "demo-panel" },
        'aria-label': (__VLS_ctx.messages.architectureGraph),
    });
    /** @type {__VLS_StyleScopedClasses['demo-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    (__VLS_ctx.messages.architectureGraph);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "graph-nodes" },
        role: "group",
        'aria-label': (__VLS_ctx.messages.selectGraphNode),
    });
    /** @type {__VLS_StyleScopedClasses['graph-nodes']} */ ;
    const __VLS_0 = __VLS_tryAsConstant((nodeIds.value));
    for (const [node] of __VLS_vFor(__VLS_nonNull(__VLS_0))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    return (selectedNode.value = node);
                    // @ts-ignore
                    [messages, messages, messages, messages, messages, messages, nodeIds, selectedNode,];
                } },
            key: (node),
            type: "button",
            ...{ class: "graph-node" },
            ...{ class: ({ selected: selectedNode.value === node }) },
            'aria-pressed': (selectedNode.value === node),
        });
        /** @type {__VLS_StyleScopedClasses['graph-node']} */ ;
        /** @type {__VLS_StyleScopedClasses['selected']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
            ...{ class: "node-dot" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['node-dot']} */ ;
        (node);
        // @ts-ignore
        [selectedNode, selectedNode,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
        ...{ class: "graph-edges" },
        'aria-label': (__VLS_ctx.messages.architectureGraph),
    });
    /** @type {__VLS_StyleScopedClasses['graph-edges']} */ ;
    const __VLS_1 = __VLS_tryAsConstant((edges.value));
    for (const [edge] of __VLS_vFor(__VLS_nonNull(__VLS_1))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
            key: (`${edge.from}-${edge.to}`),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (edge.from);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "edge-line" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['edge-line']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (edge.to);
        // @ts-ignore
        [messages, edges,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "node-details" },
        'aria-live': "polite",
    });
    /** @type {__VLS_StyleScopedClasses['node-details']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({});
    (__VLS_ctx.messages.nodeDetails);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_unwrap(selectedNodeLabel, {}));
    (__VLS_ctx.messages.syntheticDemoLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({});
    (nodePaths.value[selectedNode.value]);
    if (selectedConnections.value.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "node-connections" },
        });
        /** @type {__VLS_StyleScopedClasses['node-connections']} */ ;
        const __VLS_2 = __VLS_tryAsConstant((selectedConnections.value));
        for (const [edge] of __VLS_vFor(__VLS_nonNull(__VLS_2))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (`${edge.from}-${edge.to}`),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({});
            (edge.from);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({});
            (edge.to);
            // @ts-ignore
            [messages, messages, selectedNode, selectedNodeLabel, nodePaths, selectedConnections, selectedConnections,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "demo-panel report-panel" },
        'aria-label': (__VLS_ctx.messages.demoReport),
    });
    /** @type {__VLS_StyleScopedClasses['demo-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['report-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    (__VLS_ctx.messages.demoReport);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "demo-metrics" },
    });
    /** @type {__VLS_StyleScopedClasses['demo-metrics']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (nodeIds.value.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.messages.demoModulesMetric);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (edges.value.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.messages.demoConnectionsMetric);
    __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
        ...{ class: "demo-findings" },
    });
    /** @type {__VLS_StyleScopedClasses['demo-findings']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({});
    (__VLS_ctx.messages.demoFindingOne);
    __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({});
    (__VLS_ctx.messages.demoFindingTwo);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "demo-limitation" },
    });
    /** @type {__VLS_StyleScopedClasses['demo-limitation']} */ ;
    (__VLS_ctx.messages.demoLimitation);
    // @ts-ignore
    [messages, messages, messages, messages, messages, messages, messages, nodeIds, edges,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
