import type { ExportView } from './model.js'
import { xmlEscape } from './text.js'

const MODULE_WIDTH = 160
const MODULE_HEIGHT = 48
const FILE_HEIGHT = 28
const H_GAP = 48
const V_GAP = 24
const PADDING = 32

interface Box {
  x: number
  y: number
  w: number
  h: number
  label: string
  kind: 'module' | 'file' | 'external'
  key: string
}

export function graphToSvg(view: ExportView): string {
  const boxes: Box[] = []
  let y = PADDING

  for (const mod of view.modules) {
    const fileCount = mod.files.length
    const innerHeight = fileCount > 0 ? fileCount * FILE_HEIGHT + 8 : 0
    const h = MODULE_HEIGHT + innerHeight
    boxes.push({ x: PADDING, y, w: MODULE_WIDTH, h, label: mod.name, kind: 'module', key: `mod:${mod.name}` })
    let fy = y + MODULE_HEIGHT
    for (const file of mod.files) {
      boxes.push({
        x: PADDING + 12,
        y: fy,
        w: MODULE_WIDTH - 24,
        h: FILE_HEIGHT - 4,
        label: file,
        kind: 'file',
        key: `file:${file}`
      })
      fy += FILE_HEIGHT
    }
    y += h + V_GAP
  }

  const externalTargets = [...new Set(view.fileEdges
    .map(edge => edge.to)
    .filter(to => to.includes(':') && !to.includes('/')))]
    .sort()

  const externalX = PADDING + MODULE_WIDTH + H_GAP
  let ey = PADDING
  for (const target of externalTargets) {
    boxes.push({
      x: externalX,
      y: ey,
      w: MODULE_WIDTH,
      h: MODULE_HEIGHT,
      label: target,
      kind: 'external',
      key: `ext:${target}`
    })
    ey += MODULE_HEIGHT + V_GAP
  }

  const boxByKey = new Map(boxes.map(box => [box.key, box]))
  let maxX = 0
  let maxY = 0
  for (const box of boxes) {
    maxX = Math.max(maxX, box.x + box.w)
    maxY = Math.max(maxY, box.y + box.h)
  }

  const width = maxX + PADDING
  const height = maxY + PADDING

  const parts: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<style>text{font-family:ui-monospace,monospace;font-size:12px;fill:#111}.module{fill:#eef2ff;stroke:#4338ca}.file{fill:#f8fafc;stroke:#64748b}.external{fill:#fef3c7;stroke:#d97706}</style>'
  ]

  for (const finding of view.findings) {
    parts.push(`<!-- ${xmlEscape(`${finding.file}:${finding.line} ${finding.from}->${finding.to} ${finding.rule}`)} -->`)
  }

  for (const box of boxes) {
    const cls = box.kind
    parts.push(`<rect class="${cls}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="4"/>`)
    parts.push(`<text x="${box.x + 8}" y="${box.y + 18}">${xmlEscape(box.label)}</text>`)
  }

  function center(key: string): { cx: number; cy: number } | undefined {
    const box = boxByKey.get(key)
    if (!box) return undefined
    return { cx: box.x + box.w, cy: box.y + box.h / 2 }
  }

  function centerLeft(key: string): { cx: number; cy: number } | undefined {
    const box = boxByKey.get(key)
    if (!box) return undefined
    return { cx: box.x, cy: box.y + box.h / 2 }
  }

  for (const edge of view.fileEdges) {
    const from = center(`file:${edge.from}`)
    const external = edge.to.includes(':') && !edge.to.includes('/')
    const to = external ? centerLeft(`ext:${edge.to}`) : centerLeft(`file:${edge.to}`)
    if (!from || !to) continue
    const dash = edge.provenance === 'INFERRED' ? ' stroke-dasharray="6 4"' : ''
    parts.push(`<line x1="${from.cx}" y1="${from.cy}" x2="${to.cx}" y2="${to.cy}" stroke="#334155"${dash}/>`)
  }

  for (const edge of view.moduleEdges) {
    const from = center(`mod:${edge.from}`)
    const to = centerLeft(`mod:${edge.to}`)
    if (!from || !to) continue
    parts.push(`<line x1="${from.cx}" y1="${from.cy}" x2="${to.cx}" y2="${to.cy}" stroke="#4338ca" stroke-width="2"/>`)
  }

  parts.push('</svg>', '')
  return parts.join('\n')
}
