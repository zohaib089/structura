import { zipSync, type Zippable } from 'fflate'

const SKIP_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  'coverage',
  '.turbo',
  '.cache',
  '.output',
  'target'
])

export function shouldSkipArchivePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.endsWith('/')) return true
  const parts = normalized.split('/')
  for (const part of parts) {
    if (part === '..' || part === '.') return true
    if (SKIP_DIR_NAMES.has(part)) return true
  }
  return false
}

export async function zipBrowserFiles(files: Iterable<File>): Promise<Blob> {
  const archive: Zippable = {}
  let included = 0

  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name
    if (shouldSkipArchivePath(relativePath)) continue
    archive[relativePath] = new Uint8Array(await file.arrayBuffer())
    included += 1
  }

  if (included === 0) {
    throw new Error('No files were included. Build folders like node_modules and .git are skipped.')
  }

  const zipped = zipSync(archive, { level: 6 })
  return new Blob([zipped], { type: 'application/zip' })
}

export async function zipDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  rootLabel = 'project'
): Promise<Blob> {
  const archive: Zippable = {}
  let included = 0

  async function walk(dir: FileSystemDirectoryHandle, prefix: string): Promise<void> {
    for await (const entry of dir.values()) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
      if (shouldSkipArchivePath(relativePath)) continue
      if (entry.kind === 'directory') {
        await walk(entry, relativePath)
        continue
      }
      const file = await entry.getFile()
      const buffer = new Uint8Array(await file.arrayBuffer())
      archive[relativePath] = buffer
      included += 1
    }
  }

  await walk(handle, rootLabel)
  if (included === 0) {
    throw new Error('No files were included. Build folders like node_modules and .git are skipped.')
  }
  const zipped = zipSync(archive, { level: 6 })
  return new Blob([zipped], { type: 'application/zip' })
}
