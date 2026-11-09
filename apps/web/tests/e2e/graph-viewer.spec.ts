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


test('phone dense: visible labels stay inside the viewport without label overlaps', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(pathToFileURL(builtHtml).href)
  await page.locator('[data-testid="file-input"]').setInputFiles(resolve(root, 'tests/e2e/fixtures/dense-graph.test-only.json'))
  const canvas = page.locator('[data-testid="graph-canvas"]')
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 20_000 })
  await page.waitForTimeout(800)

  const report = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="graph-canvas"]') as HTMLElement
    const bounds = stage.getBoundingClientRect()
    const pad = 4
    const nodes = [...document.querySelectorAll<HTMLElement>('.overview-node')].filter(
      (n) => n.querySelector(':scope > .aside') && !n.hasAttribute('data-label-hidden')
    )
    const labelOf = (n: HTMLElement) =>
      n.querySelector<HTMLElement>(':scope > .aside .label') ?? n.querySelector<HTMLElement>(':scope > .aside')
    const discOf = (n: HTMLElement) =>
      n.querySelector<HTMLElement>('.kind-mark--disc') ?? n.querySelector<HTMLElement>('.kind-mark')

    const hit = (a: DOMRect, b: DOMRect) =>
      a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1

    const clipped: string[] = []
    const overlaps: string[] = []
    const boxes = nodes.map((n) => {
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
      return { id, label, disc, nucleus: n.classList.contains('is-nucleus') }
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
    return { clipped, overlaps, visible: boxes.length }
  })

  expect(report.visible, 'expected some visible labels').toBeGreaterThan(3)
  expect(report.clipped, `clipped: ${report.clipped.join(', ')}`).toEqual([])
  expect(report.overlaps, report.overlaps.join('\n')).toEqual([])
})
