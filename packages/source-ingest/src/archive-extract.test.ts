import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { deflateRawSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { extractArchiveToDirectory } from './archive-extract.js'
import { DEFAULT_SOURCE_INGEST_LIMITS } from './limits.js'
import { assertSafeRelativeEntryPath } from './safe-path.js'

test('rejects traversal and absolute archive paths', () => {
  assert.throws(() => assertSafeRelativeEntryPath('../secret.txt'), /traversal/)
  assert.throws(() => assertSafeRelativeEntryPath('/etc/passwd'), /not allowed/)
})

test('extracts a zip archive without zip-slip paths', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zip-safe-'))
  const destination = join(root, 'out')
  const archivePath = join(root, 'sample.zip')
  writeFileSync(archivePath, buildStoreZip([
    { path: 'src/app.ts', content: 'export const app = 1\n' }
  ]))

  const result = await extractArchiveToDirectory(archivePath, destination, {
    limits: { ...DEFAULT_SOURCE_INGEST_LIMITS, maxFileCount: 10 }
  })
  assert.equal(result.fileCount, 1)
  assert.equal(result.totalBytes, Buffer.byteLength('export const app = 1\n'))
})

test('extracts zip bytes even when the temp path lacks a .zip extension', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zip-magic-'))
  const destination = join(root, 'out')
  const archivePath = join(root, 'upload.archive')
  writeFileSync(archivePath, buildStoreZip([
    { path: 'src/app.ts', content: 'export const app = 1\n' }
  ]))

  const result = await extractArchiveToDirectory(archivePath, destination, {
    limits: { ...DEFAULT_SOURCE_INGEST_LIMITS, maxFileCount: 10 }
  })
  assert.equal(result.fileCount, 1)
})

test('rejects zip entries that escape the destination root', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zip-slip-'))
  const destination = join(root, 'out')
  const archivePath = join(root, 'evil.zip')
  writeFileSync(archivePath, buildStoreZip([
    { path: '../outside.txt', content: 'nope' }
  ]))

  await assert.rejects(
    extractArchiveToDirectory(archivePath, destination, { limits: DEFAULT_SOURCE_INGEST_LIMITS }),
    /traversal|outside|not allowed/i
  )
})

test('rejects a deflate bomb whose headers under-report the uncompressed size', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zip-bomb-'))
  const destination = join(root, 'out')
  const archivePath = join(root, 'bomb.zip')
  // 4 MiB of zeros compresses to a few KiB; headers lie and claim 10 bytes.
  writeFileSync(archivePath, buildZip([
    { path: 'ok.txt', content: 'fine\n' },
    { path: 'bomb.bin', content: Buffer.alloc(4 * 1024 * 1024), deflate: true, declaredSize: 10 }
  ]))

  await assert.rejects(
    extractArchiveToDirectory(archivePath, destination, {
      limits: { ...DEFAULT_SOURCE_INGEST_LIMITS, maxUncompressedBytes: 1024 * 1024 }
    }),
    /uncompressed size limit/
  )
  assert.equal(existsSync(destination), false, 'partial output is removed')
})

test('cleans partial output but keeps a pre-existing destination directory', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zip-bomb-existing-'))
  const archivePath = join(root, 'bomb.zip')
  const destination = mkdtempSync(join(tmpdir(), 'zip-bomb-dest-'))
  writeFileSync(archivePath, buildZip([
    { path: 'a/b.bin', content: Buffer.alloc(2 * 1024 * 1024), deflate: true, declaredSize: 1 }
  ]))

  await assert.rejects(
    extractArchiveToDirectory(archivePath, destination, {
      limits: { ...DEFAULT_SOURCE_INGEST_LIMITS, maxUncompressedBytes: 64 * 1024 }
    }),
    /uncompressed size limit/
  )
  assert.equal(existsSync(destination), true)
  assert.deepEqual(readdirSync(destination), [])
})

test('rejects archives with too many entries before extracting', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zip-count-'))
  const destination = join(root, 'out')
  const archivePath = join(root, 'many.zip')
  writeFileSync(archivePath, buildStoreZip(
    Array.from({ length: 6 }, (_, index) => ({ path: `f${index}.txt`, content: 'x' }))
  ))

  await assert.rejects(
    extractArchiveToDirectory(archivePath, destination, {
      limits: { ...DEFAULT_SOURCE_INGEST_LIMITS, maxFileCount: 5 }
    }),
    /file count limit/
  )
  assert.equal(existsSync(destination), false)
})

test('extracts a normal deflate archive within limits', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zip-deflate-'))
  const destination = join(root, 'out')
  const archivePath = join(root, 'ok.zip')
  const content = 'export const value = 42\n'.repeat(100)
  writeFileSync(archivePath, buildZip([
    { path: 'src/a.ts', content, deflate: true },
    { path: 'src/b.ts', content: 'b\n' }
  ]))

  const result = await extractArchiveToDirectory(archivePath, destination, {
    limits: { ...DEFAULT_SOURCE_INGEST_LIMITS, maxFileCount: 10, maxUncompressedBytes: 64 * 1024 }
  })
  assert.equal(result.fileCount, 2)
  assert.equal(result.totalBytes, Buffer.byteLength(content) + 2)
})

function buildStoreZip(entries: Array<{ path: string; content: string }>): Buffer {
  return buildZip(entries)
}

function buildZip(
  entries: Array<{ path: string; content: string | Buffer; deflate?: boolean; declaredSize?: number }>
): Buffer {
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.path, 'utf8')
    const raw = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8')
    const data = entry.deflate ? deflateRawSync(raw) : raw
    const method = entry.deflate ? 8 : 0
    const declared = entry.declaredSize ?? raw.length
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt32LE(0, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(declared, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    chunks.push(local, name, data)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(method, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0, 14)
    centralHeader.writeUInt32LE(0, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(declared, 24)
    centralHeader.writeUInt16LE(name.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    central.push(centralHeader, name)
    offset += local.length + name.length + data.length
  }

  const centralDirectory = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...chunks, centralDirectory, end])
}
