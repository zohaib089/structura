/**
 * Strict Content-Security-Policy for the graph webview.
 *
 * default-src is none. Scripts are only the nonce'd bundle from this
 * extension's local resource roots. Styles and images come from the
 * webview cspSource (or data: for images). No remote origins.
 */
export function buildWebviewCsp(options: { nonce: string; cspSource: string }): string {
  const nonce = options.nonce.trim()
  const cspSource = options.cspSource.trim()
  if (!nonce) throw new Error('CSP nonce must not be empty')
  if (!cspSource) throw new Error('CSP source must not be empty')
  if (/[;]/.test(nonce) || /\s/.test(nonce)) throw new Error('CSP nonce must be a single token')
  return [
    "default-src 'none'",
    `img-src ${cspSource} data:`,
    `style-src ${cspSource}`,
    `script-src 'nonce-${nonce}'`,
    `font-src ${cspSource}`
  ].join('; ')
}

export function randomNonce(bytes = 16): string {
  const array = new Uint8Array(bytes)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < array.length; i += 1) array[i] = Math.floor(Math.random() * 256)
  }
  return Buffer.from(array).toString('base64url')
}
