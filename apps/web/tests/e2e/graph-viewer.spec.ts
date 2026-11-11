import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expect, test } from '@playwright/test'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
const builtHtml = resolve(root, 'dist-viewer/index.html')

test('loads a fixture from file://, selects, and expands', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(pathToFileURL(builtHtml).href)
  await page.locator('[data-testid="file-input"]').setInputFiles(resolve(root, 'fixtures/sample-graph.json'))
  const canvas = page.locator('[data-testid="graph-canvas"]')
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 20_000 })
  await expect(canvas).toHaveAttribute('data-total-nodes', '11')
  const domNodes = await page.locator('.vue-flow__node').count()
  const domEdges = await page.locator('.vue-flow__edge').count()
  await expect(canvas).toHaveAttribute('data-visible-nodes', String(domNodes))
  await expect(canvas).toHaveAttribute('data-visible-edges', String(domEdges))
  expect(domNodes).toBeLessThanOrEqual(300)
  expect(domEdges).toBeLessThanOrEqual(1000)

  const nucleus = page.locator('.overview-node[data-node-id="file:apps/web/main.ts"]')
  await expect(nucleus).toBeVisible()
  await nucleus.click()
  await expect(nucleus).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-testid="node-detail"]')).toContainText('main.ts')

  const visibleBefore = Number(await canvas.getAttribute('data-visible-nodes'))
  await nucleus.press('Enter')
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-visible-nodes')))
    .toBeGreaterThanOrEqual(visibleBefore)
  await expect
    .poll(async () => {
      const count = await page.locator('.vue-flow__node').count()
      return Number(await canvas.getAttribute('data-visible-nodes')) === count
    })
    .toBe(true)

  const dependency = page.locator('.overview-node[data-node-id="file:packages/brand/brand.ts"]')
  await expect(dependency).toBeVisible()
  await dependency.click()
  await expect(dependency).toHaveAttribute('aria-selected', 'true')
  expect(errors).toEqual([])
})

test('renders hostile labels as text under the built CSP', async ({ page }) => {
  await page.goto(pathToFileURL(builtHtml).href)
  await page.locator('[data-testid="file-input"]').setInputFiles(resolve(root, 'fixtures/hostile-graph.json'))
  const canvas = page.locator('[data-testid="graph-canvas"]')
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 20_000 })
  const dismissGuide = page.getByTestId('coach-mark').getByRole('button', { name: /dismiss/i })
  if (await dismissGuide.isVisible().catch(() => false)) {
    await dismissGuide.click()
  }
  const hostile = page.locator('.overview-node[data-node-id="file:src/app.ts"]')
  await expect(hostile).toBeVisible()
  await hostile.click()
  await hostile.press('Enter')
  const payload = await page.getByText('<script>window.__xss=1</script>').first().textContent()
  expect(payload).toContain('window.__xss')
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
})

test('ships a CSP whose hashes match the inline scripts', () => {
  const html = readFileSync(builtHtml, 'utf8')
  expect(html).not.toContain('<script src=')
  expect(html).toContain("connect-src 'none'")
  expect(html).not.toContain('localStorage')
  const policy = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? ''
  const scriptHashes = [...policy.matchAll(/'sha256-([^']+)'/g)].map((match) => match[1])
  const bodies = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1] ?? '')
  expect(bodies.length).toBeGreaterThan(0)
  for (const body of bodies) {
    const digest = createHash('sha256').update(body, 'utf8').digest('base64')
    expect(scriptHashes).toContain(digest)
  }
})

