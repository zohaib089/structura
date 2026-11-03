import type { ExportView } from './model.js'
import { dslIdentifier } from './text.js'

function quote(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function graphToLikeC4(view: ExportView): string {
  const lines: string[] = [
    'specification {',
    '  element module',
    '  element external',
    '}',
    '',
    'model {',
    '  repository = module ' + quote('Repository') + ' {'
  ]

  for (const mod of view.modules) {
    const id = dslIdentifier(`module_${mod.name}`)
    lines.push(`    ${id} = module ${quote(mod.name)} {`)
    if (mod.files.length > 0) {
      lines.push(`      #files ${mod.files.join(', ')}`)
    }
    lines.push('    }')
  }

  lines.push('  }')
  lines.push('')

  for (const edge of view.moduleEdges) {
    const fromId = dslIdentifier(`module_${edge.from}`)
    const toId = dslIdentifier(`module_${edge.to}`)
    lines.push(`  ${fromId} -> ${toId} ${quote(`${edge.type} ${edge.provenance}`)}`)
  }

  for (const finding of view.findings) {
    lines.push(`  // finding ${finding.file}:${finding.line} ${finding.from} -> ${finding.to} ${finding.rule}`)
  }

  lines.push('}')
  lines.push('')
  lines.push('views {')
  lines.push('  view module_index {')
  lines.push('    title ' + quote('Modules'))
  lines.push('    include repository.*')
  lines.push('  }')
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}
