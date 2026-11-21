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
  private refreshTimer: ReturnType<typeof setTimeout> | undefined
  /** Delay after a save before the open graph refreshes (several quick saves → one scan). */
  static readonly SAVE_REFRESH_MS = 800

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

  /**
   * Scan again and redraw the open graph in place: same mode and focus file, the graph stays on
   * screen while the scan runs (the toolbar button spins), no consent prompt (already granted).
   */
  async refresh(): Promise<void> {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    this.refreshTimer = undefined
    if (!this.panel || !this.ref) return
    this.cache = undefined
    await this.runScanAndRender({ quiet: this.state.kind === 'graph' })
  }

  /** After a save: refresh the open graph once things settle. Nothing happens without a shown graph. */
  scheduleRefresh(delayMs = GraphSession.SAVE_REFRESH_MS): void {
    if (!this.panel || this.state.kind !== 'graph') return
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined
      void this.refresh()
    }, delayMs)
  }

  dispose(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    this.inflight?.abort()
    this.panel?.dispose()
    this.panel = undefined
  }

  /** A workspace file changed: the next show / command rescans instead of reusing the cached graph. */
  invalidate(): void {
    this.cache = undefined
  }

  /** Light and high-contrast light themes draw the light graph; everything else the dark one. */
  currentTheme(): 'light' | 'dark' {
    const kinds = this.deps.vscode.ColorThemeKind
    const kind = this.deps.vscode.window.activeColorTheme?.kind
    return kind !== undefined && (kind === kinds?.Light || kind === kinds?.HighContrastLight) ? 'light' : 'dark'
  }

  /** VS Code changed colour theme: recolour the open graph in place (no rescan, view kept). */
  syncTheme(): void {
    const theme = this.currentTheme()
    if (this.state.kind === 'graph') {
      if (this.state.theme === theme) return
      this.state = { ...this.state, theme }
    }
    this.panel?.postTheme(theme)
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
      onRescan: () => {
        void session.refresh()
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

  private async runScanAndRender(options: { quiet?: boolean } = {}): Promise<void> {
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
    // Quiet refresh: keep the graph on screen and spin the Scan again button instead.
    if (options.quiet) this.panel?.postBusy(true)
    else this.setState({ kind: 'loading', message: copy('loadingTitle') })

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
      if (options.quiet) void this.deps.vscode.window.showWarningMessage?.(`${copy('refreshFailed')} ${message}`)
      else this.setState({ kind: 'error', message })
    } finally {
      if (options.quiet && this.inflight === abort) this.panel?.postBusy(false)
    }
  }

  private renderGraph(cache: CachedScan): void {
    // Project mode leaves focusPath null so ViewerApp uses the same default
    // entry as the web dashboard (collectEntryPoints()[0]).
    const focusPath = this.mode === 'file' ? this.ref?.activeRelativePath ?? null : null
    if (this.mode === 'file' && focusPath) {
      const lookup = this.deps.scanner.fileInGraph(cache.graph, focusPath)
      if (!lookup.found) {
        this.setState({ kind: 'file-missing', path: focusPath })
        return
      }
    }

    const theme = this.currentTheme()

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

/** Source edits (saves, or changes on disk outside node_modules / .git) drop the cached scan. */
export function registerInvalidation(session: GraphSession, vs: typeof vscode): vscode.Disposable[] {
  const skip = (path: string) => /[\\/](node_modules|\.git)[\\/]/.test(path)
  const drop = (uri: vscode.Uri) => {
    if (!skip(uri.fsPath)) session.invalidate()
  }
  const watcher = vs.workspace.createFileSystemWatcher('**/*')
  return [
    vs.workspace.onDidSaveTextDocument((doc) => {
      if (skip(doc.uri.fsPath)) return
      session.invalidate()
      // An open graph redraws itself after a save (debounced); other edits only drop the cache.
      session.scheduleRefresh()
    }),
    watcher,
    watcher.onDidChange(drop),
    watcher.onDidCreate(drop),
    watcher.onDidDelete(drop)
  ]
}

/** Keep an open graph in step with VS Code's light / dark colour theme. */
export function registerThemeSync(session: GraphSession, vs: typeof vscode): vscode.Disposable[] {
  return [vs.window.onDidChangeActiveColorTheme(() => session.syncTheme())]
}

export function registerCommands(session: GraphSession, vs: typeof vscode): vscode.Disposable[] {
  return [
    vs.commands.registerCommand(COMMANDS.showFileGraph, () => session.show('file')),
    vs.commands.registerCommand(COMMANDS.showProjectGraph, () => session.show('project'))
  ]
}
