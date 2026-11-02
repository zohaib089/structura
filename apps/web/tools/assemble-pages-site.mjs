import { copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const siteRoot = resolve(webRoot, '../../site')

rmSync(siteRoot, { recursive: true, force: true })
mkdirSync(resolve(siteRoot, 'viewer'), { recursive: true })
cpSync(resolve(webRoot, 'dist'), siteRoot, { recursive: true })
copyFileSync(resolve(webRoot, 'dist-viewer/index.html'), resolve(siteRoot, 'viewer/index.html'))
writeFileSync(resolve(siteRoot, '.nojekyll'), '')
copyFileSync(resolve(siteRoot, 'index.html'), resolve(siteRoot, '404.html'))
