import assert from 'node:assert/strict'
import test from 'node:test'
import { handleHostMessage, localResourceRoots, webviewBundlePath, webviewHtml, WEBVIEW_DIST_DIR } from './graph-panel.js'
import { buildWebviewCsp } from './csp.js'
import { createVsCodeMock, Uri } from './test-support/vscode-mock.js'

test('webview HTML uses the strict CSP, a nonce script, and local stylesheet', () => {
  const nonce = 'NonceTestValue01'
  const cspSource = 'https://file+.vscode-cdn.net'
  const html = webviewHtml({
    nonce,
    cspSource,
    scriptSrc: 'https://file+.vscode-cdn.net/assets/webview.js',
    styleSrc: 'https://file+.vscode-cdn.net/assets/webview.css',
    title: 'Atlasmith graph · this file'
  })
  assert.equal(html.includes(`content="${buildWebviewCsp({ nonce, cspSource })}"`), true)
  assert.equal(html.includes(`<script nonce="${nonce}" src="https://file+.vscode-cdn.net/assets/webview.js">`), true)
  assert.equal(html.includes('type="module"'), false)
  assert.equal(html.includes('<link rel="stylesheet" href="https://file+.vscode-cdn.net/assets/webview.css"'), true)
  assert.equal(html.includes('http://'), false)
  assert.match(html, /<title>Atlasmith graph · this file<\/title>/)
})

test('localResourceRoots is limited to the webview bundle directory', () => {
  const vs = createVsCodeMock()
  const extensionUri = Uri.file('/ext')
  const roots = localResourceRoots(vs as unknown as typeof import('vscode'), extensionUri)
  assert.equal(roots.length, 1)
  assert.equal(roots[0]?.fsPath, Uri.joinPath(extensionUri, WEBVIEW_DIST_DIR).fsPath)
  assert.equal(webviewBundlePath('/ext').replace(/\\/g, '/'), '/ext/dist-webview')
})

test('handleHostMessage ignores invalid payloads', async () => {
  const vs = createVsCodeMock()
  const calls = { scan: 0, project: 0, folder: 0, ready: 0 }
  await handleHostMessage(vs as unknown as typeof import('vscode'), { type: 'scan', extra: 1 }, {
    folder: undefined,
    mode: 'project',
    getState: () => ({ kind: 'declined' }),
    onReady: () => {
      calls.ready += 1
    },
    onScan: () => {
      calls.scan += 1
    },
    onShowProjectGraph: () => {
      calls.project += 1
    },
    onOpenFolder: () => {
      calls.folder += 1
    }
  })
  assert.deepEqual(calls, { scan: 0, project: 0, folder: 0, ready: 0 })
})

test('handleHostMessage routes ready, scan, showProjectGraph, and openFolder', async () => {
  const vs = createVsCodeMock()
  const calls = { scan: 0, project: 0, folder: 0, ready: 0 }
  const host = {
    folder: undefined,
    mode: 'project' as const,
    getState: () => ({ kind: 'declined' as const }),
    onReady: () => {
      calls.ready += 1
    },
    onScan: () => {
      calls.scan += 1
    },
    onShowProjectGraph: () => {
      calls.project += 1
    },
    onOpenFolder: () => {
      calls.folder += 1
    }
  }
  await handleHostMessage(vs as unknown as typeof import('vscode'), { type: 'ready' }, host)
  await handleHostMessage(vs as unknown as typeof import('vscode'), { type: 'scan' }, host)
  await handleHostMessage(vs as unknown as typeof import('vscode'), { type: 'showProjectGraph' }, host)
  await handleHostMessage(vs as unknown as typeof import('vscode'), { type: 'openFolder' }, host)
  assert.deepEqual(calls, { scan: 1, project: 1, folder: 1, ready: 1 })
})

test('openFile opens a workspace-relative file in preview and rejects escapes', async () => {
  const folder = { uri: Uri.file('/repo/demo'), name: 'demo', index: 0 }
  const vs = createVsCodeMock({ folders: [folder] })
  const host = {
    folder,
    mode: 'file' as const,
    getState: () => ({ kind: 'graph' as const, mode: 'file' as const, graph: { schemaVersion: 'graph.v1', summary: { nodes: 0, edges: 0, files: 0 }, coverage: {}, nodes: [], edges: [] }, focusPath: 'src/app.ts', theme: 'dark' as const }),
    onScan: () => undefined,
    onShowProjectGraph: () => undefined,
    onOpenFolder: () => undefined
  }
  await handleHostMessage(vs as unknown as typeof import('vscode'), { type: 'openFile', path: 'src/app.ts' }, host)
  assert.equal(vs._documents.length, 1)
  assert.equal(vs._documents[0]?.uri.fsPath, '/repo/demo/src/app.ts')
  assert.equal(vs._documents[0]?.preview, true)

  await handleHostMessage(vs as unknown as typeof import('vscode'), { type: 'openFile', path: '../secret.ts' }, host)
  await handleHostMessage(vs as unknown as typeof import('vscode'), { type: 'openFile', path: '/etc/passwd' }, host)
  assert.equal(vs._documents.length, 1)
})
