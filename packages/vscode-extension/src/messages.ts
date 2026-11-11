import { PRODUCT_NAME } from '@atlasmith/engine'

/** UI copy. Product name is interpolated from the brand module; do not hard-code it. */
export const messages = {
  scanConsent: 'Scan this project with {name}? It runs only on this computer.',
  scanAction: 'Scan',
  notNowAction: 'Not now',
  panelTitleFile: '{name} graph · this file',
  panelTitleProject: '{name} graph · whole project',
  emptyFolderTitle: 'Open a folder to see its graph',
  emptyFolderBody:
    'Open a project folder in this window, then choose Show graph for this file or Show whole project graph.',
  emptyFolderAction: 'Open a folder',
  emptyFileTitle: 'Open a file to see its graph',
  emptyFileBody: 'Open a source file in the editor, then choose Show graph for this file.',
  declinedTitle: 'This project has not been scanned yet',
  declinedBody: 'Scan runs only on this computer. {name} does not sign in, go online, or send your code anywhere.',
  declinedAction: 'Scan this project',
  loadingTitle: 'Scanning this project on your computer…',
  loadingBody: 'This can take a minute the first time. You can keep working in the editor.',
  errorTitle: 'The scan could not finish',
  errorRetry: 'Try again',
  fileMissingTitle: 'This file is not in the graph',
  fileMissingBody: '{name} has no node for {path}. It may be ignored, unsupported, or outside the project folder.',
  fileMissingShowProject: 'Show the whole project graph',
  fileMissingRetry: 'Try scanning again',
  openFolderError: 'Open a folder first, then show the graph.',
  graphViewTitle: '{name} graph',
  showFileGraphItem: 'Show graph for this file',
  showProjectGraphItem: 'Show whole project graph',
  webviewTitle: '{name} graph'
} as const

export type MessageKey = keyof typeof messages

export function formatMessage(template: string, values: Record<string, string> = {}): string {
  const withName: Record<string, string> = { name: PRODUCT_NAME, ...values }
  return template.replace(/\{(\w+)\}/g, (match, key: string) => withName[key] ?? match)
}

export function copy(key: MessageKey, values: Record<string, string> = {}): string {
  return formatMessage(messages[key], values)
}
