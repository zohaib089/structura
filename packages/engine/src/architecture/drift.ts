import { compareStrings } from '../graph/ids.js'
import type { Graph, GraphEdge, GraphNode } from '../graph/types.js'
import type { ArchitectureDriftRule, ArchitectureFinding, ArchitectureModuleDecl, ResolvedArchitecture } from './types.js'

const EXTERNAL_MODULE = 'external'

function filePathFromId(id: string): string | undefined {
  return id.startsWith('file:') ? id.slice('file:'.length) : undefined
}

function targetModule(
  edge: GraphEdge,
  nodes: Map<string, GraphNode>,
  moduleByPath: Map<string, string | undefined>
): string | undefined {
  const target = nodes.get(edge.target)
  if (!target) return undefined
  if (target.kind === 'file') return moduleByPath.get(target.path) ?? 'unassigned'
  if (target.kind === 'external') return EXTERNAL_MODULE
  return undefined
}

function moduleDecl(config: ResolvedArchitecture, name: string | undefined): ArchitectureModuleDecl | undefined {
  if (name === undefined || name === EXTERNAL_MODULE) return undefined
  return config.modules.find(mod => mod.name === name)
}

function effectivePolicy(mod: ArchitectureModuleDecl | undefined, config: ResolvedArchitecture): 'deny-undeclared' | 'allow-undeclared' {
  return mod?.policy ?? config.defaultPolicy ?? 'allow-undeclared'
}

function violationRule(
  sourceMod: ArchitectureModuleDecl | undefined,
  sourceName: string | undefined,
  targetName: string | undefined,
  config: ResolvedArchitecture
): ArchitectureDriftRule | undefined {
  if (sourceName === undefined || targetName === undefined) return undefined
  if (targetName === EXTERNAL_MODULE) return undefined
  if (sourceMod?.deny?.includes(targetName)) return 'deny-list'
  if (sourceMod?.allow && !sourceMod.allow.includes(targetName)) return 'allow-list'
  const policy = effectivePolicy(sourceMod, config)
  if (policy === 'deny-undeclared' && targetName !== sourceName) {
    if (sourceMod?.allow?.includes(targetName)) return undefined
    return 'deny-undeclared'
  }
  return undefined
}

export function detectArchitectureDrift(
  graph: Graph,
  config: ResolvedArchitecture,
  moduleByPath: Map<string, string | undefined>
): ArchitectureFinding[] {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]))
  const findings: ArchitectureFinding[] = []

  for (const edge of graph.edges) {
    if (edge.type !== 'imports' && edge.type !== 'reexports') continue
    if (edge.provenance !== 'EXTRACTED') continue
    if (!('span' in edge)) continue
    const sourcePath = filePathFromId(edge.source)
    if (!sourcePath) continue
    const fromModule = moduleByPath.get(sourcePath)
    const toModule = targetModule(edge, nodes, moduleByPath)
    const rule = violationRule(moduleDecl(config, fromModule), fromModule, toModule, config)
    if (!rule) continue
    findings.push({
      from: fromModule ?? 'unassigned',
      to: toModule ?? 'unassigned',
      edgeKind: edge.type,
      file: sourcePath,
      line: edge.span.start.line,
      rule,
      provenance: 'EXTRACTED'
    })
  }

  findings.sort((a, b) =>
    compareStrings(a.file, b.file) ||
    a.line - b.line ||
    compareStrings(a.from, b.from) ||
    compareStrings(a.to, b.to) ||
    compareStrings(a.edgeKind, b.edgeKind) ||
    compareStrings(a.rule, b.rule)
  )
  return findings
}
