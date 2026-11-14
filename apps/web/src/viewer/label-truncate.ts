/**
 * Middle truncation for narrow graph labels: keep a readable head and the end of the name (the
 * extension tells files apart), e.g. "ToastStack.vue" -> "Toas…k.vue". Never shorter than
 * minHead + "…" + minTail, so the result cannot degrade to "To…v".
 */
export function middleTruncate(text: string, max: number, minHead = 4, minTail = 4): string {
  const chars = [...text]
  if (chars.length <= max) return text
  const budget = Math.max(max, minHead + minTail + 1) - 1
  const dot = text.lastIndexOf('.')
  const ext = dot > 0 ? chars.length - [...text.slice(0, dot)].length : 0
  // Prefer the whole extension plus one character of the stem, within what the head leaves.
  const tail = Math.max(minTail, Math.min(ext + 1, budget - minHead))
  const head = budget - tail
  return `${chars.slice(0, head).join('')}…${chars.slice(chars.length - tail).join('')}`
}
