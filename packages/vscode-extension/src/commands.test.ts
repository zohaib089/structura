import assert from 'node:assert/strict'
import test from 'node:test'
import { COMMANDS } from './commands.js'
import { CONSENT_STATE_KEY, workspaceConsentStore } from './consent.js'
import { GraphSession, registerCommands } from './graph-session.js'
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
    },
    chooseProjectFocus(g) {
      const file = g.nodes.find((node) => node.kind === 'file' && 'path' in node)
      return file && 'path' in file ? file.path : null
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

test("project mode nucleates on the scanner project focus file", async () => {
  const { vs } = setup({ pregranted: true })
  await vs.commands.executeCommand(COMMANDS.showProjectGraph)
  const state = latestState(vs)
  assert.equal(state?.kind, 'graph')
  if (state?.kind !== 'graph') return
  assert.equal(state.mode, 'project')
  assert.equal(state.focusPath, 'src/app.ts')
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
