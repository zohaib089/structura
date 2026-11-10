<script setup lang="ts">
/**
 * RadialSampleGraph - the hero signature: rings around the entry file, drawn from made-up sample data.
 * Standalone SVG until the shared radial graph (D3) is on main; then swap it in sample mode.
 * Severity = icon shape + word + colour. Edges: solid (found in code), dashed (likely), dotted (couldn't confirm).
 * Nodes are focusable buttons with an amber focus ring; hover, focus and click highlight the path back to the entry.
 * Motion is CSS only and switches off under prefers-reduced-motion (rings and nodes simply appear).
 */
import { computed, ref } from 'vue'
import { SEVERITY_ICONS } from '../../services/severity-display'
import { useLandingCopy } from '../../composables/useLandingCopy'
import { fillCopy } from '../../services/landing-page-copy'
import {
  edgeKey,
  GRAPH_CENTER,
  GRAPH_VIEWBOX,
  pathToEntry,
  RING_RADII,
  SAMPLE_EDGES,
  SAMPLE_NODES,
  SAMPLE_RING_LABELS,
  type SampleNode
} from '../../services/landing-sample-graph'
import BrandMark from '../brand/BrandMark.vue'

const copy = useLandingCopy()

const emit = defineEmits<{ inspect: [node: SampleNode | null] }>()

const hoverId = ref<number | null>(null)
const focusId = ref<number | null>(null)
const selectedId = ref<number | null>(null)

const activeId = computed(() => hoverId.value ?? focusId.value ?? selectedId.value)
const hotPath = computed(() => (activeId.value === null ? [] : pathToEntry(activeId.value)))
const hotNodes = computed(() => {
  const ids = new Set<number>()
  if (activeId.value === null) return ids
  ids.add(0)
  ids.add(activeId.value)
  for (const [from, to] of hotPath.value) {
    ids.add(from)
    ids.add(to)
  }
  return ids
})
const hotEdges = computed(() => new Set(hotPath.value.map(([from, to]) => edgeKey(from, to))))

function publish() {
  emit('inspect', activeId.value === null ? null : SAMPLE_NODES[activeId.value] ?? null)
}
function onEnter(id: number) {
  hoverId.value = id
  publish()
}
function onLeave() {
  hoverId.value = null
  publish()
}
function onFocus(id: number) {
  focusId.value = id
  publish()
}
function onBlur() {
  focusId.value = null
  publish()
}
function onSelect(id: number) {
  selectedId.value = selectedId.value === id ? null : id
  publish()
}

const NODE_RADIUS: Record<number, number> = { 1: 15, 2: 12.5, 3: 11 }
const SEVERITY_COLOR = (severity: string) => `var(--sev-${severity}-fg)`

function nodeRadius(node: SampleNode): number {
  return NODE_RADIUS[node.ring] ?? 11
}

function ariaLabel(node: SampleNode): string {
  if (node.entry) return `${node.label}, where the project starts.`
  const issue = node.severity === 'info' ? copy.a11y.noIssues : fillCopy(copy.a11y.issueSentence, { severity: copy.severity[node.severity] })
  return fillCopy(copy.a11y.node, { label: node.label, steps: copy.stepsAway(node.ring), link: copy.linkKind[node.link], issue })
}

interface LabelPlacement {
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
}
function labelPlacement(node: SampleNode): LabelPlacement {
  const r = nodeRadius(node)
  const radians = (node.deg * Math.PI) / 180
  const out = Math.cos(radians)
  if (Math.abs(out) < 0.25) {
    return { x: 0, y: Math.sin(radians) > 0 ? r + 18 : -r - 8, anchor: 'middle' }
  }
  return { x: out > 0 ? r + 9 : -r - 9, y: 4, anchor: out > 0 ? 'start' : 'end' }
}

const nodeDelay = (node: SampleNode) => `${(0.35 + node.ring * 0.2 + node.id * 0.012).toFixed(2)}s`
const ringLabel = (entry: (typeof SAMPLE_RING_LABELS)[number]) => {
  const radians = (entry.deg * Math.PI) / 180
  return {
    x: GRAPH_CENTER + RING_RADII[entry.ring] * Math.cos(radians),
    y: GRAPH_CENTER + RING_RADII[entry.ring] * Math.sin(radians) + 3,
    text: copy.ringLabels[entry.ring]
  }
}
</script>

