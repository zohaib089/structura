import type { Component } from 'vue'
import {
  CircleAlert,
  CircleDot,
  Info,
  OctagonAlert,
  TriangleAlert
} from '@lucide/vue'
import type { ReportSeverity } from '../api/scan-report-types'

export const SEVERITY_ICONS: Record<ReportSeverity, Component> = {
  critical: OctagonAlert,
  high: TriangleAlert,
  medium: CircleAlert,
  low: Info,
  info: CircleDot
}

export function severityTokenPrefix(severity: ReportSeverity): string {
  return `--sev-${severity}`
}
