import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const viewer = readFileSync(resolve(process.cwd(), 'src/viewer/ViewerApp.vue'), 'utf8')

describe('impact banner placement', () => {
  it('keeps See the files in the banner headline, above the Tips chip', () => {
    const line = viewer.slice(
      viewer.indexOf('<p class="impact-banner-line">'),
      viewer.indexOf('</p>', viewer.indexOf('<p class="impact-banner-line">')) + 4
    )
    expect(line).toContain('data-testid="impact-see"')
    expect(line).toContain('messages.impactSeeFiles')
    expect(viewer).toMatch(
      /inset-block-end: calc\(var\(--space-3, 12px\) \+ var\(--viewer-statusbar-height, 0px\) \+ 2\.75rem \+ var\(--space-2, 8px\)\)/
    )
    const actions = viewer.slice(
      viewer.indexOf('class="impact-banner-actions"'),
      viewer.indexOf('</div>', viewer.indexOf('class="impact-banner-actions"'))
    )
    expect(actions).not.toContain('impact-see')
  })
})
