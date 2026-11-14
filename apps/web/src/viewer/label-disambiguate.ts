/**
 * Two files in one view with the same name ("projects.ts" twice) get their parent folder in front
 * ("api/projects.ts", "stores/projects.ts"); further folders are added until the names differ.
 */
export function disambiguatedLabels(nodes: { id: string; label: string; kind?: string }[]): Map<string, string> {
  const out = new Map<string, string>()
  const groups = new Map<string, { id: string; parts: string[] }[]>()
  for (const n of nodes) {
    if (n.kind && n.kind !== 'file') continue
    const parts = n.id.replace(/^file:/, '').split('/').filter(Boolean)
    const base = parts[parts.length - 1] ?? ''
    if (!base || n.label !== base) continue
    const list = groups.get(base) ?? []
    list.push({ id: n.id, parts })
    groups.set(base, list)
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue
    let depth = 2
    const label = (parts: string[]) => parts.slice(-depth).join('/')
    while (depth < 8 && new Set(list.map((x) => label(x.parts))).size < list.length) depth += 1
    for (const x of list) out.set(x.id, label(x.parts))
  }
  return out
}
