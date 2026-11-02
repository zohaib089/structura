import { storageKey } from '../../../packages/brand/src/brand'

/**
 * Hosted pages may remember that the coach mark was dismissed.
 * The standalone viewer must not import this file: its build has no storage.
 */
export function readOnboarded(storage: Storage = localStorage): boolean {
  return storage.getItem(storageKey('onboarded')) === '1'
}

export function writeOnboarded(storage: Storage = localStorage): void {
  storage.setItem(storageKey('onboarded'), '1')
}
