/** Truncate to at most `max` Unicode code points without splitting a surrogate pair. */
export function truncateCodePoints(text: string, max: number): string {
  if (max <= 0) return ''
  let count = 0
  let index = 0
  while (index < text.length && count < max) {
    const code = text.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) index += 2
    else index += 1
    count += 1
  }
  return text.slice(0, index)
}

/** Escape bidi controls, invisibles and C0/C1 controls for safe terminal output. */
export function escapeTerminal(text: string): string {
  let out = ''
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    const isBidi = (code >= 0x061c && code <= 0x061c)
      || (code >= 0x200e && code <= 0x200f)
      || (code >= 0x202a && code <= 0x202e)
      || (code >= 0x2066 && code <= 0x2069)
      || code === 0xfeff
    const isControl = code <= 0x1f || (code >= 0x7f && code <= 0x9f)
    if (isBidi || isControl) {
      out += `\\u{${code.toString(16)}}`
      continue
    }
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const pair = (code - 0xd800) * 0x400 + (text.charCodeAt(index + 1) - 0xdc00) + 0x10000
      out += text[index] + text[index + 1]
      index += 1
      continue
    }
    out += text[index]
  }
  return out
}
