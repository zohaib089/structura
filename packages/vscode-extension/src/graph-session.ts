import { join } from 'node:path'
import type * as vscode from 'vscode'
import type { Graph, ScanOutput } from '@atlasmith/engine'
import { COMMANDS, type GraphCommandMode } from './commands.js'
import { ensureScanConsent, grantConsent, type ConsentStore } from './consent.js'
import { createGraphPanel, type GraphPanel } from './graph-panel.js'
import { copy } from './messages.js'
import type { GraphMode, ViewerState } from './protocol.js'
import { type Scanner } from './workspace-scan.js'
import { resolveWorkspaceRef, type WorkspaceRef } from './workspace-paths.js'

export interface SessionDeps {
  vscode: typeof vscode
  context: vscode.ExtensionContext
  consent: ConsentStore
  scanner: Scanner
}

interface CachedScan {
  root: string
  output: ScanOutput
  graph: Graph
}

export class GraphSession {
  private panel: GraphPanel | undefined
  private state: ViewerState = { kind: 'empty-folder' }
  private mode: GraphMode = 'project'
  private ref: WorkspaceRef | undefined
  private cache: CachedScan | undefined
  private inflight: AbortController | undefined

  constructor(private readonly deps: SessionDeps) {}

  async show(mode: GraphCommandMode): Promise<void> {
    this.mode = mode
    this.ref = resolveWorkspaceRef(this.deps.vscode)
    if (!this.ref) {
      this.setState({ kind: 'empty-folder' })
      this.ensurePanel()
      return
    }
    if (mode === 'file' && !this.ref.activeRelativePath) {
      this.setState({ kind: 'empty-file' })
      this.ensurePanel()
      return
    }

    const key = this.ref.folder.uri.toString()
    const decision = await ensureScanConsent(this.deps.consent, key, this.deps.vscode.window)
    if (decision !== 'granted') {
      this.setState({ kind: 'declined' })
      this.ensurePanel()
      return
    }

    this.ensurePanel()
    await this.runScanAndRender()
  }

  async scanFromWebview(): Promise<void> {
    this.ref = resolveWorkspaceRef(this.deps.vscode) ?? this.ref
    if (!this.ref) {
      this.setState({ kind: 'empty-folder' })
      this.ensurePanel()
      return
    }
    await grantConsent(this.deps.consent, this.ref.folder.uri.toString())
    this.ensurePanel()
    this.cache = undefined
    await this.runScanAndRender()
  }

  async showProjectFromWebview(): Promise<void> {
    this.mode = 'project'
    if (!this.ref && !resolveWorkspaceRef(this.deps.vscode)) {
      this.setState({ kind: 'empty-folder' })
      this.ensurePanel()
      return
    }
    await this.show('project')
  }

  openFolder(): void {
    void this.deps.vscode.commands.executeCommand('workbench.action.files.openFolder')
  }

  dispose(): void {
    this.inflight?.abort()
    this.panel?.dispose()
    this.panel = undefined
  }

  getState(): ViewerState {
    return this.state
  }

  private ensurePanel(): void {
    if (this.panel) {
      this.panel.reveal()
      this.panel.postState(this.state)
      return
    }
    const session = this
    this.panel = createGraphPanel(this.deps.vscode, this.deps.context.extensionUri, {
      get folder() {
        return session.ref?.folder
      },
      get mode() {
        return session.mode
      },
      getState: () => session.state,
      onScan: () => {
        void session.scanFromWebview()
      },
      onShowProjectGraph: () => {
        void session.showProjectFromWebview()
      },
      onOpenFolder: () => session.openFolder()
    })
    this.panel.panel.onDidDispose(() => {
      this.panel = undefined
    })
    this.panel.postState(this.state)
  }

  private setState(state: ViewerState): void {
    this.state = state
    this.panel?.postState(state)
  }

  private async runScanAndRender(): Promise<void> {
    const current = this.ref
    if (!current) {
      this.setState({ kind: 'empty-folder' })
      return
    }

    if (this.cache && this.cache.root === current.folder.uri.fsPath) {
      this.renderGraph(this.cache)
      return
    }

    this.inflight?.abort()
    const abort = new AbortController()
    this.inflight = abort
    this.setState({ kind: 'loading', message: copy('loadingTitle') })

    try {
      const storage = this.deps.context.storageUri ?? this.deps.context.globalStorageUri
      const outDir = storage ? join(storage.fsPath, 'scans') : undefined
      const output = await this.deps.scanner.scan({
        root: current.folder.uri.fsPath,
        outDir,
        signal: abort.signal
      })
      if (abort.signal.aborted) return
      this.cache = { root: current.folder.uri.fsPath, output, graph: output.graph }
      this.renderGraph(this.cache)
    } catch (cause) {
      if (abort.signal.aborted) return
      const message = cause instanceof Error && cause.message.trim() ? cause.message : copy('errorTitle')
      this.setState({ kind: 'error', message })
    }
  }

  private renderGraph(cache: CachedScan): void {
    const focusPath =
      this.mode === 'file'
        ? this.ref?.activeRelativePath ?? null
        : this.deps.scanner.chooseProjectFocus(cache.graph)
    if (this.mode === 'file' && focusPath) {
      const lookup = this.deps.scanner.fileInGraph(cache.graph, focusPath)
      if (!lookup.found) {
        this.setState({ kind: 'file-missing', path: focusPath })
        return
      }
    }

    const theme: 'light' | 'dark' =
      this.deps.vscode.window.activeColorTheme?.kind === this.deps.vscode.ColorThemeKind?.Light ? 'light' : 'dark'

    this.setState({
      kind: 'graph',
      mode: this.mode,
      graph: this.deps.scanner.toGraphPayload(cache.graph),
      focusPath,
      theme,
      fileSummaries: cache.output.fileSummaries
    })
  }
}

export function registerCommands(session: GraphSession, vs: typeof vscode): vscode.Disposable[] {
  return [
    vs.commands.registerCommand(COMMANDS.showFileGraph, () => session.show('file')),
    vs.commands.registerCommand(COMMANDS.showProjectGraph, () => session.show('project'))
  ]
}
