import assert from 'node:assert/strict'
import test from 'node:test'
import { COMMANDS } from './commands.js'
import { CONSENT_STATE_KEY, workspaceConsentStore } from './consent.js'
import { GraphSession, registerCommands, registerInvalidation, registerThemeSync } from './graph-session.js'
import { GRAPH_VIEW_ID, AtlasmithGraphViewProvider, registerGraphView } from './graph-view.js'
import { copy, messages } from './messages.js'
import type { ViewerState } from './protocol.js'
import { createExtensionContext, createVsCodeMock, Uri, type VsCodeMock } from './test-support/vscode-mock.js'
import type { Scanner } from './workspace-scan.js'
import type { Graph, ScanOutput } from '@atlasmith/engine'

const workspaceRoot = '/repo/demo'
const appFile = '/repo/demo/src/app.ts'
const missingFile = '/repo/demo/notes.txt'

function testGraph(): Graph {
  return {
    schemaVersion: 'graph.v1',
    summary: { nodes: 2, edges: 1, files: 1 },
    coverage: {
      files: { discovered: 1, parsed: 1, partial: 0, failed: 0, skipped: 0, ignored: 0 },
      byLanguage: [],
      skipped: [],
      failed: [],
      ignored: [],
      unresolved: [],
      accounting: { discovered: 1, accounted: 1 }
    },
    nodes: [
      { id: 'dir:.', kind: 'directory', path: '.', label: '.' },
      {
        id: 'file:src/app.ts',
        kind: 'file',
        path: 'src/app.ts',
        label: 'app.ts',
        language: 'typescript',
        lineCount: 10,
        parse: { status: 'parsed' }
      }
    ],
    edges: [{ source: 'dir:.', type: 'contains', target: 'file:src/app.ts', provenance: 'EXTRACTED' }]
  }
}

function testOutput(graph: Graph): ScanOutput {
  return {
    graph,
    graphJson: JSON.stringify(graph),
    graphPath: '/tmp/graph.json',
    run: {} as ScanOutput['run'],
    fileSummaries: { 'src/app.ts': 'Application entry (test-only fixture).' },
    strictFailures: [],
    summary: 'ok',
    elapsedMs: 1,
    root: workspaceRoot
  }
}

function fakeScanner(opts: { fail?: boolean; scans?: ScanOutput[] } = {}): Scanner & { calls: number } {
  const graph = testGraph()
  const scanner: Scanner & { calls: number } = {
    calls: 0,
    async scan() {
      scanner.calls += 1
      if (opts.fail) throw new Error('The folder could not be read.')
      const output = opts.scans?.[scanner.calls - 1] ?? testOutput(graph)
      return output
    },
    fileInGraph(g, relativePath) {
      const found = g.nodes.some((node) => node.kind === 'file' && 'path' in node && node.path === relativePath)
      return { found, path: relativePath }
    },
    toGraphPayload(g) {
      return {
        schemaVersion: g.schemaVersion,
        summary: { nodes: g.summary.nodes, edges: g.summary.edges, files: g.summary.files },
        coverage: g.coverage,
        nodes: g.nodes,
        edges: g.edges
      }
    }
  }
  return scanner
}

function folder() {
  return { uri: Uri.file(workspaceRoot), name: 'demo', index: 0 }
}

function setup(options: {
  activeFile?: string | null
  folders?: boolean
  consentChoice?: string
  pregranted?: boolean
  scanner?: Scanner
}) {
  const vs = createVsCodeMock({
    folders: options.folders === false ? [] : [folder()],
    activeFile: options.activeFile === undefined ? appFile : options.activeFile,
    consentChoice: options.consentChoice
  })
  const context = createExtensionContext(vs as VsCodeMock)
  if (options.pregranted) {
    void context.workspaceState.update(CONSENT_STATE_KEY, { [Uri.file(workspaceRoot).toString()]: 'granted' })
  }
  const scanner = options.scanner ?? fakeScanner()
  const session = new GraphSession({
    vscode: vs as unknown as typeof import('vscode'),
    context: context as unknown as import('vscode').ExtensionContext,
    consent: workspaceConsentStore(context as unknown as import('vscode').ExtensionContext),
    scanner
  })
  const disposables = [
    registerGraphView(vs as unknown as typeof import('vscode')),
    ...registerCommands(session, vs as unknown as typeof import('vscode'))
  ]
  context.subscriptions.push(session, ...disposables)
  return { vs, context, session, scanner }
}

function latestState(vs: VsCodeMock): ViewerState | undefined {
  const panel = vs._panels.at(-1)
  const posted = panel?.webview._posted as Array<{ type?: string; state?: ViewerState }> | undefined
  return posted?.filter((item) => item.type === 'state').at(-1)?.state
}

