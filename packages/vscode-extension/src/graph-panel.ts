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
  /** Scan again while a graph is open (toolbar button). */
  onRescan?: () => void
  /** Show what a change to the open file would affect. */
  onShowImpact?: () => void
  onShowProjectGraph: () => void
  onOpenFolder: () => void
  /** Editor column the graph panel sits in, so opened files land beside it instead of replacing it. */
  panelColumn?: () => number | undefined
}

export interface GraphPanel {
  readonly panel: vscode.WebviewPanel
  readonly mode: GraphMode
  reveal(): void
  postState(state: ViewerState): void
  postBusy(busy: boolean): void
  postTheme(theme: 'light' | 'dark'): void
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
    case 'rescan':
      host.onRescan?.()
      return
    case 'showImpact':
      host.onShowImpact?.()
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
      // Open next to the graph (the column left of it, or a new one beside), never over the graph tab.
      const column = host.panelColumn?.()
      const viewColumn = column === undefined ? undefined : column > 1 ? column - 1 : vs.ViewColumn.Beside
      if (message.line) {
        // Symbol jump: open with the cursor at the symbol's start line (VS Code positions are 0-based).
        const position = new vs.Position(message.line - 1, 0)
        await vs.window.showTextDocument(uri, { preview: true, preserveFocus: false, selection: new vs.Range(position, position), viewColumn })
        return
      }
      await vs.window.showTextDocument(uri, { preview: true, preserveFocus: false, viewColumn })
    }
  }
}

/**
 * Where a new graph opens: an editor group that is already empty (reuse it, no extra split), else
 * beside the active editor. Fewer groups leave the graph wide enough for its desktop toolbar.
 */
export function graphColumn(vs: typeof vscode): vscode.ViewColumn {
  const groups = vs.window.tabGroups?.all ?? []
  const empty = groups.find((group) => group.tabs.length === 0 && group.viewColumn !== undefined)
  return empty ? empty.viewColumn : vs.ViewColumn.Beside
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
    { viewColumn: graphColumn(vs), preserveFocus: true },
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
      panelColumn: () => panel.viewColumn,
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
      // Stay in the graph's own column: moving it "beside" again can leave an empty group behind and
      // squeeze every column (a 1024px window ended up with a 220px graph).
      panel.reveal(panel.viewColumn ?? graphColumn(vs), true)
      panel.title = host.mode === 'file' ? copy('panelTitleFile') : copy('panelTitleProject')
    },
    postState(state) {
      send(state)
    },
    postTheme(theme) {
      const message: HostToWebviewMessage = { type: 'theme', theme }
      void webview.postMessage(message)
    },
    postBusy(busy) {
      const message: HostToWebviewMessage = { type: 'busy', busy }
      void webview.postMessage(message)
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
