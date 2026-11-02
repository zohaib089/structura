import { describe, expect, it } from 'vitest'
import { shouldSkipArchivePath } from '../../src/services/folder-zip'

describe('folder archive paths', () => {
  it('skips common build and VCS directories', () => {
    expect(shouldSkipArchivePath('src/index.ts')).toBe(false)
    expect(shouldSkipArchivePath('node_modules/pkg/index.js')).toBe(true)
    expect(shouldSkipArchivePath('.git/config')).toBe(true)
    expect(shouldSkipArchivePath('apps/web/dist/main.js')).toBe(true)
  })
})
