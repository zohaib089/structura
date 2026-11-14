/**
 * Test-only stand-in for the `vscode` module. Not used by the extension at runtime.
 */
import { EventEmitter } from 'node:events'
import { join } from 'node:path'

export class Uri {
  readonly authority = ''
  readonly query = ''
  readonly fragment = ''

  constructor(
    readonly scheme: string,
    readonly path: string,
    readonly fsPath: string
  ) {}

  toString(): string {
    return `${this.scheme}:${this.path}`
  }

  toJSON(): { scheme: string; path: string } {
    return { scheme: this.scheme, path: this.path }
  }

  with(change: { scheme?: string; path?: string }): Uri {
    return new Uri(change.scheme ?? this.scheme, change.path ?? this.path, this.fsPath)
  }

  static file(fsPath: string): Uri {
    const path = fsPath.replace(/\\/g, '/')
    return new Uri('file', path, fsPath)
  }

  static joinPath(base: Uri, ...parts: string[]): Uri {
    return Uri.file(join(base.fsPath, ...parts))
  }
}

export class Disposable {
  constructor(private readonly finish?: () => void) {}
  dispose(): void {
    this.finish?.()
  }
}

export class EventBus<T> extends EventEmitter {
  event = (listener: (value: T) => unknown): Disposable => {
    this.on('data', listener)
    return new Disposable(() => this.off('data', listener))
  }
  fire(value: T): void {
    this.emit('data', value)
  }
}

export class TreeItem {
  id?: string
  tooltip?: string
  command?: { command: string; title: string }
  contextValue?: string
  iconPath?: ThemeIcon
  constructor(
    public label: string,
    public collapsibleState: number
  ) {}
}

export class ThemeIcon {
  constructor(public id: string) {}
}

export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 } as const
export const ViewColumn = { Active: -1, Beside: -2, One: 1 } as const
export const ColorThemeKind = { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 } as const

export class WebviewPanelMock {
  readonly onDidDisposeBus = new EventBus<void>()
  visible = true
  active = true
  disposed = false
  html = ''
  title: string
  readonly webview: {
    cspSource: string
    html: string
    postMessage: (message: unknown) => Thenable<boolean>
    onDidReceiveMessage: (listener: (message: unknown) => unknown) => Disposable
    asWebviewUri: (uri: Uri) => Uri
    _incoming: EventBus<unknown>
    _posted: unknown[]
  }

  constructor(public viewType: string, title: string, _column: number, options: { localResourceRoots?: Uri[] }) {
    this.title = title
    const incoming = new EventBus<unknown>()
    const posted: unknown[] = []
    const panel = this
    this.webview = {
      cspSource: 'https://file+.vscode-cdn.net',
      get html() {
        return panel.html
      },
      set html(value: string) {
        panel.html = value
      },
      postMessage: async (message: unknown) => {
        posted.push(message)
        return true
      },
      onDidReceiveMessage: (listener) => incoming.event(listener),
      asWebviewUri: (uri: Uri) =>
        new Uri('https', `file+.vscode-cdn.net${uri.path}`, uri.fsPath),
      _incoming: incoming,
      _posted: posted
    }
    void options
  }

  get onDidDispose() {
    return this.onDidDisposeBus.event
  }

  reveal(_column?: number): void {
    this.visible = true
    this.active = true
  }

  dispose(): void {
    this.disposed = true
    this.onDidDisposeBus.fire()
  }
}

export interface WorkspaceFolderMock {
  uri: Uri
  name: string
  index: number
}

export interface TestVscodeOptions {
  folders?: WorkspaceFolderMock[]
  activeFile?: string | null
  consentChoice?: string | undefined
  colorThemeKind?: number
}

