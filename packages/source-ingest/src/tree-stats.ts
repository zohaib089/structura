import { readdir, lstat } from 'node:fs/promises'
import { join } from 'node:path'

export interface TreeEntryStat {
  path: string
  isFile: boolean
  isSymlink: boolean
  size: number
}

export async function* walk(rootDir: string): AsyncGenerator<TreeEntryStat> {
  async function* walkDir(current: string, prefix: string): AsyncGenerator<TreeEntryStat> {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      const fullPath = join(current, entry.name)
      const stats = await lstat(fullPath)
      if (stats.isSymbolicLink()) {
        yield { path: relative, isFile: false, isSymlink: true, size: 0 }
        continue
      }
      if (stats.isDirectory()) {
        yield* walkDir(fullPath, relative)
        continue
      }
      if (stats.isFile()) {
        yield { path: relative, isFile: true, isSymlink: false, size: stats.size }
      }
    }
  }

  yield* walkDir(rootDir, '')
}
