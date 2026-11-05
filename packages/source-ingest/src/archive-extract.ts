import { createWriteStream } from 'node:fs'
import { open } from 'node:fs/promises'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { lstat, readdir } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import * as tar from 'tar'
import type { SourceIngestLimits } from './limits.js'
import { resolveInsideRoot } from './safe-path.js'
import { openZip } from './zip-reader.js'

export interface ArchiveExtractResult {
  rootDir: string
  fileCount: number
  totalBytes: number
}

export interface ArchiveExtractOptions {
  limits: SourceIngestLimits
}

export async function extractArchiveToDirectory(
  archivePath: string,
  destinationRoot: string,
  options: ArchiveExtractOptions
): Promise<ArchiveExtractResult> {
  const archiveStat = await stat(archivePath)
  if (!archiveStat.isFile()) throw new Error('Upload must be a regular file.')
  if (archiveStat.size > options.limits.maxRepoBytes) {
    throw new Error('Upload exceeds the configured size limit.')
  }

  const createdRoot = !(await pathExists(destinationRoot))
  await mkdir(destinationRoot, { recursive: true })
  try {
    return await extractInto(archivePath, destinationRoot, options)
  } catch (error) {
    await cleanupDestination(destinationRoot, createdRoot)
    throw error
  }
}

async function extractInto(
  archivePath: string,
  destinationRoot: string,
  options: ArchiveExtractOptions
): Promise<ArchiveExtractResult> {
  const ext = extname(archivePath).toLowerCase()
  const lowerName = basename(archivePath).toLowerCase()
  const zipByMagic = await looksLikeZipArchive(archivePath)

  if (ext === '.zip' || lowerName.endsWith('.zip') || zipByMagic) {
    await extractZipArchive(archivePath, destinationRoot, options)
  } else if (ext === '.tar' || ext === '.gz' || ext === '.tgz' || lowerName.endsWith('.tar.gz')) {
    await extractTarArchive(archivePath, destinationRoot, options)
  } else {
    throw new Error('Upload must be a .zip, .tar, .tar.gz, or .tgz archive.')
  }

  return measureTree(destinationRoot, options.limits)
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

/** Remove partial output after a failed extraction. */
async function cleanupDestination(destinationRoot: string, createdRoot: boolean): Promise<void> {
  if (createdRoot) {
    await rm(destinationRoot, { recursive: true, force: true })
    return
  }
  const entries = await readdir(destinationRoot).catch(() => [] as string[])
  await Promise.all(entries.map(name => rm(join(destinationRoot, name), { recursive: true, force: true })))
}

/**
 * Counts bytes actually produced by the decompressor against a shared budget and
 * aborts the stream once it is exceeded. Zip header sizes are attacker-controlled
 * and are never trusted for enforcement.
 */
function byteBudgetGuard(budget: { remaining: number }): Transform {
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      budget.remaining -= chunk.length
      if (budget.remaining < 0) {
        callback(new Error('Archive exceeds the configured uncompressed size limit.'))
        return
      }
      callback(null, chunk)
    }
  })
}

async function looksLikeZipArchive(archivePath: string): Promise<boolean> {
  const handle = await open(archivePath, 'r')
  try {
    const header = Buffer.alloc(4)
    await handle.read(header, 0, 4, 0)
    return header[0] === 0x50 && header[1] === 0x4b
  } finally {
    await handle.close()
  }
}

async function extractTarArchive(
  archivePath: string,
  destinationRoot: string,
  options: ArchiveExtractOptions
): Promise<void> {
  let fileCount = 0
  let totalBytes = 0

  await tar.extract({
    file: archivePath,
    cwd: destinationRoot,
    strict: true,
    preservePaths: false,
    filter: (entryPath, entry) => {
      const readEntry = entry as tar.ReadEntry
      if (readEntry.type !== 'File' && readEntry.type !== 'Directory') {
        throw new Error('Archive entries must be regular files or directories.')
      }
      resolveInsideRoot(destinationRoot, entryPath)
      if (readEntry.type === 'File') {
        fileCount += 1
        if (fileCount > options.limits.maxFileCount) {
          throw new Error('Archive exceeds the configured file count limit.')
        }
        totalBytes += readEntry.size ?? 0
        if (totalBytes > options.limits.maxUncompressedBytes) {
          throw new Error('Archive exceeds the configured uncompressed size limit.')
        }
      }
      return true
    }
  })
}

async function extractZipArchive(
  archivePath: string,
  destinationRoot: string,
  options: ArchiveExtractOptions
): Promise<void> {
  const zip = await openZip(archivePath)
  try {
    await extractZipEntries(zip, destinationRoot, options)
  } finally {
    await zip.close()
  }
}

async function extractZipEntries(
  zip: Awaited<ReturnType<typeof openZip>>,
  destinationRoot: string,
  options: ArchiveExtractOptions
): Promise<void> {
  const fileEntries = zip.entries.filter(entry => !entry.directory).length
  if (fileEntries > options.limits.maxFileCount || zip.entries.length > options.limits.maxFileCount * 2) {
    throw new Error('Archive exceeds the configured file count limit.')
  }
  const budget = { remaining: options.limits.maxUncompressedBytes }

  for (const entry of zip.entries) {
    const safePath = entry.path ? resolveInsideRoot(destinationRoot, entry.path) : destinationRoot
    if (entry.directory) {
      await mkdir(safePath, { recursive: true })
      continue
    }

    await mkdir(dirname(safePath), { recursive: true })
    await pipeline(entry.stream(), byteBudgetGuard(budget), createWriteStream(safePath))
  }
}

async function measureTree(rootDir: string, limits: SourceIngestLimits): Promise<ArchiveExtractResult> {
  let fileCount = 0
  let totalBytes = 0

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(current, entry.name)
      const stats = await lstat(fullPath)
      if (stats.isSymbolicLink()) throw new Error('Symbolic links are not allowed in uploaded archives.')
      if (stats.isDirectory()) {
        await walk(fullPath)
        continue
      }
      if (!stats.isFile()) throw new Error('Archive entries must be regular files or directories.')
      fileCount += 1
      totalBytes += stats.size
      if (fileCount > limits.maxFileCount) {
        throw new Error('Archive exceeds the configured file count limit.')
      }
      if (totalBytes > limits.maxUncompressedBytes) {
        throw new Error('Archive exceeds the configured uncompressed size limit.')
      }
    }
  }

  await walk(rootDir)
  return { rootDir, fileCount, totalBytes }
}

export async function writeUploadBuffer(
  destinationPath: string,
  stream: Readable,
  limits: SourceIngestLimits
): Promise<number> {
  let total = 0
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > limits.maxRepoBytes) {
      throw new Error('Upload exceeds the configured size limit.')
    }
    chunks.push(buffer)
  }
  await writeFile(destinationPath, Buffer.concat(chunks))
  return total
}
