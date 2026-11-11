import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWebviewCsp } from './csp.js'

const cspSource = 'https://file+.vscode-cdn.net'
const nonce = 'abcXYZ-_123'

test('CSP is strict: default none, nonce scripts, local styles and images, no remote origins', () => {
  const csp = buildWebviewCsp({ nonce, cspSource })
  assert.match(csp, /default-src 'none'/)
  assert.match(csp, new RegExp(`script-src 'nonce-${nonce}'`))
  assert.match(csp, new RegExp(`style-src ${cspSource.replaceAll('+', '\\+')}`))
  assert.match(csp, new RegExp(`img-src ${cspSource.replaceAll('+', '\\+')} data:`))
  assert.match(csp, new RegExp(`font-src ${cspSource.replaceAll('+', '\\+')}`))
  assert.doesNotMatch(csp, /unsafe-inline/)
  assert.doesNotMatch(csp, /unsafe-eval/)
  assert.doesNotMatch(csp, /connect-src/)
  assert.doesNotMatch(csp, /jsdelivr|unpkg|googleapis|cdnjs/)
  assert.ok(!csp.includes('*'))
  const script = csp.split('; ').find((part) => part.startsWith('script-src'))
  assert.equal(script, `script-src 'nonce-${nonce}'`)
  for (const directive of csp.split('; ')) {
    if (directive.startsWith('script-src')) continue
    assert.ok(
      directive.startsWith('default-src') || directive.includes(cspSource) || directive.includes('data:'),
      `unexpected directive: ${directive}`
    )
  }
})

test('script-src allows only the given nonce, not a second host', () => {
  const csp = buildWebviewCsp({ nonce, cspSource })
  const script = csp.split('; ').find((part) => part.startsWith('script-src'))
  assert.equal(script, `script-src 'nonce-${nonce}'`)
})

test('rejects an empty or unsafe nonce', () => {
  assert.throws(() => buildWebviewCsp({ nonce: '', cspSource }))
  assert.throws(() => buildWebviewCsp({ nonce: 'has space', cspSource }))
  assert.throws(() => buildWebviewCsp({ nonce: 'a;b', cspSource }))
  assert.throws(() => buildWebviewCsp({ nonce, cspSource: '' }))
})
