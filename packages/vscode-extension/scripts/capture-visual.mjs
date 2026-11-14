/**
 * Render the built webview bundle in Playwright Chromium with a stubbed
 * acquireVsCodeApi, feeding a real @atlasmith/engine scan of this repo.
 * Screenshots are written to /workspace/e1-visual/.
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { chromium } from '../../../apps/web/node_modules/playwright/index.mjs'

const outDir = process.env.E1_SHOT_DIR ?? '/workspace/e1-visual/round5'
const theme = process.env.E1_THEME === 'light' ? 'light' : 'dark'
mkdirSync(outDir, { recursive: true })
const webviewDir = resolve(import.meta.dirname, '../dist-webview')
const graphPath = resolve('/workspace/e1-visual', 'graph.json')
if (!existsSync(resolve(webviewDir, 'assets/webview.js'))) {
  throw new Error('Build the webview first: npm run build:webview')
}
if (!existsSync(graphPath)) {
  throw new Error('Run scripts/scan-repo.mjs first to produce a real graph.json')
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
}

const capturePage = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/assets/webview.css" />
    <title>Atlasmith graph capture</title>
    <style>html,body,#app{margin:0;width:100%;height:100%;background:${theme === 'light' ? '#ffffff' : '#07111f'};}</style>
  </head>
  <body class="vscode-${theme}">
    <div id="app"></div>
    <script>
      window.__posted = []
      window.acquireVsCodeApi = function acquireVsCodeApi() {
        return {
          postMessage: function (message) { window.__posted.push(message) },
          getState: function () { return window.__state },
          setState: function (state) { window.__state = state; return state }
        }
      }
    </script>
    <script src="/assets/webview.js"></script>
  </body>
</html>`

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': TYPES['.html'] })
    res.end(capturePage)
    return
  }
  if (url.pathname === '/graph.json') {
    res.writeHead(200, { 'content-type': TYPES['.json'] })
    createReadStream(graphPath).pipe(res)
    return
  }
  const file = resolve(webviewDir, `.${url.pathname}`)
  if (!file.startsWith(webviewDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
})

await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise))
const { port } = server.address()
const origin = `http://127.0.0.1:${port}`
console.log(`Capture server at ${origin}`)

const graph = JSON.parse(await new Response(createReadStream(graphPath)).text().catch(async () => {
  const { readFile } = await import('node:fs/promises')
  return readFile(graphPath, 'utf8')
}))


function firstEntryPath(graph) {
  const entries = graph.nodes.filter((node) => node.kind === 'file' && node.entryCandidate && node.path)
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return entries[0]?.path ?? null
}

const filePath = 'apps/web/src/viewer/ViewerApp.vue'
const dashboardEntry = firstEntryPath(graph)
console.log('Dashboard / project default entry:', dashboardEntry)
const browser = await chromium.launch({ headless: true })

async function render(name, viewport, state, after) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: theme
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#app')
  await page.evaluate((next) => window.postMessage({ type: 'state', state: next }, '*'), state)
  if (state.kind === 'graph') {
    await page.waitForSelector('.vue-flow, .viewer-embedded', { timeout: 20000 })
    await page.waitForTimeout(1500)
    const fit = page.getByRole('button', { name: /fit to view/i })
    if (await fit.count()) {
      await fit.click()
      // Blur so the Fit tip does not stay open and clip the frame.
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    }
    await page.waitForTimeout(1500)
    if (after) {
      await after(page)
      await page.waitForTimeout(1800)
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    }
    // E1_HOVER=<label>: hover that node so the path highlight shows in the shot.
    if (process.env.E1_HOVER) {
      const target = page.locator('.vue-flow__node', { has: page.locator('.label', { hasText: process.env.E1_HOVER }) }).first()
      if (await target.count()) {
        await target.locator('.kind-mark').first().hover({ force: true })
        await page.waitForTimeout(600)
      }
    }
    const measure = await page.evaluate(() => {
      const disc = document.querySelector('.is-nucleus .kind-mark--disc, .is-nucleus.kind-mark--disc, .overview-node.is-nucleus .kind-mark')
      const path = document.querySelector('.vue-flow__edge-path, .edge-role-spoke path, path.vue-flow__edge-path')
      if (!disc) return { error: 'no nucleus disc' }
      const d = disc.getBoundingClientRect()
      const cx = d.left + d.width / 2
      const cy = d.top + d.height / 2
      let start = null
      if (path) {
        const m = (path.getAttribute('d') || '').match(/^M\s*([\d.-]+)[,\s]+([\d.-]+)/)
        if (m) start = { x: Number(m[1]), y: Number(m[2]) }
      }
      const switcher = document.querySelector('[data-testid="graph-entry-switcher"]')
      const selected = switcher instanceof HTMLSelectElement ? (switcher.selectedOptions[0]?.textContent ?? '') : null
      const labels = [...document.querySelectorAll('.overview-node')].map((el) => (el.hasAttribute('data-label-hidden') ? '[hidden] ' : '') + (el.hasAttribute('data-label-mini') ? '[mini] ' : el.hasAttribute('data-label-tight') ? '[tight] ' : '') + (el.querySelector('.label')?.textContent?.trim() ?? '') + (el.hasAttribute('data-label-mini') ? ` w=${Math.round(el.querySelector(':scope > .aside')?.getBoundingClientRect().width ?? 0)}` : ''))
      const overlaps = []
      const nodesEl = [...document.querySelectorAll('.overview-node')]
      const shown = nodesEl.filter((n) => !n.hasAttribute('data-label-hidden')).map((n) => ({
        name: n.querySelector('.label')?.textContent?.trim() ?? '',
        box: n.querySelector(':scope > .aside')?.getBoundingClientRect()
      })).filter((x) => x.box && x.box.width > 0)
      const discs = nodesEl.map((n) => ({ name: n.querySelector('.label')?.textContent?.trim() ?? '', box: (n.querySelector('.kind-mark--disc') ?? n).getBoundingClientRect() }))
      const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
      for (let i = 0; i < shown.length; i += 1) {
        for (let j = i + 1; j < shown.length; j += 1) if (hits(shown[i].box, shown[j].box)) overlaps.push(`${shown[i].name} x ${shown[j].name}`)
        for (const d of discs) if (d.name !== shown[i].name && hits(shown[i].box, d.box)) overlaps.push(`${shown[i].name} x disc ${d.name}`)
        for (const c of document.querySelectorAll('.half-caption')) if (hits(shown[i].box, c.getBoundingClientRect())) overlaps.push(`${shown[i].name} x caption ${c.textContent}`)
        const b = shown[i].box
        if (b.left < 0 || b.right > window.innerWidth || b.top < 74) overlaps.push(`${shown[i].name} clipped/under bar`)
      }
      const zoom = document.querySelector('.zoom')
      const z = zoom?.getBoundingClientRect()
      const bar = document.querySelector('.floating-bar')?.getBoundingClientRect()
      const barOverflow = bar ? [...document.querySelectorAll('.floating-bar > *')].filter((c) => getComputedStyle(c).display !== 'none' && getComputedStyle(c).position !== 'absolute').map((c) => ({ c: c.className || c.tagName, r: c.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && (r.right > bar.right - 1 || r.left < bar.left + 1 || r.bottom > bar.bottom - 1 || r.top < bar.top + 1)).map(({ c }) => c) : []
      const tips = document.querySelector('[data-testid="coach-mark"]')?.getBoundingClientRect()
      return {
        viewport: { w: window.innerWidth, h: window.innerHeight },
        barOverflow,
        disc: { x: Math.round(cx), y: Math.round(cy), w: Math.round(d.width), h: Math.round(d.height) },
        pathStart: start,
        switcher: selected,
        optionCount: switcher instanceof HTMLSelectElement ? switcher.options.length : 0,
        labels,
        overlaps,
        nodeCount: document.querySelectorAll('.overview-node').length,
        zoom: z ? { x: Math.round(z.left), y: Math.round(z.top), w: Math.round(z.width), h: Math.round(z.height), found: true } : { found: false },
        bar: bar ? { bottom: Math.round(bar.bottom) } : null,
        tips: tips ? { x: Math.round(tips.left), y: Math.round(tips.top), w: Math.round(tips.width) } : null,
        fitReserve: document.querySelector('.vue-flow')?.getAttribute('data-fit-reserve'),
        fitVp: document.querySelector('.vue-flow')?.getAttribute('data-fit-vp'),
        transform: document.querySelector('.vue-flow__viewport')?.getAttribute('style') ?? document.querySelector('.vue-flow__transformationpane')?.getAttribute('style') ?? null
      }
    })
    console.log(`${name} measure:`, JSON.stringify(measure))
  } else {
    await page.waitForSelector('.state-screen', { timeout: 10000 })
    await page.waitForTimeout(300)
  }
  const file = resolve(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false, animations: 'disabled' })
  const kind = await page.getAttribute('.extension-app', 'data-kind')
  console.log(`${name}: ${file} kind=${kind} errors=${errors.length ? errors.join(' | ') : 'none'}`)
  if (errors.length) console.error(errors)
  await page.close()
  return errors
}

const graphBase = {
  kind: 'graph',
  graph,
  theme,
  fileSummaries: {}
}

/** Open the largest folder group ("Show files") so its files appear on the next ring. */
async function expandFirstGroup(page) {
  const toggles = page.locator('[data-nbh-group="true"] .inside-toggle')
  const count = await toggles.count()
  let best = 0
  let bestSize = -1
  for (let i = 0; i < count; i += 1) {
    const size = Number(await toggles.nth(i).locator('xpath=ancestor::*[@data-nbh-group="true"][1]').getAttribute('data-cluster-size'))
    if (size > bestSize) { best = i; bestSize = size }
  }
  if (count > 0) await toggles.nth(best).click({ force: true })
  const fit = page.getByRole('button', { name: /fit to view/i })
  await page.waitForTimeout(800)
  if (await fit.count()) await fit.click()
  await page.waitForTimeout(Number(process.env.E1_SETTLE ?? 0))
}

