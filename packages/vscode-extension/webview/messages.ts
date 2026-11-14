import { BRAND } from '../../../packages/brand/src/brand'

const NAME = BRAND.name

export const webviewCopy = {
  emptyFolderTitle: 'Open a folder to see its graph',
  emptyFolderBody:
    'Open a project folder in this window, then choose Show graph for this file or Show whole project graph.',
  emptyFolderAction: 'Open a folder',
  emptyFileTitle: 'Open a file to see its graph',
  emptyFileBody: 'Open a source file in the editor, then choose Show graph for this file.',
  declinedTitle: 'This project has not been scanned yet',
  declinedBody: `${NAME} runs the scan only on this computer. It does not sign in, go online, or send your code anywhere.`,
  declinedAction: 'Scan this project',
  loadingTitle: 'Scanning this project on your computer…',
  loadingBody: 'This can take a minute the first time. You can keep working in the editor.',
  errorTitle: 'The scan could not finish',
  errorRetry: 'Try again',
  fileMissingTitle: 'This file is not in the graph',
  fileMissingShowProject: 'Show the whole project graph',
  fileMissingRetry: 'Try scanning again',
  fileMissingBody(path: string) {
    return `${NAME} has no node for ${path}. It may be ignored, unsupported, or outside the project folder.`
  }
}
