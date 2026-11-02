import { describe, expect, it } from 'vitest'
import { consumeStagedViewerGraph, stageGraphForViewer } from '../../src/services/viewer-graph-handoff'

describe('viewer graph handoff', () => {
  it('stores graph text once and clears it on consume', () => {
    sessionStorage.clear()
    stageGraphForViewer('Scan graph', '{"nodes":[]}')
    expect(consumeStagedViewerGraph()).toEqual({ label: 'Scan graph', text: '{"nodes":[]}' })
    expect(consumeStagedViewerGraph()).toBeNull()
  })
})
