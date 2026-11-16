import { describe, expect, it } from 'vitest'
import { GUIDES_NODE_ID, isSelectableNodeId } from '../../src/viewer/radial-guides'

describe('ring-guides layer', () => {
  it('is never selectable; files are', () => {
    expect(isSelectableNodeId(GUIDES_NODE_ID)).toBe(false)
    expect(isSelectableNodeId('file:apps/web/main.ts')).toBe(true)
  })
})
