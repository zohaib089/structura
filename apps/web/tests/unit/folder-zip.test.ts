import { describe, expect, it } from 'vitest'
import {
  rootFolderNameFromBrowserFiles,
  shouldSkipArchivePath,
  stripRootFolderPrefix
} from '../../src/services/folder-zip'

describe('folder archive paths', () => {
  it('skips common build and VCS directories', () => {
    expect(shouldSkipArchivePath('src/index.ts')).toBe(false)
    expect(shouldSkipArchivePath('node_modules/pkg/index.js')).toBe(true)
    expect(shouldSkipArchivePath('.git/config')).toBe(true)
    expect(shouldSkipArchivePath('apps/web/dist/main.js')).toBe(true)
  })

  it('strips the browser root folder segment from relative paths', () => {
    expect(stripRootFolderPrefix('my-app/src/index.ts', 'my-app')).toBe('src/index.ts')
    expect(rootFolderNameFromBrowserFiles([
      new File(['x'], 'index.ts', { type: 'text/plain' })
    ])).toBeNull()
    const file = new File(['x'], 'index.ts', { type: 'text/plain' })
    Object.defineProperty(file, 'webkitRelativePath', { value: 'my-app/src/index.ts' })
    expect(rootFolderNameFromBrowserFiles([file])).toBe('my-app')
  })
})