test('dense test-only fixture: decluttered labels stay reachable, select shows detail, entry expands', async ({ page }) => {
  // tests/e2e/fixtures/dense-graph.test-only.json is an authored TEST-ONLY fixture (33 nodes), not product data.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(pathToFileURL(builtHtml).href)
  await page.locator('[data-testid="file-input"]').setInputFiles(resolve(root, 'tests/e2e/fixtures/dense-graph.test-only.json'))
  const canvas = page.locator('[data-testid="graph-canvas"]')
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 20_000 })
  await expect(canvas).toHaveAttribute('data-total-nodes', '33')
  const nodes = page.locator('.overview-node:not(.is-nucleus)')
  await expect.poll(() => nodes.count()).toBeGreaterThan(3)
  // Every visible node keeps its name accessible, decluttered or not.
  for (const label of await nodes.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))) expect(label.length).toBeGreaterThan(0)
  const hidden = page.locator('.overview-node[data-label-hidden]:not(.is-nucleus)')
  const id = (await ((await hidden.count()) > 0 ? hidden.first() : nodes.first()).getAttribute('data-node-id'))!
  const target = page.locator(`.overview-node[data-node-id="${id}"]`)
  const path = id.replace(/^(file|dir|ext):/, '')
  const name = path.split(/[/:]/).pop()!
  await target.click()
  await expect(target).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-testid="node-detail"]')).toContainText(name)
  await expect(target.locator(':scope > .aside')).toHaveCSS('opacity', '1')

  const nucleus = page.locator('.overview-node.is-nucleus')
  const before = Number(await canvas.getAttribute('data-visible-nodes'))
  await nucleus.focus()
  await nucleus.press('Enter')
  await expect.poll(async () => Number(await canvas.getAttribute('data-visible-nodes'))).toBeGreaterThanOrEqual(before)
})


test('phone dense: nucleus, ring-1 and findings labels stay visible without clip/overlap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(pathToFileURL(builtHtml).href)
  await page.locator('[data-testid="file-input"]').setInputFiles(resolve(root, 'tests/e2e/fixtures/dense-graph.test-only.json'))
  const canvas = page.locator('[data-testid="graph-canvas"]')
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 20_000 })
  await page.waitForTimeout(1000)

  const report = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="graph-canvas"]') as HTMLElement
    const bounds = stage.getBoundingClientRect()
    const pad = 4
    const all = [...document.querySelectorAll<HTMLElement>('.overview-node')].filter((n) =>
      n.querySelector(':scope > .aside')
    )
    const labelOf = (n: HTMLElement) =>
      n.querySelector<HTMLElement>(':scope > .aside .label') ?? n.querySelector<HTMLElement>(':scope > .aside')
    const discOf = (n: HTMLElement) =>
      n.querySelector<HTMLElement>('.kind-mark--disc') ?? n.querySelector<HTMLElement>('.kind-mark')
    const hit = (a: DOMRect, b: DOMRect) =>
      a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1

    const mustHidden = all
      .filter((n) => {
        if (n.classList.contains('is-nucleus')) return n.hasAttribute('data-label-hidden')
        if (Number(n.dataset.depth ?? NaN) === 1) return n.hasAttribute('data-label-hidden')
        if (n.dataset.hasFindings === 'true') return n.hasAttribute('data-label-hidden')
        return false
      })
      .map((n) => n.dataset.nodeId ?? '')

    const visible = all.filter((n) => !n.hasAttribute('data-label-hidden'))
    const clipped: string[] = []
    const overlaps: string[] = []
    const boxes = visible.map((n) => {
      const label = labelOf(n)!.getBoundingClientRect()
      const disc = discOf(n)!.getBoundingClientRect()
      const id = n.dataset.nodeId ?? ''
      if (
        label.left < bounds.left - pad ||
        label.right > bounds.right + pad ||
        label.top < bounds.top - pad ||
        label.bottom > bounds.bottom + pad
      ) {
        clipped.push(id)
      }
      return { id, label, disc }
    })
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        if (hit(boxes[i]!.label, boxes[j]!.label)) overlaps.push(`L×L ${boxes[i]!.id}×${boxes[j]!.id}`)
      }
      for (let j = 0; j < boxes.length; j += 1) {
        if (i === j) continue
        if (hit(boxes[i]!.label, boxes[j]!.disc)) overlaps.push(`L×D ${boxes[i]!.id}×${boxes[j]!.id}`)
      }
    }
    // Nucleus stack vs other discs
    const nucleus = all.find((n) => n.classList.contains('is-nucleus'))
    const nucleusAside = nucleus?.querySelector<HTMLElement>(':scope > .aside')?.getBoundingClientRect()
    if (nucleusAside) {
      for (const n of visible) {
        if (n.classList.contains('is-nucleus')) continue
        const disc = discOf(n)!.getBoundingClientRect()
        if (hit(nucleusAside, disc)) overlaps.push(`ENTRY×D ${n.dataset.nodeId}`)
      }
    }
    return {
      mustHidden,
      clipped,
      overlaps,
      visible: visible.length,
      ring1: all.filter((n) => Number(n.dataset.depth ?? NaN) === 1).length,
      unplacedFindings: stage.getAttribute('data-unplaced-findings')
    }
  })

  expect(report.mustHidden, `must-keep hidden: ${report.mustHidden.join(', ')}`).toEqual([])
  expect(report.clipped, `clipped: ${report.clipped.join(', ')}`).toEqual([])
  expect(report.overlaps, report.overlaps.join('\n')).toEqual([])
  expect(report.unplacedFindings, `unplaced findings: ${report.unplacedFindings}`).toBeNull()
  expect(report.visible).toBeGreaterThanOrEqual(report.ring1)
})

