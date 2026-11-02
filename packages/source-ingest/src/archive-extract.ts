import { createWriteStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { lstat, readdir } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { Readable } from 'node:stream'
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

  await mkdir(destinationRoot, { recursive: true })
  const ext = extname(archivePath).toLowerCase()
  const lowerName = basename(archivePath).toLowerCase()

  if (ext === '.zip' || lowerName.endsWith('.zip')) {
    await extractZipArchive(archivePath, destinationRoot, options)
  } else if (ext === '.tar' || ext === '.gz' || ext === '.tgz' || lowerName.endsWith('.tar.gz')) {
    await extractTarArchive(archivePath, destinationRoot, options)
  } else {
    throw new Error('Upload must be a .zip, .tar, .tar.gz, or .tgz archive.')
  }

  return measureTree(destinationRoot, options.limits)
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
  let fileCount = 0
  let totalBytes = 0

  for (const entry of zip.entries) {
    const safePath = entry.path ? resolveInsideRoot(destinationRoot, entry.path) : destinationRoot
    if (entry.directory) {
      await mkdir(safePath, { recursive: true })
      continue
    }

    fileCount += 1
    if (fileCount > options.limits.maxFileCount) {
      throw new Error('Archive exceeds the configured file count limit.')
    }
    totalBytes += entry.uncompressedSize
    if (totalBytes > options.limits.maxUncompressedBytes) {
      throw new Error('Archive exceeds the configured uncompressed size limit.')
    }

    await mkdir(dirname(safePath), { recursive: true })
    await pipeline(entry.stream(), createWriteStream(safePath))
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
