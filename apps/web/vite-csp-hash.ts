import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

function sha256(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('base64')
}

/**
 * Runs after vite-plugin-singlefile inlines the bundle, then pins CSP hashes to those bytes.
 * Both plugins use generateBundle; `order: 'post'` keeps this one behind the inliner.
 */
export function cspHashPlugin(): Plugin {
  return {
    name: 'viewer-csp-hash',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        for (const item of Object.values(bundle)) {
          if (item.type !== 'asset' || !item.fileName.endsWith('.html')) continue
          const html = typeof item.source === 'string' ? item.source : new TextDecoder().decode(item.source)
          const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1] ?? '')
          const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1] ?? '')
          const scriptSrc = scripts.length > 0 ? scripts.map((body) => `'sha256-${sha256(body)}'`).join(' ') : "'none'"
          const styleSrc = styles.length > 0 ? styles.map((body) => `'sha256-${sha256(body)}'`).join(' ') : "'none'"
          const policy = [
            "default-src 'none'",
            `script-src ${scriptSrc}`,
            'worker-src blob:',
            `style-src ${styleSrc}`,
            "style-src-attr 'unsafe-inline'",
            "script-src-attr 'none'",
            'img-src data:',
            'font-src data:',
            "connect-src 'none'",
            "object-src 'none'",
            "base-uri 'none'",
            "form-action 'none'"
          ].join('; ')
          const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`
          item.source = html.replace(/<head([^>]*)>/i, `<head$1>${meta}`)
        }
      }
    }
  }
}
