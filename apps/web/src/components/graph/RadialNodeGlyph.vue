<script setup lang="ts">
/**
 * One node of the landing hero graph: nucleus mark, or a severity circle with its icon and label.
 * The hero SVG and the dashboard canvas both mount this so the drawing cannot drift.
 */
import { computed } from 'vue'
import BrandMark from '../brand/BrandMark.vue'
import { SEVERITY_ICONS } from '../../services/severity-display'
import { landingPageCopy } from '../../services/landing-page-copy'
import type { ReportSeverity } from '../../api/scan-report-types'
import { labelPlacement, NUCLEUS_HALO_RADIUS, nodeRadius } from './radial-geometry'
import './radial-graph.css'

const props = withDefaults(
  defineProps<{
    label: string
    ring: number
    severity: ReportSeverity
    deg?: number
    entry?: boolean
  }>(),
  { deg: 0, entry: false }
)

const radius = computed(() => nodeRadius(props.ring))
const place = computed(() => labelPlacement(props.deg, radius.value))
const icon = computed(() => SEVERITY_ICONS[props.severity])
const severityColor = computed(() => `var(--sev-${props.severity}-fg)`)
const entryTag = landingPageCopy.hero.entryTag
</script>

<template>
  <g class="radial-glyph">
    <template v-if="entry">
      <circle :r="NUCLEUS_HALO_RADIUS" class="radial__halo" />
      <BrandMark class="radial__nucleus" :size="88" animated x="-44" y="-44" />
      <text y="74" text-anchor="middle" class="radial__entry-name">{{ label }}</text>
      <text y="92" text-anchor="middle" class="radial__entry-tag">{{ entryTag }}</text>
    </template>
    <template v-else>
      <circle :r="radius + 7" class="radial__halo" />
      <circle :r="radius" class="radial__body" :style="{ stroke: severityColor }" />
      <component
        :is="icon"
        :size="radius * 1.15"
        :x="-radius * 0.575"
        :y="-radius * 0.575"
        :stroke-width="2.4"
        :style="{ color: severityColor }"
        aria-hidden="true"
      />
      <text :x="place.x" :y="place.y" :text-anchor="place.anchor" class="radial__label">{{ label }}</text>
    </template>
  </g>
</template>
