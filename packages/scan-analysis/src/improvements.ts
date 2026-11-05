import type { ScanFinding, ScanImprovement } from './types.js'
import { improvementId } from './types.js'

export function buildImprovements(findings: ScanFinding[]): ScanImprovement[] {
  const improvements: ScanImprovement[] = []

  const byRule = new Map<string, ScanFinding[]>()
  for (const finding of findings) {
    const key = finding.rule ?? finding.section
    const list = byRule.get(key) ?? []
    list.push(finding)
    byRule.set(key, list)
  }

  for (const [rule, group] of byRule.entries()) {
    const suggestion = suggestionForRule(rule, group[0])
    if (!suggestion) continue
    improvements.push({
      id: improvementId([rule, suggestion]),
      message: suggestion,
      severity: improvementSeverity(group),
      relatedFindingIds: group.map(item => item.id)
    })
  }

  return improvements
}

/** Keep `critical` distinct from `high`: a group is as serious as its most serious finding (floor: medium). */
function improvementSeverity(group: ScanFinding[]): 'critical' | 'high' | 'medium' {
  if (group.some(item => item.severity === 'critical')) return 'critical'
  if (group.some(item => item.severity === 'high')) return 'high'
  return 'medium'
}

function suggestionForRule(rule: string, sample: ScanFinding | undefined): string | null {
  if (!sample) return null
  if (rule.startsWith('graph/large-file')) {
    return `Split ${sample.file} into smaller modules to reduce maintenance risk.`
  }
  if (rule.startsWith('graph/large-function')) {
    return `Extract helpers from large functions in ${sample.file}.`
  }
  if (rule.startsWith('graph/god-module') || rule.startsWith('graph/high-fan-in')) {
    return `Refactor ${sample.file} to reduce coupling; consider extracting shared utilities.`
  }
  if (rule.startsWith('graph/import-cycle')) {
    return 'Break the import cycle by introducing an intermediate module or inverting dependencies.'
  }
  if (rule.startsWith('graph/unused-file')) {
    return `Remove unused file ${sample.file} or wire it into the module graph.`
  }
  if (rule.startsWith('graph/unused-export')) {
    return `Remove or use the unused export in ${sample.file}.`
  }
  if (rule.startsWith('graph/unused-dependency')) {
    return `Remove unused dependency "${sample.file}" from package manifests.`
  }
  if (sample.section === 'violations') {
    return `Fix ${sample.tool ?? 'linter'} rule ${sample.rule ?? ''} in ${sample.file}.`.trim()
  }
  if (sample.section === 'security') {
    return `Review security finding (${sample.tool ?? 'scanner'}) in ${sample.file}.`
  }
  if (sample.section === 'history' && rule === 'history/hotspot') {
    return `Review churn hotspot ${sample.file}; add tests or refactor unstable areas.`
  }
  return null
}
