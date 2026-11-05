import { createReadStream } from 'node:fs'
import { open } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { createInflateRaw } from 'node:zlib'

const LOCAL_FILE_HEADER = 0x04034b50
const CENTRAL_DIR_HEADER = 0x02014b50
const END_OF_CENTRAL_DIR = 0x06054b50

export interface ZipEntryInfo {
  path: string
  directory: boolean
  compressionMethod: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

export async function openZip(archivePath: string): Promise<{
  entries: Array<ZipEntryInfo & { stream: () => Readable }>
  close: () => Promise<void>
}> {
  const handle = await open(archivePath, 'r')
  const stat = await handle.stat()
  const tail = Buffer.alloc(Math.min(stat.size, 65557))
  await handle.read(tail, 0, tail.length, stat.size - tail.length)

  let centralDirectoryOffset = -1
  for (let index = tail.length - 22; index >= 0; index -= 1) {
    if (tail.readUInt32LE(index) === END_OF_CENTRAL_DIR) {
      centralDirectoryOffset = tail.readUInt32LE(index + 16)
      break
    }
  }
  if (centralDirectoryOffset < 0) {
    await handle.close()
    throw new Error('Zip archive is missing a central directory.')
  }

  const entries: Array<ZipEntryInfo & { stream: () => Readable }> = []
  let offset = centralDirectoryOffset
  while (offset + 46 <= stat.size) {
    const header = Buffer.alloc(46)
    await handle.read(header, 0, 46, offset)
    const signature = header.readUInt32LE(0)
    if (signature !== CENTRAL_DIR_HEADER) break

    const compressionMethod = header.readUInt16LE(10)
    const compressedSize = header.readUInt32LE(20)
    const uncompressedSize = header.readUInt32LE(24)
    const fileNameLength = header.readUInt16LE(28)
    const extraLength = header.readUInt16LE(30)
    const commentLength = header.readUInt16LE(32)
    const localHeaderOffset = header.readUInt32LE(42)
    const nameBuffer = Buffer.alloc(fileNameLength)
    await handle.read(nameBuffer, 0, fileNameLength, offset + 46)
    const rawPath = nameBuffer.toString('utf8')
    const directory = rawPath.endsWith('/')
    const path = directory ? rawPath.slice(0, -1) : rawPath

    entries.push({
      path,
      directory,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      stream: () => entryStream(handle, archivePath, localHeaderOffset, compressionMethod, compressedSize)
    })

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return { entries, close: () => handle.close() }
}

function entryStream(
  handle: Awaited<ReturnType<typeof open>>,
  archivePath: string,
  localHeaderOffset: number,
  compressionMethod: number,
  compressedSize: number
): Readable {
  return Readable.from(async function* () {
    const localHeader = Buffer.alloc(30)
    await handle.read(localHeader, 0, 30, localHeaderOffset)
    if (localHeader.readUInt32LE(0) !== LOCAL_FILE_HEADER) {
      throw new Error('Zip entry header is invalid.')
    }
    const fileNameLength = localHeader.readUInt16LE(26)
    const extraLength = localHeader.readUInt16LE(28)
    const dataOffset = localHeaderOffset + 30 + fileNameLength + extraLength
    const source = createReadStream(archivePath, { start: dataOffset, end: dataOffset + compressedSize - 1 })

    if (compressionMethod === 0) {
      for await (const chunk of source) yield chunk
      return
    }
    if (compressionMethod === 8) {
      const inflater = createInflateRaw()
      source.pipe(inflater)
      for await (const chunk of inflater) yield chunk
      return
    }

    throw new Error('Unsupported zip compression method.')
  }())
}