/** Screen centre of a node's mark, and the current Vue Flow zoom. */
async function markCentre(page: import('@playwright/test').Page, id: string) {
  return page.evaluate((nodeId) => {
    const mark = document.querySelector(`.overview-node[data-node-id="${nodeId}"] .kind-mark`)
    const r = mark?.getBoundingClientRect()
    const t = document.querySelector('.vue-flow__transformationpane')?.getAttribute('style') ?? ''
    const zoom = Number(/scale\(([\d.]+)\)/.exec(t)?.[1] ?? NaN)
    return r ? { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, zoom, transform: t } : null
  }, id)
}

test('zoom buttons keep the selected node in place', async ({ page }) => {
  await page.goto(pathToFileURL(builtHtml).href)
  await page.locator('[data-testid="file-input"]').setInputFiles(resolve(root, 'fixtures/sample-graph.json'))
  const canvas = page.locator('[data-testid="graph-canvas"]')
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 20_000 })
  const id = 'file:apps/web/main.ts'
  await page.locator(`.overview-node[data-node-id="${id}"]`).click()
  await page.waitForTimeout(600)
  const before = await markCentre(page, id)
  await page.getByTestId('zoom-in').click()
  await page.waitForTimeout(500)
  const zoomed = await markCentre(page, id)
  expect(zoomed!.zoom).toBeGreaterThan(before!.zoom * 1.1)
  expect(Math.abs(zoomed!.x - before!.x)).toBeLessThan(3)
  expect(Math.abs(zoomed!.y - before!.y)).toBeLessThan(3)
  await page.getByTestId('zoom-out').click()
  await page.waitForTimeout(500)
  const out = await markCentre(page, id)
  expect(out!.zoom).toBeLessThan(zoomed!.zoom)
  expect(Math.abs(out!.x - before!.x)).toBeLessThan(3)
})

test('Back in the detail drawer restores the previous graph view', async ({ page }) => {
  await page.goto(pathToFileURL(builtHtml).href)
  await page.locator('[data-testid="file-input"]').setInputFiles(resolve(root, 'fixtures/sample-graph.json'))
  const canvas = page.locator('[data-testid="graph-canvas"]')
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 20_000 })
  const back = page.getByTestId('detail-back')
  await expect(back).toHaveCount(0)

  const first = 'file:apps/web/main.ts'
  await page.locator(`.overview-node[data-node-id="${first}"]`).click()
  await expect(page.locator('[data-testid="node-detail"]')).toContainText('main.ts')
  await expect(back).toBeVisible()
  await expect(back).toHaveAccessibleName('Back to the previous graph view')
  await page.waitForTimeout(600)
  await page.getByTestId('zoom-in').click()
  await page.waitForTimeout(500)
  const saved = await markCentre(page, first)

  const second = 'file:packages/brand/brand.ts'
  await page.locator(`.overview-node[data-node-id="${second}"]`).click()
  await expect(page.locator(`.overview-node[data-node-id="${second}"]`)).toHaveAttribute('aria-selected', 'true')
  await page.waitForTimeout(600)

  await back.click()
  await expect(page.locator(`.overview-node[data-node-id="${first}"]`)).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-testid="node-detail"]')).toContainText('main.ts')
  await page.waitForTimeout(800)
  const restored = await markCentre(page, first)
  expect(Math.abs(restored!.zoom - saved!.zoom)).toBeLessThan(0.01)
  expect(Math.abs(restored!.x - saved!.x)).toBeLessThan(3)
  expect(Math.abs(restored!.y - saved!.y)).toBeLessThan(3)

  // Keyboard: Alt+ArrowLeft goes back once more, to the first view (nothing selected).
  await page.locator('body').press('Alt+ArrowLeft')
  await expect(back).toHaveCount(0)
})