export function createVsCodeMock(options: TestVscodeOptions = {}) {
  const commands = new Map<string, (...args: unknown[]) => unknown>()
  const executed: Array<{ command: string; args: unknown[] }> = []
  const messages: Array<{ message: string; items: string[] }> = []
  const panels: WebviewPanelMock[] = []
  const treeProviders = new Map<string, unknown>()
  const documents: Array<{ uri: Uri; preview?: boolean }> = []
  let folders = options.folders ?? []
  let activeFile = options.activeFile ?? null
  let consentChoice: string | undefined = options.consentChoice

  const workspaceStateData = new Map<string, unknown>()

  const vscode = {
    Uri,
    Disposable,
    TreeItem,
    ThemeIcon,
    TreeItemCollapsibleState,
    ViewColumn,
    ColorThemeKind,
    window: {
      activeColorTheme: { kind: options.colorThemeKind ?? ColorThemeKind.Dark },
      get activeTextEditor() {
        if (!activeFile) return undefined
        return { document: { uri: Uri.file(activeFile) } }
      },
      showInformationMessage: async (message: string, ...rest: unknown[]) => {
        const items = rest.filter((item): item is string => typeof item === 'string')
        messages.push({ message, items })
        return consentChoice
      },
      createWebviewPanel: (
        viewType: string,
        title: string,
        column: number,
        panelOptions: { localResourceRoots?: Uri[] }
      ) => {
        const panel = new WebviewPanelMock(viewType, title, column, panelOptions)
        panels.push(panel)
        return panel
      },
      registerTreeDataProvider: (id: string, provider: unknown) => {
        treeProviders.set(id, provider)
        return new Disposable(() => treeProviders.delete(id))
      },
      showTextDocument: async (uri: Uri, opts?: { preview?: boolean }) => {
        documents.push({ uri, preview: opts?.preview })
        return {}
      }
    },
    workspace: {
      get workspaceFolders() {
        return folders.length ? folders : undefined
      },
      getWorkspaceFolder: (uri: Uri) =>
        folders.find((folder) => uri.fsPath === folder.uri.fsPath || uri.fsPath.startsWith(`${folder.uri.fsPath}/`)),
      asRelativePath: (uri: Uri | string, _includeWorkspaceFolder?: boolean) => {
        const fsPath = typeof uri === 'string' ? uri : uri.fsPath
        const folder = folders.find((item) => fsPath === item.uri.fsPath || fsPath.startsWith(`${item.uri.fsPath}/`))
        if (!folder) return fsPath
        return fsPath.slice(folder.uri.fsPath.length).replace(/^[\\/]/, '')
      }
    },
    commands: {
      registerCommand: (id: string, callback: (...args: unknown[]) => unknown) => {
        commands.set(id, callback)
        return new Disposable(() => commands.delete(id))
      },
      executeCommand: async (id: string, ...args: unknown[]) => {
        executed.push({ command: id, args })
        return commands.get(id)?.(...args)
      }
    },
    _setFolders(next: WorkspaceFolderMock[]) {
      folders = next
    },
    _setActiveFile(path: string | null) {
      activeFile = path
    },
    _setConsentChoice(choice: string | undefined) {
      consentChoice = choice
    },
    _commands: commands,
    _executed: executed,
    _messages: messages,
    _panels: panels,
    _treeProviders: treeProviders,
    _documents: documents,
    _workspaceStateData: workspaceStateData
  }

  return vscode
}

export type VsCodeMock = ReturnType<typeof createVsCodeMock>

export function createExtensionContext(vs: VsCodeMock, extensionPath = '/tmp/atlasmith-extension'): {
  subscriptions: { dispose(): void }[]
  workspaceState: {
    get<T>(key: string, defaultValue?: T): T
    update(key: string, value: unknown): Thenable<void>
  }
  extensionUri: Uri
  extensionPath: string
  storageUri: Uri
  globalStorageUri: Uri
} {
  const store = vs._workspaceStateData
  return {
    subscriptions: [],
    workspaceState: {
      get<T>(key: string, defaultValue?: T): T {
        return (store.has(key) ? store.get(key) : defaultValue) as T
      },
      update: async (key: string, value: unknown) => {
        if (value === undefined) store.delete(key)
        else store.set(key, value)
      }
    },
    extensionUri: Uri.file(extensionPath),
    extensionPath,
    storageUri: Uri.file(join(extensionPath, 'storage')),
    globalStorageUri: Uri.file(join(extensionPath, 'global-storage'))
  }
}
