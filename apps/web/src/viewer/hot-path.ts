/**
 * Path highlight shared by Radial and Linear (landing graph behaviour): the shortest drawn route
 * (ignoring direction) from the centre file to the hovered, focused or selected node.
 * Empty when there is no target or the target is the centre; an unconnected target lights alone.
 */
export function hotPathBetween(
  edges: readonly { id: string; source: string; target: string }[],
  start: string | null,
  target: string | null
): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>()
  const used = new Set<string>()
  if (!target || !start || start === target) return { nodes, edges: used }
  const adj = new Map<string, { to: string; id: string }[]>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    if (!adj.has(e.target)) adj.set(e.target, [])
    adj.get(e.source)!.push({ to: e.target, id: e.id })
    adj.get(e.target)!.push({ to: e.source, id: e.id })
  }
  nodes.add(target)
  const prev = new Map<string, { from: string; id: string }>()
  const queue = [start]
  const seen = new Set([start])
  while (queue.length) {
    const cur = queue.shift()!
    if (cur === target) break
    for (const { to, id } of adj.get(cur) ?? []) {
      if (seen.has(to)) continue
      seen.add(to)
      prev.set(to, { from: cur, id })
      queue.push(to)
    }
  }
  if (!prev.has(target)) return { nodes, edges: used }
  let cur = target
  while (cur !== start) {
    const step = prev.get(cur)!
    used.add(step.id)
    nodes.add(step.from)
    cur = step.from
  }
  return { nodes, edges: used }
}
