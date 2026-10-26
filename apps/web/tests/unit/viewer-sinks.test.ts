import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BRAND } from '../../../../packages/brand/src/brand'
import { viewerMessages } from '../../src/viewer/messages'

const roots = [resolve('src/viewer'), resolve('src/components/brand')].filter((dir) => existsSync(dir))

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return filesUnder(path)
    return /\.(vue|ts|css)$/.test(name) ? [path] : []
  })
}

const forbidden = [
  'v-html',
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document.write',
  'eval(',
  'new Function',
  'searchParams.get(\'graph\')',
  '?graph=',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'XMLHttpRequest',
  'sendBeacon',
  'WebSocket',
  'EventSource',
  'readMigrated',
  'fetch(',
  '/api/',
  '<component',
  'run.json'
]

describe('viewer sinks', () => {
  it('keeps the product name and browser storage out of the viewer sources', () => {
    const sources = roots.flatMap((root) => filesUnder(root))
    expect(sources.length).toBeGreaterThan(5)
    for (const path of sources) {
      const text = readFileSync(path, 'utf8')
      expect(text.includes(BRAND.name), path).toBe(false)
      expect(text.includes(BRAND.wordmark), path).toBe(false)
      expect(text.toLowerCase().includes(BRAND.legacySlug), path).toBe(false)
      for (const token of forbidden) expect(text.includes(token), `${path} ${token}`).toBe(false)
    }
  })

  it('keeps catalog strings free of the product name', () => {
    const catalog = JSON.stringify(viewerMessages('en'))
    expect(catalog.includes(BRAND.name)).toBe(false)
    expect(catalog.includes(BRAND.wordmark)).toBe(false)
    expect(catalog.toLowerCase().includes(BRAND.legacySlug)).toBe(false)
  })
})
