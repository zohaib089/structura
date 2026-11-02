import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  server: {
    fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    clearMocks: true
  }
})
