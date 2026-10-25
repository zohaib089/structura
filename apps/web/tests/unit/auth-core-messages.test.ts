import { describe, expect, it } from 'vitest'
import { authCoreMessages } from '../../src/services/auth-core-messages'
import { WEB_LOCALES } from '../../src/services/locale'

describe('core authentication message catalog', () => {
  it('keeps every initial locale structurally complete', () => {
    const expectedKeys = Object.keys(authCoreMessages('en')).sort()

    for (const locale of WEB_LOCALES) {
      const translated = authCoreMessages(locale.tag)
      expect(Object.keys(translated).sort()).toEqual(expectedKeys)
      for (const key of expectedKeys) {
        expect(translated[key as keyof typeof translated].trim()).not.toBe('')
      }
    }
  })

  it('provides translated login, signup, validation, and password-control copy', () => {
    expect(authCoreMessages('pt').loginTitle).toBe('Boas-vindas de volta')
    expect(authCoreMessages('es').signupTitle).toBe('Crea tu cuenta')
    expect(authCoreMessages('ja').showPassword).toBe('パスワードを表示')
    expect(authCoreMessages('ur').passwordsMismatch).toBe('پاس ورڈ ایک جیسے نہیں ہیں۔')
  })
})
