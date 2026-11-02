import { beforeEach, describe, expect, it } from 'vitest'
import { BRAND, readMigrated, storageKey } from '../../../../packages/brand/src/brand'
import { getCurrentSession } from '../../src/services/auth'
import { LOCALE_PREFERENCE_KEY, readLocalePreference } from '../../src/services/locale'

describe('hosted storage migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('moves a legacy session onto the current key', () => {
    localStorage.setItem(`${BRAND.legacySlug}-auth-session-v2`, JSON.stringify({
      token: 'legacy-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' }
    }))
    expect(getCurrentSession()?.token).toBe('legacy-token')
    expect(localStorage.getItem(storageKey('auth-session-v2'))).toContain('legacy-token')
    expect(localStorage.getItem(`${BRAND.legacySlug}-auth-session-v2`)).toBeNull()
  })

  it('moves a legacy locale preference', () => {
    localStorage.setItem(`${BRAND.legacySlug}-locale`, 'ur')
    expect(readLocalePreference()).toBe('ur')
    expect(localStorage.getItem(LOCALE_PREFERENCE_KEY)).toBe('ur')
    expect(localStorage.getItem(`${BRAND.legacySlug}-locale`)).toBeNull()
  })

  it('reads the current key without calling the viewer', () => {
    localStorage.setItem(storageKey('theme'), 'light')
    expect(readMigrated('theme')).toBe('light')
  })
})