const only = process.env.E1_ONLY ? new Set(process.env.E1_ONLY.split(',')) : null

const shots = [
  ['project-desktop', { width: 1280, height: 800 }, { ...graphBase, mode: 'project', focusPath: null }],
  ['project-narrow', { width: 380, height: 800 }, { ...graphBase, mode: 'project', focusPath: null }],
  ['file-desktop', { width: 1280, height: 800 }, { ...graphBase, mode: 'file', focusPath: filePath }],
  ['file-narrow', { width: 380, height: 800 }, { ...graphBase, mode: 'file', focusPath: filePath }],
  ['file-desktop-expanded', { width: 1280, height: 800 }, { ...graphBase, mode: 'file', focusPath: filePath }, expandFirstGroup],
  ['file-narrow-expanded', { width: 380, height: 800 }, { ...graphBase, mode: 'file', focusPath: filePath }, expandFirstGroup],
  ['state-empty-folder', { width: 1280, height: 800 }, { kind: 'empty-folder' }],
  ['state-loading', { width: 1280, height: 800 }, { kind: 'loading' }],
  ['state-error', { width: 1280, height: 800 }, { kind: 'error', message: 'The folder could not be read.' }],
  ['state-declined', { width: 380, height: 800 }, { kind: 'declined' }],
  ['state-file-missing', { width: 1280, height: 800 }, { kind: 'file-missing', path: 'secret.env' }]
]

const allErrors = []
for (const [name, viewport, state, after] of shots) {
  if (only && !only.has(name)) continue
  const errors = await render(name, viewport, state, after)
  allErrors.push(...errors)
}

await browser.close()
server.close()
if (allErrors.length) {
  console.error('Page errors during capture:', allErrors)
  process.exitCode = 1
}
