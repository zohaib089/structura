import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Built once for graph-viewer.spec.ts (file:// CSP tests); avoids parallel worker races. */
export default function globalSetup() {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
  execFileSync('npx', ['vite', 'build', '--config', 'vite.viewer.config.ts'], {
    cwd: root,
    stdio: 'inherit',
    timeout: 180_000
  })
}
