import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeDashboardGraphStats } from '../../src/services/dashboard-graph-stats'
import { readGraph } from '../../src/viewer/read-graph'

describe('computeDashboardGraphStats', () => {
  it('derives counts and module ranks from the sample graph', () => {
    const sample = readGraph(readFileSync(resolve('fixtures/sample-graph.json'), 'utf8'))
    expect(sample.ok).toBe(true)
    if (!sample.ok) return

    const stats = computeDashboardGraphStats(sample.graph)
    expect(stats.files).toBe(3)
    expect(stats.modules).toBe(4)
    expect(stats.edges).toBeGreaterThan(0)
    expect(stats.extractedEdges + stats.inferredEdges).toBe(stats.edges)
    expect(stats.languages.some((row) => row.language === 'typescript')).toBe(true)
    expect(stats.topFanIn.length).toBeLessThanOrEqual(10)
    expect(stats.topFanOut.length).toBeLessThanOrEqual(10)
  })
})
