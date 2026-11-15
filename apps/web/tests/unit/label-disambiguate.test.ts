import { describe, expect, it } from 'vitest'
import { disambiguatedLabels } from '../../src/viewer/label-disambiguate'

describe('disambiguatedLabels', () => {
  it('adds the parent folder to duplicate file names only', () => {
    const out = disambiguatedLabels([
      { id: 'apps/web/src/api/projects.ts', label: 'projects.ts', kind: 'file' },
      { id: 'apps/web/src/stores/projects.ts', label: 'projects.ts', kind: 'file' },
      { id: 'apps/web/src/main.ts', label: 'main.ts', kind: 'file' }
    ])
    expect(out.get('apps/web/src/api/projects.ts')).toBe('api/projects.ts')
    expect(out.get('apps/web/src/stores/projects.ts')).toBe('stores/projects.ts')
    expect(out.has('apps/web/src/main.ts')).toBe(false)
  })
  it('walks up until the names differ', () => {
    const out = disambiguatedLabels([
      { id: 'a/src/index.ts', label: 'index.ts', kind: 'file' },
      { id: 'b/src/index.ts', label: 'index.ts', kind: 'file' }
    ])
    expect(out.get('a/src/index.ts')).toBe('a/src/index.ts')
  })
})
