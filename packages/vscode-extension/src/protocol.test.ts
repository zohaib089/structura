import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isGraphPayload,
  isHostToWebviewMessage,
  isViewerState,
  isWebviewToHostMessage,
  sanitizeWorkspaceRelativePath
} from './protocol.js'

test('accepts a ready / scan / openFolder / showProjectGraph message with only type', () => {
  for (const type of ['ready', 'scan', 'openFolder', 'showProjectGraph'] as const) {
    assert.equal(isWebviewToHostMessage({ type }), true)
  }
})

test('rejects webview messages with extra keys or a missing path', () => {
  assert.equal(isWebviewToHostMessage({ type: 'ready', extra: true }), false)
  assert.equal(isWebviewToHostMessage({ type: 'openFile' }), false)
  assert.equal(isWebviewToHostMessage({ type: 'openFile', path: '' }), false)
  assert.equal(isWebviewToHostMessage({ type: 'openFile', path: 'src/a.ts', other: 1 }), false)
  assert.equal(isWebviewToHostMessage({ type: 'unknown' }), false)
  assert.equal(isWebviewToHostMessage(null), false)
  assert.equal(isWebviewToHostMessage('ready'), false)
})

test('accepts a well-formed openFile message', () => {
  assert.equal(isWebviewToHostMessage({ type: 'openFile', path: 'apps/web/src/viewer/ViewerApp.vue' }), true)
})

test('validates host state messages and graph payloads', () => {
  assert.equal(isViewerState({ kind: 'empty-folder' }), true)
  assert.equal(isViewerState({ kind: 'loading' }), true)
  assert.equal(isViewerState({ kind: 'error' }), false)
  assert.equal(isViewerState({ kind: 'error', message: 'Disk was full' }), true)
  assert.equal(isViewerState({ kind: 'file-missing', path: 'README.md' }), true)
  const graph = {
    schemaVersion: 'graph.v1',
    summary: { nodes: 1, edges: 0, files: 1 },
    coverage: {},
    nodes: [],
    edges: []
  }
  assert.equal(isGraphPayload(graph), true)
  assert.equal(
    isHostToWebviewMessage({
      type: 'state',
      state: { kind: 'graph', mode: 'file', graph, focusPath: 'src/a.ts', theme: 'dark' }
    }),
    true
  )
  assert.equal(
    isHostToWebviewMessage({
      type: 'state',
      state: { kind: 'graph', mode: 'workspace', graph, focusPath: null, theme: 'dark' }
    }),
    false
  )
})

test('sanitizeWorkspaceRelativePath rejects escapes and absolute paths', () => {
  assert.equal(sanitizeWorkspaceRelativePath('src/file.ts'), 'src/file.ts')
  assert.equal(sanitizeWorkspaceRelativePath('./src/file.ts'), 'src/file.ts')
  assert.equal(sanitizeWorkspaceRelativePath(['src', 'file.ts'].join(String.fromCharCode(92))), 'src/file.ts')
  assert.equal(sanitizeWorkspaceRelativePath('../secret'), null)
  assert.equal(sanitizeWorkspaceRelativePath('src/../../etc/passwd'), null)
  assert.equal(sanitizeWorkspaceRelativePath('/etc/passwd'), null)
  assert.equal(sanitizeWorkspaceRelativePath('C:/Windows/system.ini'), null)
  assert.equal(sanitizeWorkspaceRelativePath(''), null)
  assert.equal(sanitizeWorkspaceRelativePath('src//file.ts'), null)
})
