import { describe, expect, it } from 'vitest'
import { impactFileLabel, impactHeadline, impactNodeIds, type ViewerImpactAlert } from '../../src/viewer/impact-copy'

const messages = {
  impactNone: 'Changing this file does not affect other files.',
  impactOne: 'Changing this file can affect 1 file',
  impactMany: 'Changing this file can affect {n} files'
}

function format(template: string, values: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (values[key] === undefined ? match : String(values[key])))
}

function alert(count: number, truncated = false): ViewerImpactAlert {
  return {
    targetPath: 'src/util.ts',
    targetFileId: 'file:src/util.ts',
    dependents: Array.from({ length: count }, (_, i) => ({
      path: `src/f${i + 1}.ts`,
      fileId: `file:src/f${i + 1}.ts`,
      depth: 1
    })),
    truncated,
    depthLimit: 3
  }
}

describe('impactHeadline', () => {
  it('uses plain language for none, one, and many', () => {
    expect(impactHeadline(alert(0), messages, format)).toBe('Changing this file does not affect other files.')
    expect(impactHeadline(alert(1), messages, format)).toBe('Changing this file can affect 1 file')
    expect(impactHeadline(alert(7), messages, format)).toBe('Changing this file can affect 7 files')
  })
})

describe('impactNodeIds', () => {
  it('includes the target and each dependent once', () => {
    expect(impactNodeIds(null)).toEqual([])
    expect(impactNodeIds(alert(2))).toEqual(['file:src/util.ts', 'file:src/f1.ts', 'file:src/f2.ts'])
  })
})

describe('impactFileLabel', () => {
  it('uses the file name and keeps a full path as a fallback', () => {
    expect(impactFileLabel('packages/engine/src/graph/ids.ts')).toBe('ids.ts')
    expect(impactFileLabel('README.md')).toBe('README.md')
  })
})
