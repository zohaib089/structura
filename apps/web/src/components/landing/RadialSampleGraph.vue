<script setup lang="ts">
/**
 * RadialSampleGraph - the hero signature: rings around the entry file, drawn from made-up sample data.
 * Node marks, ring strokes, and edge ink come from the shared radial graph used by the dashboard.
 * Severity = icon shape + word + colour. Edges: solid (found in code), dashed (likely), dotted (couldn't confirm).
 * Nodes are focusable buttons with an amber focus ring; hover, focus and click highlight the path back to the entry.
 * Motion is CSS only and switches off under prefers-reduced-motion (rings and nodes simply appear).
 */
import { computed, ref } from 'vue'
import { landingPageCopy as copy, stepsAway } from '../../services/landing-page-copy'
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
import RadialNodeGlyph from '../graph/RadialNodeGlyph.vue'
import '../graph/radial-graph.css'

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

function ariaLabel(node: SampleNode): string {
  if (node.entry) return `${node.label}, where the project starts.`
  const issue = node.severity === 'info' ? 'No issues found.' : `${copy.severity[node.severity]} issue.`
  return `${node.label}, ${stepsAway(node.ring)} from the start. ${copy.linkKind[node.link]}. ${issue}`
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
        <RadialNodeGlyph
          :label="node.label"
          :ring="node.ring"
          :severity="node.severity"
          :deg="node.deg"
          :entry="node.entry"
        />
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
</style>