<template>
  <svg
    class="radial"
    :class="{ 'radial--dim': activeId !== null }"
    :viewBox="`0 0 ${GRAPH_VIEWBOX} ${GRAPH_VIEWBOX}`"
    preserveAspectRatio="xMidYMid meet"
    role="group"
    aria-labelledby="landing-graph-title"
    aria-describedby="landing-graph-desc"
    data-testid="landing-radial"
  >
    <title id="landing-graph-title">{{ copy.hero.graphTitle }}</title>

    <g>
      <circle
        v-for="(radius, i) in RING_RADII.slice(1)"
        :key="radius"
        :cx="GRAPH_CENTER"
        :cy="GRAPH_CENTER"
        :r="radius"
        class="radial__ring"
        :class="`radial__ring--${i + 1}`"
        :style="{ animationDelay: `${i * 0.18}s` }"
      />
      <text
        v-for="entry in SAMPLE_RING_LABELS"
        :key="entry.ring"
        :x="ringLabel(entry).x"
        :y="ringLabel(entry).y"
        text-anchor="middle"
        class="radial__ring-label"
      >
        {{ ringLabel(entry).text }}
      </text>
    </g>

    <g>
      <path
        v-for="edge in SAMPLE_EDGES"
        :key="edgeKey(edge.from, edge.to)"
        :d="edge.d"
        class="radial__edge"
        :class="[
          `radial__edge--${edge.kind}`,
          { 'is-hot': hotEdges.has(edgeKey(edge.from, edge.to)) }
        ]"
        :style="{ animationDelay: `${(0.5 + 0.04 * edge.to).toFixed(2)}s` }"
      />
    </g>

    <g>
      <g
        v-for="node in SAMPLE_NODES"
        :key="node.id"
        class="radial__node"
        :class="{
          'radial__node--entry': node.entry,
          'radial__node--unresolved': node.unresolved,
          [`radial__node--ring-${node.ring}`]: true,
          'is-hot': hotNodes.has(node.id),
          'is-selected': selectedId === node.id
        }"
        :transform="`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`"
        tabindex="0"
        role="button"
        :aria-label="ariaLabel(node)"
        :aria-pressed="node.entry ? undefined : selectedId === node.id"
        :style="node.entry ? undefined : { animationDelay: nodeDelay(node) }"
        :data-node-id="node.id"
        @mouseenter="onEnter(node.id)"
        @mouseleave="onLeave"
        @focus="onFocus(node.id)"
        @blur="onBlur"
        @click="onSelect(node.id)"
        @keydown.enter.prevent="onSelect(node.id)"
        @keydown.space.prevent="onSelect(node.id)"
      >
        <template v-if="node.entry">
          <circle r="56" class="radial__halo" />
          <!-- Nucleus with its idle loader: slow ring sweep + core pulse; static under reduced motion. -->
          <BrandMark class="radial__nucleus" :size="88" animated x="-44" y="-44" />
          <text y="74" text-anchor="middle" class="radial__entry-name">{{ node.label }}</text>
          <text y="92" text-anchor="middle" class="radial__entry-tag">{{ copy.hero.entryTag }}</text>
        </template>
        <template v-else>
          <circle :r="nodeRadius(node) + 7" class="radial__halo" />
          <circle :r="nodeRadius(node)" class="radial__body" :style="{ stroke: SEVERITY_COLOR(node.severity) }" />
          <component
            :is="SEVERITY_ICONS[node.severity]"
            :size="nodeRadius(node) * 1.15"
            :x="-nodeRadius(node) * 0.575"
            :y="-nodeRadius(node) * 0.575"
            :stroke-width="2.4"
            :style="{ color: SEVERITY_COLOR(node.severity) }"
            aria-hidden="true"
          />
          <text :x="labelPlacement(node).x" :y="labelPlacement(node).y" :text-anchor="labelPlacement(node).anchor" class="radial__label">
            {{ node.label }}
          </text>
        </template>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.radial {
  inline-size: 100%;
  block-size: 100%;
  display: block;
  overflow: visible;
}

