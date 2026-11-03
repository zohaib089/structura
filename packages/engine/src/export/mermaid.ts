import type { ExportView } from './model.js'
import { mermaidId, mermaidLabel } from './text.js'

function findingComments(view: ExportView): string[] {
  return view.findings.map(finding =>
    `%% ${finding.file}:${finding.line} ${finding.from} -> ${finding.to} (${finding.rule})`)
}

export function graphToMermaid(view: ExportView): string {
  const lines: string[] = ['flowchart LR']
  lines.push(...findingComments(view))

  for (const mod of view.modules) {
    const modId = mermaidId(`mod_${mod.name}`)
    if (mod.files.length === 0) {
      lines.push(`  ${modId}[${mermaidLabel(mod.name)}]`)
      continue
    }
    lines.push(`  subgraph ${modId}[${mermaidLabel(mod.name)}]`)
    for (const file of mod.files) {
      const fileId = mermaidId(`file_${file}`)
      const label = file.includes('/') ? file.slice(file.lastIndexOf('/') + 1) : file
      lines.push(`    ${fileId}[${mermaidLabel(label)}]`)
    }
    lines.push('  end')
  }

  const externalTargets = [...new Set(view.fileEdges
    .map(edge => edge.to)
    .filter(to => to.includes(':') && !to.includes('/')))]
    .sort()

  for (const target of externalTargets) {
    lines.push(`  ${mermaidId(`ext_${target}`)}(${mermaidLabel(target)})`)
  }

  for (const edge of view.fileEdges) {
    const fromId = mermaidId(`file_${edge.from}`)
    const external = edge.to.includes(':') && !edge.to.includes('/')
    const toId = external ? mermaidId(`ext_${edge.to}`) : mermaidId(`file_${edge.to}`)
    const link = edge.provenance === 'INFERRED' ? '-.->' : '-->'
    lines.push(`  ${fromId} ${link}|${edge.type}| ${toId}`)
  }

  for (const edge of view.moduleEdges) {
    const fromId = mermaidId(`mod_${edge.from}`)
    const toId = mermaidId(`mod_${edge.to}`)
    const link = edge.provenance === 'INFERRED' ? '-.->' : '-->'
    lines.push(`  ${fromId} ${link}|${edge.type}| ${toId}`)
  }

  return `${lines.join('\n')}\n`
}
