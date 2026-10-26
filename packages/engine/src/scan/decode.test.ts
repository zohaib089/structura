import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeSource } from './decode.js'

test('strips a leading BOM, replaces invalid UTF-8, and counts only LF', () => {
  const bom = decodeSource(Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from("import './a'\n")]))
  assert.equal(bom.text, "import './a'\n")
  assert.equal(bom.lossy, false)
  assert.equal(bom.lineCount, 2)

  const crlf = decodeSource(Buffer.from("a\r\nb\r\n"))
  assert.equal(crlf.lineCount, 3)
  const lone = decodeSource(Buffer.from('a\rb\n'))
  assert.equal(lone.lineCount, 2)
  assert.equal(lone.text.includes('\r'), true)

  const lossy = decodeSource(Buffer.from([0xff, 0xfe, 0x41]))
  assert.equal(lossy.lossy, true)
  assert.equal(lossy.text.includes('\ufffd'), true)
})
