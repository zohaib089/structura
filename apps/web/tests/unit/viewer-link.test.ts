import { describe, expect, it } from 'vitest'
import { viewerHref } from '../../src/services/viewer-link'

describe('viewerHref', () => {
  it('joins the viewer path under BASE_URL', () => {
    expect(viewerHref('/structura/')).toBe('/structura/viewer/')
    expect(viewerHref('/')).toBe('/viewer/')
    expect(viewerHref('/app')).toBe('/app/viewer/')
  })
})
