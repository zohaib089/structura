import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { realpathSync } from 'node:fs'

/** Creates a temp dir populated from `{ 'rel/path': content }`; returns its real path. */
export function makeTree(files: Record<string, string | Buffer>): { root: string; cleanup: () => void } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'engine-test-')))
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, ...rel.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}
