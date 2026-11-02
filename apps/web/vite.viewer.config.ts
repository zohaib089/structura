import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { cspHashPlugin } from './vite-csp-hash.ts'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  base: './',
  plugins: [vue(), viteSingleFile({ outputFileName: 'index.html' }), cspHashPlugin()],
  build: {
    outDir: 'dist-viewer',
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./viewer/index.html', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    fs: { allow: [repoRoot] }
  }
})
