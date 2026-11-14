import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const packageRoot = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  root: packageRoot,
  base: './',
  plugins: [vue()],
  resolve: {
    dedupe: ['vue']
  },
  server: {
    fs: { allow: [repoRoot] }
  },
  define: {
    'import.meta.env.VITE_VIEWER_BOOT_SAMPLE': JSON.stringify('false'),
    'import.meta.env.MODE': JSON.stringify('production'),
    'import.meta.env.PROD': 'true',
    'import.meta.env.DEV': 'false',
    'import.meta.env.SSR': 'false'
  },
  build: {
    outDir: 'dist-webview',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./webview/main.ts', import.meta.url)),
      output: {
        format: 'iife',
        name: 'AtlasmithWebview',
        inlineDynamicImports: true,
        entryFileNames: 'assets/webview.js',
        assetFileNames: 'assets/webview[extname]'
      }
    }
  }
})