.radial__ring {
  fill: none;
  stroke: var(--gray-4);
  stroke-width: 1;
  transform-box: fill-box;
  transform-origin: center;
  animation: radial-ring-in 0.9s var(--easing-product) both;
}
.radial__ring--3 {
  stroke-dasharray: 2 7;
}
.radial__ring-label {
  fill: var(--gray-7);
  font: 500 10px var(--landing-font-mono);
  letter-spacing: 0.06em;
  paint-order: stroke;
  stroke: var(--gray-0);
  stroke-width: 5px;
}

.radial__edge {
  fill: none;
  stroke: #5a6270;
  stroke-width: 1.3;
  animation: radial-fade 0.7s var(--easing-product) both;
  transition:
    stroke var(--dur-2) var(--easing-product),
    opacity var(--dur-2) var(--easing-product);
}
.radial__edge--inferred {
  stroke-dasharray: 7 5;
}
.radial__edge--unresolved {
  stroke: var(--gray-7);
  stroke-dasharray: 1.5 5;
  stroke-linecap: round;
}
.radial__edge.is-hot {
  stroke: var(--color-brand-amber-ui);
  stroke-width: 1.9;
  opacity: 1;
}
.radial--dim .radial__edge:not(.is-hot) {
  opacity: 0.28;
}
.radial--dim .radial__node:not(.is-hot) {
  opacity: 0.45;
}

.radial__node {
  cursor: pointer;
  outline: none;
  transition: opacity var(--dur-2) var(--easing-product);
}
.radial__node:not(.radial__node--entry) {
  animation: radial-fade 0.5s var(--easing-product) both;
}
.radial__body {
  fill: var(--gray-2);
  stroke-width: 1.6;
}
.radial__node--unresolved .radial__body {
  fill: var(--gray-0);
  stroke-dasharray: 2 3;
}
.radial__halo {
  fill: none;
  stroke: var(--color-brand-amber-ui);
  stroke-width: 2;
  opacity: 0;
  transition: opacity var(--dur-2) var(--easing-product);
}
.radial__node:hover .radial__halo,
.radial__node:focus-visible .radial__halo,
.radial__node.is-selected .radial__halo {
  opacity: 1;
}
.radial__label,
.radial__entry-name,
.radial__entry-tag {
  font: 500 11px var(--landing-font-mono);
  fill: var(--gray-10);
  paint-order: stroke;
  stroke: var(--gray-0);
  stroke-width: 4px;
  stroke-linejoin: round;
}
.radial__entry-name {
  font-size: 14px;
  font-weight: 600;
}
.radial__entry-tag {
  font-size: 10px;
  font-weight: 400;
  fill: var(--gray-8);
}

/* Idle HexLoader on the nucleus: slow sweep, gentle pulse. */
.radial__nucleus :deep(.nucleus-sweep),
.radial__nucleus :deep(.nucleus-core) {
  transform-origin: 32px 32px;
}
.radial__nucleus :deep(.nucleus-sweep) {
  opacity: 0.55;
  animation: radial-rotate 6s linear infinite;
}
.radial__nucleus :deep(.nucleus-core) {
  animation: radial-pulse 3s ease-in-out infinite;
}

@keyframes radial-fade {
  from {
    opacity: 0;
  }
}
@keyframes radial-ring-in {
  from {
    opacity: 0;
    transform: scale(0.88);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes radial-rotate {
  to {
    transform: rotate(360deg);
  }
}
@keyframes radial-pulse {
  50% {
    transform: scale(1.08);
  }
}

@media (max-width: 640px) {
  .radial__node--ring-3 .radial__label,
  .radial__ring-label {
    display: none;
  }
}

/* Reduced motion: everything is drawn at once; the nucleus is a static mark. */
@media (prefers-reduced-motion: reduce) {
  .radial__ring,
  .radial__edge,
  .radial__node:not(.radial__node--entry) {
    animation: none;
  }
  .radial__nucleus :deep(.nucleus-sweep) {
    display: none;
  }
  .radial__nucleus :deep(.nucleus-core) {
    animation: none;
  }
}
</style>
