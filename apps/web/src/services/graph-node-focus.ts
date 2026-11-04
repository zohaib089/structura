import type { LocationQuery } from 'vue-router'
import type { GraphIndex } from '../viewer/overview'

export function normalizeGraphPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

export function resolveGraphNodeId(index: GraphIndex, ref: string): string | null {
  const trimmed = ref.trim()
  if (!trimmed) return null
  if (index.nodesById.has(trimmed)) return trimmed

  const path = normalizeGraphPath(trimmed)
  if (!path) return index.nodesById.has('dir:.') ? 'dir:.' : null

  const candidates = [`file:${path}`, `dir:${path}`]
  for (const id of candidates) {
    if (index.nodesById.has(id)) return id
  }

  const parts = path.split('/').filter(Boolean)
  for (let length = parts.length - 1; length >= 0; length -= 1) {
    const folder = parts.slice(0, length).join('/')
    const dirId = folder ? `dir:${folder}` : 'dir:.'
    if (index.nodesById.has(dirId)) return dirId
  }

  return null
}

export function resolveGraphFocusQuery(query: LocationQuery): string | null {
  const node = query.node
  if (typeof node === 'string' && node.trim()) return node
  const focus = query.focus
  if (typeof focus === 'string' && focus.trim()) return focus
  return null
}
