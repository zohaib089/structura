/**
 * Render the built webview bundle in Playwright Chromium with a stubbed
 * acquireVsCodeApi, feeding a real @atlasmith/engine scan of this repo.
 * Screenshots are written to /workspace/e1-visual/.
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { chromium } from '../../../apps/web/node_modules/playwright/index.mjs'

const outDir = '/workspace/e1-visual'
const webviewDir = resolve(import.meta.dirname, '../dist-webview')
const graphPath = resolve(outDir, 'graph.json')
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
    <style>html,body,#app{margin:0;width:100%;height:100%;background:#07111f;}</style>
  </head>
  <body class="vscode-dark">
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

async function render(name, viewport, state) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: 'dark'
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
      const labels = [...document.querySelectorAll('.overview-node .label')].map((el) => el.textContent?.trim()).filter(Boolean)
      return {
        viewport: { w: window.innerWidth, h: window.innerHeight },
        disc: { x: Math.round(cx), y: Math.round(cy), w: Math.round(d.width), h: Math.round(d.height) },
        pathStart: start,
        switcher: selected,
        optionCount: switcher instanceof HTMLSelectElement ? switcher.options.length : 0,
        labels,
        nodeCount: document.querySelectorAll('.overview-node').length
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
  theme: 'dark',
  fileSummaries: {}
}

const shots = [
  ['project-desktop', { width: 1280, height: 800 }, { ...graphBase, mode: 'project', focusPath: null }],
  ['project-narrow', { width: 380, height: 800 }, { ...graphBase, mode: 'project', focusPath: null }],
  ['file-desktop', { width: 1280, height: 800 }, { ...graphBase, mode: 'file', focusPath: filePath }],
  ['file-narrow', { width: 380, height: 800 }, { ...graphBase, mode: 'file', focusPath: filePath }],
  ['state-empty-folder', { width: 1280, height: 800 }, { kind: 'empty-folder' }],
  ['state-loading', { width: 1280, height: 800 }, { kind: 'loading' }],
  ['state-error', { width: 1280, height: 800 }, { kind: 'error', message: 'The folder could not be read.' }],
  ['state-declined', { width: 380, height: 800 }, { kind: 'declined' }],
  ['state-file-missing', { width: 1280, height: 800 }, { kind: 'file-missing', path: 'secret.env' }]
]

const allErrors = []
for (const [name, viewport, state] of shots) {
  const errors = await render(name, viewport, state)
  allErrors.push(...errors)
}

await browser.close()
server.close()
if (allErrors.length) {
  console.error('Page errors during capture:', allErrors)
  process.exitCode = 1
}
