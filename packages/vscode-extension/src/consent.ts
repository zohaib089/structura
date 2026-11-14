import type { ExtensionContext, MessageItem, MessageOptions } from 'vscode'
import { copy, messages } from './messages.js'

export const CONSENT_STATE_KEY = 'atlasmith.scanConsent'

export type ConsentValue = 'granted' | 'declined'

export interface ConsentStore {
  get(workspaceKey: string): ConsentValue | undefined
  set(workspaceKey: string, value: ConsentValue): Thenable<void> | void
}

export function workspaceConsentStore(context: ExtensionContext): ConsentStore {
  return {
    get(workspaceKey: string) {
      const all = context.workspaceState.get<Record<string, ConsentValue>>(CONSENT_STATE_KEY, {})
      return all[workspaceKey]
    },
    set(workspaceKey: string, value: ConsentValue) {
      const all = { ...context.workspaceState.get<Record<string, ConsentValue>>(CONSENT_STATE_KEY, {}) }
      all[workspaceKey] = value
      return context.workspaceState.update(CONSENT_STATE_KEY, all)
    }
  }
}

export function consentKeyForFolder(folderUri: string): string {
  return folderUri
}

export interface ConsentPromptApi {
  showInformationMessage: (
    message: string,
    options: MessageOptions,
    ...items: string[]
  ) => Thenable<string | MessageItem | undefined>
}

/**
 * Ask once per workspace folder before the first scan.
 * "Not now" is remembered. Dismissing the dialog does not persist a decision.
 */
export async function ensureScanConsent(
  store: ConsentStore,
  workspaceKey: string,
  prompt: ConsentPromptApi
): Promise<'granted' | 'declined' | 'dismissed'> {
  const existing = store.get(workspaceKey)
  if (existing === 'granted' || existing === 'declined') return existing

  const choice = await prompt.showInformationMessage(
    copy('scanConsent'),
    { modal: true },
    messages.scanAction,
    messages.notNowAction
  )

  if (choice === messages.scanAction) {
    await store.set(workspaceKey, 'granted')
    return 'granted'
  }
  if (choice === messages.notNowAction) {
    await store.set(workspaceKey, 'declined')
    return 'declined'
  }
  return 'dismissed'
}

/** An explicit Scan button in the webview is treated as consent for this folder. */
export async function grantConsent(store: ConsentStore, workspaceKey: string): Promise<void> {
  await store.set(workspaceKey, 'granted')
}
