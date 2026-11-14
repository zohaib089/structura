import { join } from 'node:path'
import type * as vscode from 'vscode'
import { buildWebviewCsp, randomNonce } from './csp.js'
import { copy } from './messages.js'
import {
  isWebviewToHostMessage,
  type GraphMode,
  type HostToWebviewMessage,
  type ViewerState
} from './protocol.js'
import { resolveFileInFolder } from './workspace-paths.js'

export const WEBVIEW_DIST_DIR = 'dist-webview'
export const WEBVIEW_SCRIPT = 'assets/webview.js'
export const WEBVIEW_STYLE = 'assets/webview.css'

export interface PanelHost {
  readonly folder: vscode.WorkspaceFolder | undefined
  readonly mode: GraphMode
  getState: () => ViewerState
  onReady?: () => void
  onScan: () => void
  onShowProjectGraph: () => void
  onOpenFolder: () => void
}

export interface GraphPanel {
  readonly panel: vscode.WebviewPanel
  readonly mode: GraphMode
  reveal(): void
  postState(state: ViewerState): void
  dispose(): void
}

export function webviewHtml(options: {
  nonce: string
  cspSource: string
  scriptSrc: string
  styleSrc: string
  title: string
}): string {
  const csp = buildWebviewCsp({ nonce: options.nonce, cspSource: options.cspSource })
  const title = escapeHtml(options.title)
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${options.styleSrc}" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script nonce="${options.nonce}" src="${options.scriptSrc}"></script>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function localResourceRoots(vs: typeof vscode, extensionUri: vscode.Uri): vscode.Uri[] {
  return [vs.Uri.joinPath(extensionUri, WEBVIEW_DIST_DIR)]
}

export async function handleHostMessage(
  vs: typeof vscode,
  message: unknown,
  host: PanelHost
): Promise<void> {
  if (!isWebviewToHostMessage(message)) return
  switch (message.type) {
    case 'ready':
      host.onReady?.()
      return
    case 'scan':
      host.onScan()
      return
    case 'showProjectGraph':
      host.onShowProjectGraph()
      return
    case 'openFolder':
      host.onOpenFolder()
      return
    case 'openFile': {
      if (!host.folder) return
      const uri = resolveFileInFolder(vs, host.folder, message.path)
      if (!uri) return
      await vs.window.showTextDocument(uri, { preview: true, preserveFocus: false })
    }
  }
}

export function createGraphPanel(
  vs: typeof vscode,
  extensionUri: vscode.Uri,
  host: PanelHost
): GraphPanel {
  const title = host.mode === 'file' ? copy('panelTitleFile') : copy('panelTitleProject')
  const panel = vs.window.createWebviewPanel(
    'atlasmith.graph',
    title,
    vs.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: localResourceRoots(vs, extensionUri)
    }
  )

  const nonce = randomNonce()
  const webview = panel.webview
  const scriptUri = webview.asWebviewUri(vs.Uri.joinPath(extensionUri, WEBVIEW_DIST_DIR, ...WEBVIEW_SCRIPT.split('/')))
  const styleUri = webview.asWebviewUri(vs.Uri.joinPath(extensionUri, WEBVIEW_DIST_DIR, ...WEBVIEW_STYLE.split('/')))
  webview.html = webviewHtml({
    nonce,
    cspSource: webview.cspSource,
    scriptSrc: scriptUri.toString(),
    styleSrc: styleUri.toString(),
    title
  })

  const send = (state: ViewerState) => {
    const message: HostToWebviewMessage = { type: 'state', state }
    void webview.postMessage(message)
  }

  const disposable = webview.onDidReceiveMessage((message: unknown) => {
    void handleHostMessage(vs, message, {
      ...host,
      onReady: () => {
        host.onReady?.()
        send(host.getState())
      }
    })
  })

  panel.onDidDispose(() => disposable.dispose())

  return {
    panel,
    mode: host.mode,
    reveal() {
      panel.reveal(vs.ViewColumn.Beside)
      panel.title = host.mode === 'file' ? copy('panelTitleFile') : copy('panelTitleProject')
    },
    postState(state) {
      send(state)
    },
    dispose() {
      panel.dispose()
    }
  }
}

/** Documented for tests: the only extra files the webview may load sit under dist-webview. */
export function webviewBundlePath(extensionPath: string): string {
  return join(extensionPath, WEBVIEW_DIST_DIR)
}