test('activate registers both graph commands and the activity bar view', () => {
  const { vs } = setup({ pregranted: true, consentChoice: messages.scanAction })
  assert.equal(vs._commands.has(COMMANDS.showFileGraph), true)
  assert.equal(vs._commands.has(COMMANDS.showProjectGraph), true)
  assert.equal(vs._treeProviders.has(GRAPH_VIEW_ID), true)
  const provider = vs._treeProviders.get(GRAPH_VIEW_ID) as AtlasmithGraphViewProvider
  const items = provider.getChildren()
  assert.deepEqual(
    items.map((item) => item.command),
    [COMMANDS.showFileGraph, COMMANDS.showProjectGraph]
  )
  assert.equal(items[0]?.label, copy('showFileGraphItem'))
  assert.equal(items[1]?.label, copy('showProjectGraphItem'))
})

test('file mode focuses the active file after a granted scan', async () => {
  const scanner = fakeScanner()
  const { vs } = setup({ pregranted: true, scanner })
  await vs.commands.executeCommand(COMMANDS.showFileGraph)
  const state = latestState(vs)
  assert.equal(state?.kind, 'graph')
  if (state?.kind !== 'graph') return
  assert.equal(state.mode, 'file')
  assert.equal(state.focusPath, 'src/app.ts')
  assert.equal(scanner.calls, 1)
  assert.equal(vs._messages.length, 0)
  assert.match(vs._panels[0]?.title ?? '', /this file/)
})

test('project mode leaves focusPath empty so the viewer uses the dashboard entry', async () => {
  const { vs } = setup({ pregranted: true })
  await vs.commands.executeCommand(COMMANDS.showProjectGraph)
  const state = latestState(vs)
  assert.equal(state?.kind, 'graph')
  if (state?.kind !== 'graph') return
  assert.equal(state.mode, 'project')
  assert.equal(state.focusPath, null)
  assert.match(vs._panels[0]?.title ?? '', /whole project/)
})

test('no folder open shows the empty-folder state and does not scan', async () => {
  const scanner = fakeScanner()
  const { vs } = setup({ folders: false, pregranted: true, scanner })
  await vs.commands.executeCommand(COMMANDS.showProjectGraph)
  assert.equal(latestState(vs)?.kind, 'empty-folder')
  assert.equal(scanner.calls, 0)
  assert.equal(vs._messages.length, 0)
})

test('file mode with no active file shows the empty-file state', async () => {
  const scanner = fakeScanner()
  const { vs } = setup({ activeFile: null, pregranted: true, scanner })
  await vs.commands.executeCommand(COMMANDS.showFileGraph)
  assert.equal(latestState(vs)?.kind, 'empty-file')
  assert.equal(scanner.calls, 0)
})

test('first scan prompts for consent; Scan proceeds and is remembered', async () => {
  const scanner = fakeScanner()
  const { vs, context } = setup({ scanner, consentChoice: messages.scanAction })
  await vs.commands.executeCommand(COMMANDS.showProjectGraph)
  assert.equal(vs._messages.length, 1)
  assert.equal(vs._messages[0]?.message, copy('scanConsent'))
  assert.deepEqual(vs._messages[0]?.items, [messages.scanAction, messages.notNowAction])
  assert.equal(latestState(vs)?.kind, 'graph')
  assert.equal(scanner.calls, 1)
  const stored = context.workspaceState.get<Record<string, string>>(CONSENT_STATE_KEY, {})
  assert.equal(stored[Uri.file(workspaceRoot).toString()], 'granted')

  vs._messages.length = 0
  await vs.commands.executeCommand(COMMANDS.showFileGraph)
  assert.equal(vs._messages.length, 0)
  assert.equal(scanner.calls, 1)
})

test('Not now records a decline and shows the declined state without scanning', async () => {
  const scanner = fakeScanner()
  const { vs } = setup({ scanner, consentChoice: messages.notNowAction })
  await vs.commands.executeCommand(COMMANDS.showFileGraph)
  assert.equal(latestState(vs)?.kind, 'declined')
  assert.equal(scanner.calls, 0)
})

test('a file that is not in the graph gets a file-missing state', async () => {
  const { vs } = setup({ pregranted: true, activeFile: missingFile })
  await vs.commands.executeCommand(COMMANDS.showFileGraph)
  const state = latestState(vs)
  assert.equal(state?.kind, 'file-missing')
  if (state?.kind !== 'file-missing') return
  assert.equal(state.path, 'notes.txt')
})

test('a failed scan surfaces the error and a later retry can recover', async () => {
  let fail = true
  const scanner = fakeScanner()
  scanner.scan = async () => {
    scanner.calls += 1
    if (fail) throw new Error('The folder could not be read.')
    return testOutput(testGraph())
  }
  const { vs, session } = setup({ pregranted: true, scanner })
  await vs.commands.executeCommand(COMMANDS.showProjectGraph)
  const error = latestState(vs)
  assert.equal(error?.kind, 'error')
  if (error?.kind !== 'error') return
  assert.equal(error.message, 'The folder could not be read.')
  fail = false
  await session.scanFromWebview()
  assert.equal(latestState(vs)?.kind, 'graph')
})

