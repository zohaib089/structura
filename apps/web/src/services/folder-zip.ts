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

/** Drop the selected root folder segment from browser directory picks. */
export function stripRootFolderPrefix(relativePath: string, rootFolderName: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized === rootFolderName) return ''
  const prefix = `${rootFolderName}/`
  return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized
}

export function rootFolderNameFromBrowserFiles(files: Iterable<File>): string | null {
  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
    const slash = normalized.indexOf('/')
    if (slash > 0) return normalized.slice(0, slash)
  }
  return null
}

function zipEntriesToFile(archive: Zippable, filename: string): File {
  const zipped = zipSync(archive, { level: 6 })
  return new File([zipped], filename, { type: 'application/zip' })
}

export async function zipBrowserFiles(files: Iterable<File>): Promise<File> {
  const archive: Zippable = {}
  let included = 0
  const rootName = rootFolderNameFromBrowserFiles(files) ?? 'project'

  for (const file of files) {
    const relativePath = stripRootFolderPrefix(file.webkitRelativePath || file.name, rootName)
    if (!relativePath || shouldSkipArchivePath(relativePath)) continue
    archive[relativePath] = new Uint8Array(await file.arrayBuffer())
    included += 1
  }

  if (included === 0) {
    throw new Error('No files were included. Build folders like node_modules and .git are skipped.')
  }

  return zipEntriesToFile(archive, `${rootName}.zip`)
}

export async function zipDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  rootLabel = 'project'
): Promise<File> {
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

  await walk(handle, '')
  if (included === 0) {
    throw new Error('No files were included. Build folders like node_modules and .git are skipped.')
  }
  return zipEntriesToFile(archive, `${rootLabel}.zip`)
}
