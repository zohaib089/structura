import type * as vscode from 'vscode'
import { sanitizeWorkspaceRelativePath } from './protocol.js'

export interface WorkspaceRef {
  folder: vscode.WorkspaceFolder
  /** Repo-relative POSIX path of the active file, when there is one inside this folder. */
  activeRelativePath: string | null
  activeUri: vscode.Uri | null
}

export function folderContaining(uri: vscode.Uri, folders: readonly vscode.WorkspaceFolder[]): vscode.WorkspaceFolder | undefined {
  const path = uri.fsPath
  const matches = folders.filter((folder) => {
    const root = folder.uri.fsPath
    return path === root || path.startsWith(root.endsWith('/') || root.endsWith('\\') ? root : `${root}/`) ||
      path.startsWith(root.endsWith('\\') ? root : `${root}\\`)
  })
  matches.sort((a, b) => b.uri.fsPath.length - a.uri.fsPath.length)
  return matches[0]
}

export function resolveWorkspaceRef(vs: typeof vscode): WorkspaceRef | undefined {
  const folders = vs.workspace.workspaceFolders
  if (!folders || folders.length === 0) return undefined

  const activeUri = vs.window.activeTextEditor?.document.uri ?? null
  if (activeUri && (activeUri.scheme === 'file' || activeUri.scheme === 'vscode-userdata')) {
    const folder = vs.workspace.getWorkspaceFolder(activeUri) ?? folderContaining(activeUri, folders)
    if (folder) {
      const relative = toRelativePath(vs, folder, activeUri)
      return { folder, activeRelativePath: relative, activeUri }
    }
  }

  return { folder: folders[0], activeRelativePath: null, activeUri: null }
}

export function toRelativePath(
  vs: typeof vscode,
  folder: vscode.WorkspaceFolder,
  uri: vscode.Uri
): string | null {
  const relative = vs.workspace.asRelativePath(uri, false)
  return sanitizeWorkspaceRelativePath(relative.replace(/\\/g, '/'))
}

export function resolveFileInFolder(
  vs: typeof vscode,
  folder: vscode.WorkspaceFolder,
  relativePath: string
): vscode.Uri | undefined {
  const safe = sanitizeWorkspaceRelativePath(relativePath)
  if (!safe) return undefined
  const uri = vs.Uri.joinPath(folder.uri, ...safe.split('/'))
  const root = folder.uri.fsPath
  if (uri.fsPath !== root && !uri.fsPath.startsWith(root.endsWith('\\') ? root : `${root}/`) && !uri.fsPath.startsWith(`${root}\\`)) {
    return undefined
  }
  return uri
}
