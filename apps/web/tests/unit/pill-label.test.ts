import { describe, expect, it } from 'vitest'
import { middleEllipsis, pillCharBudget } from '../../src/viewer/pill-label'

describe('middleEllipsis', () => {
  it('leaves names that fit alone', () => {
    expect(middleEllipsis('index.ts', 16)).toBe('index.ts')
    expect(middleEllipsis('ViewerApp.vue', 13)).toBe('ViewerApp.vue')
  })
  it('keeps the start, the distinguishing tail and the extension', () => {
    const out = middleEllipsis('file-neighborhood.ts', 15)
    expect(Array.from(out)).toHaveLength(15)
    expect(out.startsWith('file-')).toBe(true)
    expect(out.endsWith('hood.ts')).toBe(true)
    expect(out).toContain('…')
    // Sibling names stay distinguishable.
    expect(middleEllipsis('graph-viewer.spec.ts', 14)).not.toBe(middleEllipsis('graph-viewer.test.ts', 14))
  })
  it('handles names without an extension, dotfiles and tiny budgets', () => {
    expect(middleEllipsis('packages-vscode-extension', 12)).toBe('package…sion')
    expect(middleEllipsis('.eslintrc.config', 10)).toHaveLength(10)
    expect(middleEllipsis('abcdef', 3)).toBe('abcdef')
  })
})

describe('pillCharBudget', () => {
  it('fits fewer characters in the phone pill and when a mark or count is shown', () => {
    expect(pillCharBudget(148)).toBeLessThan(pillCharBudget(184))
    expect(pillCharBudget(148, { mark: true })).toBeLessThan(pillCharBudget(148))
    expect(pillCharBudget(148)).toBe(16)
    expect(pillCharBudget(184, { mark: true, bold: true })).toBe(16)
  })
})
