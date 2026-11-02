import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const base = process.env.VITE_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:4100',
        changeOrigin: true
      },
      '/health': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:4100',
        changeOrigin: true
      }
    }
  }
})
