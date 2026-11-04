import { describe, expect, it } from 'vitest'
import { indexGraph } from '../../src/viewer/overview'
import { readGraph } from '../../src/viewer/read-graph'
import { resolveGraphFocusQuery, resolveGraphNodeId } from '../../src/services/graph-node-focus'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('graph node focus', () => {
  it('resolves file paths to graph node ids', () => {
    const fixture = readFileSync(resolve(import.meta.dirname, '../../fixtures/sample-graph.json'), 'utf8')
    const parsed = readGraph(fixture)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const index = indexGraph(parsed.graph)
    expect(resolveGraphNodeId(index, 'apps/web/main.ts')).toBe('file:apps/web/main.ts')
    expect(resolveGraphNodeId(index, 'apps/web')).toBe('dir:apps/web')
  })

  it('reads node and focus query params', () => {
    expect(resolveGraphFocusQuery({ node: 'src/app.ts' })).toBe('src/app.ts')
    expect(resolveGraphFocusQuery({ focus: 'src/lib' })).toBe('src/lib')
    expect(resolveGraphFocusQuery({})).toBeNull()
  })
})
