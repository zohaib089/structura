import { assignModule } from '../architecture/assign-modules.js'
import type { ExportView } from './model.js'
import { obsidianLink, obsidianSlug } from './text.js'
import { buildExportView } from './model.js'
import type { Graph } from '../graph/types.js'

export interface ObsidianNote {
  path: string
  content: string
}

function moduleSlug(name: string): string {
  return `module-${obsidianSlug(name)}`
}

function fileSlug(path: string): string {
  return `file-${obsidianSlug(path)}`
}

export function graphToObsidianNotes(view: ExportView, graph: Graph): ObsidianNote[] {
  const modules = graph.architecture?.modules
  const notes: ObsidianNote[] = []
  const indexLines = ['# Repository graph', '', '## Modules', '']

  for (const mod of view.modules) {
    const slug = moduleSlug(mod.name)
    indexLines.push(`- ${obsidianLink(slug)}`)
    const body = [
      `# Module ${mod.name}`,
      '',
      '## Files',
      ''
    ]
    if (mod.files.length === 0) {
      body.push('- (none)')
    } else {
      body.push(...mod.files.map(file => `- ${obsidianLink(fileSlug(file))} (\`${file}\`)`))
    }
    if (view.findings.some(f => f.from === mod.name || f.to === mod.name)) {
      body.push('', '## Architecture findings', '')
      for (const finding of view.findings) {
        if (finding.from !== mod.name && finding.to !== mod.name) continue
        body.push(`- \`${finding.file}:${finding.line}\` ${finding.from} -> ${finding.to} (${finding.rule})`)
      }
    }
    notes.push({ path: `modules/${slug}.md`, content: `${body.join('\n')}\n` })
  }

  indexLines.push('', '## Files', '')
  for (const mod of view.modules) {
    for (const file of mod.files) indexLines.push(`- ${obsidianLink(fileSlug(file))}`)
  }

  notes.push({ path: 'index.md', content: `${indexLines.join('\n')}\n` })

  for (const mod of view.modules) {
    for (const file of mod.files) {
      const slug = fileSlug(file)
      const modName = modules
        ? assignModule(file, modules) ?? 'unassigned'
        : mod.name
      const deps = view.fileEdges.filter(edge => edge.from === file)
      const lines = [
        `# ${file}`,
        '',
        '## Module',
        '',
        obsidianLink(moduleSlug(modName)),
        '',
        '## Dependencies',
        ''
      ]
      if (deps.length === 0) {
        lines.push('- (none)')
      } else {
        for (const dep of deps) {
          const targetLink = dep.to.includes('/') ? obsidianLink(fileSlug(dep.to)) : `\`${dep.to}\``
          lines.push(`- ${dep.type} ${targetLink}${dep.specifier ? ` (${dep.specifier})` : ''}`)
        }
      }
      notes.push({ path: `files/${slug}.md`, content: `${lines.join('\n')}\n` })
    }
  }

  notes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return notes
}

export function graphToObsidian(graph: Graph): ObsidianNote[] {
  return graphToObsidianNotes(buildExportView(graph), graph)
}
