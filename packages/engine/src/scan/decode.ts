export interface DecodedSource {
  /** Source text with a leading BOM removed. A lone `\r` is not a line break. */
  text: string
  /** True when invalid UTF-8 was replaced with U+FFFD. */
  lossy: boolean
  /** Count of `\n` plus one, after the BOM strip. */
  lineCount: number
}

/**
 * Decodes file bytes the way the graph contract counts positions.
 * A leading UTF-8 BOM is removed and does not occupy a column. Invalid UTF-8 becomes U+FFFD.
 */
export function decodeSource(bytes: Uint8Array): DecodedSource {
  const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
  const body = hasBom ? bytes.subarray(3) : bytes
  let lossy = false
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(body)
  } catch {
    lossy = true
    text = new TextDecoder('utf-8', { fatal: false }).decode(body)
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  let newlines = 0
  for (let index = 0; index < text.length; index += 1) if (text.charCodeAt(index) === 10) newlines += 1
  return { text, lossy, lineCount: newlines + 1 }
}
