import type { FilteredScanReportExport } from '../api/scan-report-types'

export function downloadTextFile(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportFilteredReportJson(payload: FilteredScanReportExport, scanId: string) {
  downloadTextFile(
    `scan-report-${scanId}.json`,
    `${JSON.stringify(payload, null, 2)}\n`,
    'application/json'
  )
}

export function exportFilteredReportMarkdown(payload: FilteredScanReportExport, scanId: string) {
  const lines: string[] = [
    `# Scan report (${scanId})`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    '## Filters',
    `- Severities: ${payload.filters.severities.join(', ') || 'none'}`,
    `- Sections: ${payload.filters.sections.join(', ') || 'none'}`,
    `- Path query: ${payload.filters.pathQuery || '(none)'}`,
    '',
    '## Findings',
    ''
  ]

  if (payload.findings.length === 0) {
    lines.push('_No findings match the current filters._', '')
  } else {
    for (const finding of payload.findings) {
      const location =
        finding.line !== undefined ? `${finding.file}:${finding.line}` : finding.file
      lines.push(
        `- **${finding.severity}** · ${finding.section} · \`${location}\``,
        `  ${finding.message}`,
        finding.rule ? `  Rule: ${finding.rule}` : '',
        finding.tool ? `  Tool: ${finding.tool}` : '',
        ''
      )
    }
  }

  lines.push('## Improvements', '')
  if (payload.improvements.length === 0) {
    lines.push('_No improvements match the current filters._', '')
  } else {
    for (const row of payload.improvements) {
      lines.push(`- ${row.message}`, `  Related findings: ${row.relatedFindingIds.join(', ')}`, '')
    }
  }

  if (payload.history) {
    lines.push('## History', '')
    lines.push(`Limited history: ${payload.history.limitedHistory ? 'yes' : 'no'}`, '')
    if (payload.history.hotspots.length > 0) {
      lines.push('### Hotspots', '')
      for (const hotspot of payload.history.hotspots) {
        lines.push(`- \`${hotspot.path}\` · score ${hotspot.score}`)
      }
      lines.push('')
    }
  }

  downloadTextFile(`scan-report-${scanId}.md`, `${lines.filter(Boolean).join('\n')}\n`, 'text/markdown')
}
