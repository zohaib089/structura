/** Parses JSON with comments and trailing commas (tsconfig.json flavour). Throws on invalid input. */
export function parseJsonc(text: string): unknown {
  let out = ''
  let index = 0
  const length = text.length
  let inString = false

  while (index < length) {
    const char = text[index] as string
    if (inString) {
      out += char
      if (char === '\\') {
        out += text[index + 1] ?? ''
        index += 2
        continue
      }
      if (char === '"') inString = false
      index += 1
      continue
    }
    if (char === '"') {
      inString = true
      out += char
      index += 1
    } else if (char === '/' && text[index + 1] === '/') {
      while (index < length && text[index] !== '\n') index += 1
    } else if (char === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2)
      index = end === -1 ? length : end + 2
      out += ' '
    } else {
      out += char
      index += 1
    }
  }

  // Remove trailing commas outside strings.
  let cleaned = ''
  inString = false
  for (let i = 0; i < out.length; i += 1) {
    const char = out[i] as string
    if (inString) {
      cleaned += char
      if (char === '\\') {
        cleaned += out[i + 1] ?? ''
        i += 1
      } else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      cleaned += char
    } else if (char === ',') {
      let j = i + 1
      while (j < out.length && /\s/.test(out[j] as string)) j += 1
      if (out[j] === '}' || out[j] === ']') continue
      cleaned += char
    } else cleaned += char
  }

  return JSON.parse(cleaned.replace(/^\uFEFF/, ''))
}
