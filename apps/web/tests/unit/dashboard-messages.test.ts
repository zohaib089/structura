import { describe, expect, it } from 'vitest'
import { dashboardMessages } from '../../src/services/dashboard-messages'
import { WEB_LOCALES } from '../../src/services/locale'

describe('dashboard message catalog', () => {
  it('provides the same complete dashboard message shape for every target locale', () => {
    const expectedKeys = Object.keys(dashboardMessages('en')).sort()

    for (const locale of WEB_LOCALES) {
      expect(Object.keys(dashboardMessages(locale.tag)).sort()).toEqual(expectedKeys)
      for (const key of expectedKeys) {
        const value = dashboardMessages(locale.tag)[key as keyof ReturnType<typeof dashboardMessages>]
        if (typeof value === 'function') {
          const sample = value.length >= 2
            ? (value as (name: string, role: string) => string)('scan-1', 'Admin')
            : (value as (name: string) => string)('scan-1')
          expect(sample.trim()).not.toBe('')
        } else {
          expect(value.trim()).not.toBe('')
        }
      }
    }
  })

  it('returns localized labels for core dashboard states', () => {
    expect(dashboardMessages('pt').createFirstWorkspace).toBe('Crie seu primeiro espaço de trabalho')
    expect(dashboardMessages('ja').noProjects).toBe('プロジェクトはまだありません')
    expect(dashboardMessages('ur').logOut).toBe('لاگ آؤٹ')
  })
})
