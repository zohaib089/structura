import { readMigrated, storageKey } from '../../../../packages/brand/src/brand'

/** Hosted app only. The standalone viewer does not call this. */
export const LOCALE_PREFERENCE_KEY = storageKey('locale')

export function readLocalePreference(): string | null {
  return readMigrated('locale')
}