test('a workspace edit invalidates the cached scan so the next command rescans', async () => {
  const scanner = fakeScanner()
  const { vs, session } = setup({ pregranted: true, scanner })
  await vs.commands.executeCommand(COMMANDS.showFileGraph)
  await vs.commands.executeCommand(COMMANDS.showFileGraph)
  assert.equal(scanner.calls, 1)
  session.invalidate()
  await vs.commands.executeCommand(COMMANDS.showFileGraph)
  assert.equal(scanner.calls, 2)
})

function postedOf(vs: VsCodeMock) {
  return vs._panels.at(-1)?.webview._posted as Array<{ type?: string; state?: ViewerState; busy?: boolean }>
}

test('Scan again refreshes the open graph in place: no loading screen, busy on then off, same focus file', async () => {
  const scanner = fakeScanner()
  const { vs } = setup({ pregranted: true, scanner })
  await vs.commands.executeCommand(COMMANDS.showFileGraph)
  assert.equal(scanner.calls, 1)
  // The webview has focus now, so there is no active editor; the focus file must not be lost.
  vs._setActiveFile(null)
  const posted = postedOf(vs)
  const before = posted.length
  vs._panels.at(-1)!.webview._incoming.fire({ type: 'rescan' })
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(scanner.calls, 2)
  const after = posted.slice(before)
  assert.deepEqual(after.map((m) => m.type), ['busy', 'state', 'busy'])
  assert.equal(after[0]?.busy, true)
  assert.equal(after.at(-1)?.busy, false)
  assert.equal(after.some((m) => m.state?.kind === 'loading'), false)
  const state = latestState(vs)
  assert.equal(state?.kind === 'graph' && state.focusPath, 'src/app.ts')
})

test('a failed refresh keeps the last graph on screen and says so', async () => {
  let fail = false
  const base = fakeScanner()
  const scanner: Scanner & { calls: number } = { ...base, calls: 0, async scan(o) { if (fail) throw new Error('disk busy'); return base.scan(o) } }
  const { vs, session } = setup({ pregranted: true, scanner })
  await vs.commands.executeCommand(COMMANDS.showProjectGraph)
  fail = true
  await session.refresh()
  assert.equal(latestState(vs)?.kind, 'graph')
  assert.equal(vs._warnings.length, 1)
  assert.match(vs._warnings[0]!, /could not be updated/)
})

test('saving a file refreshes an open graph once (debounced); no graph open means no scan', async () => {
  const scanner = fakeScanner()
  const { vs, session } = setup({ pregranted: true, scanner })
  const subs = registerInvalidation(session, vs as unknown as typeof import('vscode'))
  try {
    vs._save('/repo/demo/src/app.ts')
    await new Promise((resolve) => setTimeout(resolve, 5))
    assert.equal(scanner.calls, 0)
    await vs.commands.executeCommand(COMMANDS.showFileGraph)
    assert.equal(scanner.calls, 1)
    const original = GraphSession.prototype.scheduleRefresh
    GraphSession.prototype.scheduleRefresh = function (this: GraphSession) { original.call(this, 5) }
    try {
      vs._save('/repo/demo/src/app.ts')
      vs._save('/repo/demo/src/app.ts')
      vs._save('/repo/demo/node_modules/x/index.js')
      await new Promise((resolve) => setTimeout(resolve, 40))
    } finally {
      GraphSession.prototype.scheduleRefresh = original
    }
    assert.equal(scanner.calls, 2)
    assert.equal(latestState(vs)?.kind, 'graph')
  } finally {
    for (const sub of subs) sub.dispose()
  }
})

test('a VS Code theme change recolours the open graph without a rescan or a new state', async () => {
  const scanner = fakeScanner()
  const { vs, session } = setup({ pregranted: true, scanner })
  const subs = registerThemeSync(session, vs as unknown as typeof import('vscode'))
  try {
    await vs.commands.executeCommand(COMMANDS.showFileGraph)
    const posted = postedOf(vs)
    const before = posted.length
    vs._setTheme(vs.ColorThemeKind.Light)
    assert.deepEqual(posted.slice(before), [{ type: 'theme', theme: 'light' }])
    vs._setTheme(vs.ColorThemeKind.HighContrastLight)
    assert.equal(posted.length, before + 1, 'same light theme: nothing to send')
    vs._setTheme(vs.ColorThemeKind.HighContrast)
    assert.deepEqual(posted.at(-1), { type: 'theme', theme: 'dark' })
    assert.equal(scanner.calls, 1)
    // A webview that reloads (ready) gets the current theme in its state.
    const state = session.getState()
    assert.equal(state.kind === 'graph' && state.theme, 'dark')
  } finally {
    for (const sub of subs) sub.dispose()
  }
})
