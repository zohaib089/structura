import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
const builtHtml = resolve(root, 'dist-viewer/index.html')

test.beforeAll(() => {
  execFileSync('npx', ['vite', 'build', '--config', 'vite.viewer.config.ts'], {
    cwd: root,
    stdio: 'inherit',
    timeout: 180_000
  })
})

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
  const cluster = page.locator('.overview-node[data-node-id="dir:apps"]')
  await cluster.click()
  await expect(page.locator('[data-testid="node-detail"]')).toContainText('apps')
  await cluster.press('Enter')
  await expect(cluster).toHaveAttribute('data-expanded', 'true')
  expect(errors).toEqual([])
})

test('renders hostile labels as text under the built CSP', async ({ page }) => {
  await page.goto(pathToFileURL(builtHtml).href)
  await page.locator('[data-testid="file-input"]').setInputFiles(resolve(root, 'fixtures/hostile-graph.json'))
  await expect(page.locator('[data-testid="graph-canvas"]')).toHaveAttribute('data-ready', 'true')
  const hostile = page.locator('.overview-node[data-node-id="file:src/app.ts"]')
  await hostile.click()
  await hostile.press('Enter')
  const payload = await page.locator('text=<script>window.__xss=1</script>').first().textContent()
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
