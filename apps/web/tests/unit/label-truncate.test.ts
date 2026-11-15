import { describe, expect, it } from 'vitest'
import { middleTruncate } from '../../src/viewer/label-truncate'

describe('middleTruncate', () => {
  it('keeps short names whole', () => {
    expect(middleTruncate('brand.ts', 10)).toBe('brand.ts')
  })
  it('keeps a head and the extension (real names from the narrow file view)', () => {
    expect(middleTruncate('ToastStack.vue', 10)).toBe('Toas…k.vue')
    expect(middleTruncate('ScanGraphView.vue', 10)).toBe('Scan…w.vue')
    expect(middleTruncate('shell-graph-viewport.test.ts', 10)).toBe('shell…t.ts')
  })
  it('never drops below the minimum head and tail', () => {
    const out = middleTruncate('ToastStack.vue', 4)
    expect(out).toBe('Toas….vue')
    expect(out.split('…')[0]!.length).toBeGreaterThanOrEqual(4)
    expect(out.split('…')[1]!.length).toBeGreaterThanOrEqual(4)
  })
})
