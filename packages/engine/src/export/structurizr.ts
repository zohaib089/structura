import type { ExportView } from './model.js'
import { dslIdentifier } from './text.js'

function quote(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function findingDescriptions(view: ExportView): string[] {
  return view.findings.map(finding =>
    `${finding.file}:${finding.line} ${finding.from} -> ${finding.to} rule=${finding.rule}`)
}

export function graphToStructurizr(view: ExportView): string {
  const lines: string[] = [
    'workspace {',
    '  model {',
    '    repository = softwareSystem ' + quote('Repository') + ' {'
  ]

  for (const mod of view.modules) {
    const id = dslIdentifier(`module_${mod.name}`)
    lines.push(`      ${id} = container ${quote(mod.name)} {`)
    if (mod.files.length > 0) {
      lines.push(`        description ${quote(mod.files.join(', '))}`)
    }
    lines.push('      }')
  }

  for (const edge of view.moduleEdges) {
    const fromId = dslIdentifier(`module_${edge.from}`)
    const toId = dslIdentifier(`module_${edge.to}`)
    lines.push(`      ${fromId} -> ${toId} ${quote(`${edge.type} (${edge.provenance})`)}`)
  }

  const findingText = findingDescriptions(view)
  if (findingText.length > 0) {
    lines.push(`      // architecture findings: ${findingText.join('; ')}`)
  }

  lines.push('    }')
  lines.push('  }')
  lines.push('  views {')
  lines.push('    container repository "Modules" {')
  lines.push('      include *')
  lines.push('      autoLayout lr')
  if (findingText.length > 0) {
    lines.push(`      description ${quote(findingText.join('\n'))}`)
  }
  lines.push('    }')
  lines.push('  }')
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}
